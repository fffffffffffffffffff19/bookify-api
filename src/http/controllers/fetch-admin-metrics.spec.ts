import { app } from '../../app.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { provisionAndAuthenticate } from '../../test/e2e/provision-user.js';

describe('Fetch Admin Metrics (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('returns the metrics to an admin', async () => {
        const admin = await provisionAndAuthenticate(app, 'ADMIN');
        const response = await request(app.server)
            .get('/admin/metrics')
            .set('Authorization', `Bearer ${admin.token}`);

        expect(response.status).toEqual(200);
        expect(response.body.data).toMatchObject({
            appointments: {
                total: expect.any(Number),
                pending: expect.any(Number),
                confirmed: expect.any(Number),
                completed: expect.any(Number),
                cancelled: expect.any(Number),
            },
            users: { clients: expect.any(Number), providers: expect.any(Number) },
            performance: {
                completionRate: expect.any(Number),
                cancellationRate: expect.any(Number),
            },
        });
    });

    it('rejects clients and unauthenticated requests', async () => {
        const client = await provisionAndAuthenticate(app, 'CLIENT');
        const forbidden = await request(app.server)
            .get('/admin/metrics')
            .set('Authorization', `Bearer ${client.token}`);
        const unauthorized = await request(app.server).get('/admin/metrics');

        expect(forbidden.status).toEqual(403);
        expect(unauthorized.status).toEqual(401);
    });
});