import { app } from '../../app.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

describe('Fetch Admin Appointments (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should allow admins to fetch all appointments', async () => {
        const email = `admin-${randomUUID()}@example.com`;
        await request(app.server).post('/users').send({
            name: 'Admin User',
            email,
            password: '123456password',
            role: 'ADMIN',
        });
        const auth = await request(app.server).post('/sessions').send({
            email,
            password: '123456password',
        });

        const response = await request(app.server)
            .get('/admin/appointments')
            .set('Authorization', `Bearer ${auth.body.token}`);

        expect(response.status).toEqual(200);
        expect(response.body.appointments).toEqual([]);
    });

    it('should reject clients from fetching all appointments', async () => {
        const email = `client-${randomUUID()}@example.com`;
        await request(app.server).post('/users').send({
            name: 'Client User',
            email,
            password: '123456password',
            role: 'CLIENT',
        });
        const auth = await request(app.server).post('/sessions').send({
            email,
            password: '123456password',
        });

        const response = await request(app.server)
            .get('/admin/appointments')
            .set('Authorization', `Bearer ${auth.body.token}`);

        expect(response.status).toEqual(403);
    });
});
