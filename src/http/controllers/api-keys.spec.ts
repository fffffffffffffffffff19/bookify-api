import { app } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { provisionAndAuthenticate } from '../../test/e2e/provision-user.js';

describe('Scoped partner API keys (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('creates hash-only keys, enforces scope, and supports revocation', async () => {
        const admin = await provisionAndAuthenticate(app, 'ADMIN');
        const provider = await provisionAndAuthenticate(app, 'PROVIDER');
        const service = await request(app.server)
            .post('/services')
            .set('Authorization', `Bearer ${provider.token}`)
            .send({ title: 'Scoped Availability', price: 20, durationInMinutes: 30 });
        const created = await request(app.server)
            .post('/admin/api-keys')
            .set('Authorization', `Bearer ${admin.token}`)
            .send({ name: 'Partner catalog integration', scopes: ['services:read'] });

        expect(created.status).toEqual(201);
        const { id, secret, scopes } = created.body.data.apiKey;
        expect(secret).toMatch(/^bk_[A-Za-z0-9_-]{43}$/);
        expect(scopes).toEqual(['services:read']);
        const persisted = await prisma.apiKey.findUniqueOrThrow({ where: { id } });
        expect(persisted.keyHash).not.toEqual(secret);
        expect(persisted.keyHash).toMatch(/^[a-f0-9]{64}$/);
        expect(persisted.expiresAt).not.toBeNull();
        expect(persisted.expiresAt!.getTime()).toBeGreaterThan(Date.now());
        expect(persisted.expiresAt!.getTime()).toBeLessThanOrEqual(Date.now() + 90 * 24 * 60 * 60 * 1000);

        const missingKey = await request(app.server).get('/partner/services');
        const partnerRead = await request(app.server)
            .get('/partner/services')
            .query({ perPage: 1 })
            .set('X-API-Key', secret);
        const oversizedPage = await request(app.server)
            .get('/partner/services')
            .query({ perPage: 101 })
            .set('X-API-Key', secret);
        const adminOnlyKey = await request(app.server)
            .post('/admin/api-keys')
            .set('Authorization', `Bearer ${admin.token}`)
            .send({ name: 'Availability-only integration', scopes: ['availability:read'] });
        const insufficientScope = await request(app.server)
            .get('/partner/services')
            .set('X-API-Key', adminOnlyKey.body.data.apiKey.secret);
        const availability = await request(app.server)
            .get(`/partner/services/${service.body.data.service.id}/availability`)
            .query({ date: '2026-11-03' })
            .set('X-API-Key', adminOnlyKey.body.data.apiKey.secret);

        expect(missingKey.status).toEqual(401);
        expect(partnerRead.status).toEqual(200);
        expect(partnerRead.body.data.services.length).toBeLessThanOrEqual(1);
        expect(partnerRead.body.data.pagination).toMatchObject({ page: 1, perPage: 1 });
        expect(oversizedPage.status).toEqual(400);
        expect(insufficientScope.status).toEqual(403);
        expect(availability.status).toEqual(200);
        expect(availability.body.data.availableSlots).toBeInstanceOf(Array);

        const revoked = await request(app.server)
            .delete(`/admin/api-keys/${id}`)
            .set('Authorization', `Bearer ${admin.token}`);
        const accessAfterRevoke = await request(app.server)
            .get('/partner/services')
            .set('X-API-Key', secret);

        expect(revoked.status).toEqual(204);
        expect(accessAfterRevoke.status).toEqual(401);
    });

    it('rejects API-key management for non-admin users', async () => {
        const client = await provisionAndAuthenticate(app, 'CLIENT');
        const response = await request(app.server)
            .post('/admin/api-keys')
            .set('Authorization', `Bearer ${client.token}`)
            .send({ name: 'unauthorized', scopes: ['services:read'] });
        expect(response.status).toEqual(403);
    });

    it('rejects expired keys and strips unauthorized fields during key creation', async () => {
        const admin = await provisionAndAuthenticate(app, 'ADMIN');
        const expired = await request(app.server)
            .post('/admin/api-keys')
            .set('Authorization', `Bearer ${admin.token}`)
            .send({ name: 'Expired', scopes: ['services:read'], expiresAt: '2020-01-01T00:00:00.000Z' });
        const longLived = await request(app.server)
            .post('/admin/api-keys')
            .set('Authorization', `Bearer ${admin.token}`)
            .send({
                name: 'Long lived',
                scopes: ['services:read'],
                expiresAt: new Date(Date.now() + 366 * 24 * 60 * 60 * 1000).toISOString(),
            });
        const massAssigned = await request(app.server)
            .post('/admin/api-keys')
            .set('Authorization', `Bearer ${admin.token}`)
            .send({ name: 'Role Injection', scopes: ['services:read'], role: 'ADMIN' });

        expect(expired.status).toEqual(400);
        expect(longLived.status).toEqual(400);
        expect(massAssigned.status).toEqual(201);
        expect(massAssigned.body.data.apiKey).not.toHaveProperty('role');
    });
});