import { app } from '../../app.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { provisionAndAuthenticate } from '../../test/e2e/provision-user.js';

describe('Fetch Admin Appointments (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should allow admins to fetch all appointments', async () => {
        const auth = await provisionAndAuthenticate(app, 'ADMIN');

        const response = await request(app.server)
            .get('/admin/appointments')
            .set('Authorization', `Bearer ${auth.token}`);

        expect(response.status).toEqual(200);
        expect(response.body.data.appointments).toEqual([]);
        expect(response.body.data.pagination).toEqual({ page: 1, perPage: 20, total: 0, totalPages: 0 });
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
            .set('Authorization', `Bearer ${auth.body.data.token}`);

        expect(response.status).toEqual(403);
    });

    it('should return the requested filtered page of appointments', async () => {
        const providerAuth = await provisionAndAuthenticate(app, 'PROVIDER');
        const clientAuth = await provisionAndAuthenticate(app, 'CLIENT');
        const adminAuth = await provisionAndAuthenticate(app, 'ADMIN');
        await request(app.server)
            .post('/services')
            .set('Authorization', `Bearer ${providerAuth.token}`)
            .send({ title: 'Consultation', price: 50, durationInMinutes: 30 });
        const services = await request(app.server)
            .get('/services')
            .set('Authorization', `Bearer ${providerAuth.token}`);
        const serviceId = services.body.data.services[0].id;

        const date = new Date();
        date.setDate(date.getDate() + 2);
        while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
        date.setHours(10, 0, 0, 0);
        const first = await request(app.server)
            .post('/appointments')
            .set('Authorization', `Bearer ${clientAuth.token}`)
            .send({ serviceId, startTime: date.toISOString() });
        const secondTime = new Date(date.getTime() + 60 * 60 * 1000);
        const second = await request(app.server)
            .post('/appointments')
            .set('Authorization', `Bearer ${clientAuth.token}`)
            .send({ serviceId, startTime: secondTime.toISOString() });

        expect(first.status).toEqual(201);
        expect(second.status).toEqual(201);

        const response = await request(app.server)
            .get('/admin/appointments')
            .query({
                page: 2,
                perPage: 1,
                status: 'PENDING',
                from: date.toISOString(),
                to: new Date(date.getTime() + 2 * 60 * 60 * 1000).toISOString(),
            })
            .set('Authorization', `Bearer ${adminAuth.token}`);

        expect(response.status).toEqual(200);
        expect(response.body.data.appointments).toHaveLength(1);
        expect(response.body.data.appointments[0].id).toEqual(second.body.data.appointment.id);
        expect(response.body.data.pagination).toEqual({ page: 2, perPage: 1, total: 2, totalPages: 2 });
    });
});
