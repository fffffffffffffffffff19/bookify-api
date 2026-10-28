import { app } from '../../app.js';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { provisionAndAuthenticate } from '../../test/e2e/provision-user.js';

describe('Fetch User Appointments (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should be able to fetch user appointments', async () => {
        const providerAuth = await provisionAndAuthenticate(app, 'PROVIDER');

        await request(app.server)
            .post('/services')
            .set('Authorization', `Bearer ${providerAuth.token}`)
            .send({
                title: 'Corte de Cabelo',
                description: 'Corte moderno',
                price: 50.0,
                durationInMinutes: 30,
            });

        const servicesList = await request(app.server)
            .get('/services')
            .set('Authorization', `Bearer ${providerAuth.token}`);

        const serviceId = servicesList.body.data.services[0].id;

        const clientEmail = `client-${randomUUID()}@example.com`;

        await request(app.server).post('/users').send({
            name: 'Client Jane',
            email: clientEmail,
            password: '123456password',
            role: 'CLIENT',
        });

        const clientAuth = await request(app.server).post('/sessions').send({
            email: clientEmail,
            password: '123456password',
        });

        const appointmentDate = new Date();
        appointmentDate.setDate(appointmentDate.getDate() + 2);

        while (appointmentDate.getDay() === 0 || appointmentDate.getDay() === 6) {
            appointmentDate.setDate(appointmentDate.getDate() + 1);
        }

        appointmentDate.setHours(10, 0, 0, 0);

        await request(app.server)
            .post('/appointments')
            .set('Authorization', `Bearer ${clientAuth.body.data.token}`)
            .send({
                serviceId,
                startTime: appointmentDate.toISOString(),
            });

        const response = await request(app.server)
            .get('/appointments')
            .set('Authorization', `Bearer ${clientAuth.body.data.token}`);

        expect(response.status).toEqual(200);
        expect(response.body.data.appointments).toHaveLength(1);
        expect(response.body.data.pagination).toEqual({ page: 1, perPage: 20, total: 1, totalPages: 1 });

        const filteredResponse = await request(app.server)
            .get('/appointments')
            .query({
                page: 1,
                perPage: 1,
                status: 'PENDING',
                from: appointmentDate.toISOString(),
                to: new Date(appointmentDate.getTime() + 60 * 60 * 1000).toISOString(),
            })
            .set('Authorization', `Bearer ${clientAuth.body.data.token}`);

        expect(filteredResponse.status).toEqual(200);
        expect(filteredResponse.body.data.appointments).toHaveLength(1);
        expect(filteredResponse.body.data.pagination).toEqual({
            page: 1,
            perPage: 1,
            total: 1,
            totalPages: 1,
        });
    });

    it('should reject invalid pagination and date-range query values', async () => {
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
            .get('/appointments')
            .query({ page: 0, perPage: 101, from: '2026-10-29T12:00:00.000Z', to: '2026-10-29T10:00:00.000Z' })
            .set('Authorization', `Bearer ${auth.body.data.token}`);

        expect(response.status).toEqual(400);
    });
});