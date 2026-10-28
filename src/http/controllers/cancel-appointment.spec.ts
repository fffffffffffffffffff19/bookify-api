import { app } from '../../app.js';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { provisionAndAuthenticate } from '../../test/e2e/provision-user.js';

describe('Cancel Appointment (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should be able to cancel an appointment', async () => {
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

        const serviceId = servicesList.body.services[0].id;

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
            .set('Authorization', `Bearer ${clientAuth.body.token}`)
            .send({
                serviceId,
                startTime: appointmentDate.toISOString(),
            });

        const appointmentsList = await request(app.server)
            .get('/appointments')
            .set('Authorization', `Bearer ${clientAuth.body.token}`);

        const appointmentId = appointmentsList.body.appointments[0].id;

        const response = await request(app.server)
            .patch(`/appointments/${appointmentId}/cancel`)
            .set('Authorization', `Bearer ${clientAuth.body.token}`);

        expect(response.status).toEqual(204);
    });
});