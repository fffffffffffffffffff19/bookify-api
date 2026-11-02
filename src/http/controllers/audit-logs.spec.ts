import { app } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { provisionAndAuthenticate } from '../../test/e2e/provision-user.js';

describe('Admin audit logs (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('records business-hours changes and returns filtered paginated results to admins', async () => {
        const admin = await provisionAndAuthenticate(app, 'ADMIN');
        const changedAt = new Date();
        const update = await request(app.server)
            .patch('/admin/business-hours')
            .set('Authorization', `Bearer ${admin.token}`)
            .set('User-Agent', 'audit-test-agent')
            .send({ allowedDays: [1, 3, 5], openHour: 10, closeHour: 16 });

        expect(update.status).toEqual(200);

        const response = await request(app.server)
            .get('/admin/audit-logs')
            .query({
                page: 1,
                perPage: 1,
                action: 'BUSINESS_HOURS_UPDATED',
                actorId: admin.actorId,
                from: new Date(changedAt.getTime() - 1000).toISOString(),
                to: new Date(Date.now() + 1000).toISOString(),
            })
            .set('Authorization', `Bearer ${admin.token}`);

        expect(response.status).toEqual(200);
        expect(response.body.data.logs).toHaveLength(1);
        expect(response.body.data.logs[0]).toMatchObject({
            actorId: admin.actorId,
            actorRole: 'ADMIN',
            action: 'BUSINESS_HOURS_UPDATED',
            targetEntity: 'BUSINESS_HOURS',
            targetId: 'global',
            payload: { after: { allowedDays: [1, 3, 5], openHour: 10, closeHour: 16 } },
            userAgent: 'audit-test-agent',
        });
        expect(response.body.data.pagination).toEqual({ page: 1, perPage: 1, total: 1, totalPages: 1 });
    });

    it('records profile changes without storing submitted password values', async () => {
        const client = await provisionAndAuthenticate(app, 'CLIENT');
        const response = await request(app.server)
            .patch('/me')
            .set('Authorization', `Bearer ${client.token}`)
            .send({ name: 'Updated Audit Profile', oldPassword: client.password, newPassword: 'new-password-123' });

        expect(response.status).toEqual(200);
        const entry = await prisma.auditLog.findFirstOrThrow({
            where: { actorId: client.actorId, action: 'USER_PROFILE_UPDATED' },
        });
        expect(entry.payload).toEqual({ changedFields: ['name', 'password'] });
        expect(JSON.stringify(entry.payload)).not.toContain('new-password-123');
    });

    it('records one-session revocations', async () => {
        const client = await provisionAndAuthenticate(app, 'CLIENT');
        const login = await request(app.server)
            .post('/sessions')
            .send({ email: client.email, password: client.password });
        const sessionId = login.body.data.sessionId as string;

        const response = await request(app.server)
            .delete(`/auth/sessions/${sessionId}`)
            .set('Authorization', `Bearer ${client.token}`);

        expect(response.status).toEqual(204);
        const entry = await prisma.auditLog.findFirstOrThrow({
            where: { actorId: client.actorId, action: 'SESSION_REVOKED', targetId: sessionId },
        });
        expect(entry.targetEntity).toEqual('SESSION');
        expect(entry.payload).toEqual({ revokedCount: 1 });
    });

    it('denies non-admins and anonymous requests', async () => {
        const client = await provisionAndAuthenticate(app, 'CLIENT');
        const denied = await request(app.server)
            .get('/admin/audit-logs')
            .set('Authorization', `Bearer ${client.token}`);
        const anonymous = await request(app.server).get('/admin/audit-logs');

        expect(denied.status).toEqual(403);
        expect(anonymous.status).toEqual(401);
    });
});