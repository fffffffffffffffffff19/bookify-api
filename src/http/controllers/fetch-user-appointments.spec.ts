import { app } from '../../app.js';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';

describe('Fetch User Appointments (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should be able to fetch user appointments', async () => {
        const providerEmail = `provider-${randomUUID()}@example.com`;

        await request(app.server).post('/users').send({
            name: 'Provider John',
            email: providerEmail,
            password: '123456password',
            role: 'PROVIDER',
        });

        const providerAuth = await request(app.server).post('/sessions').send({
            email: providerEmail,
            password: '123456password',
        });

        await request(app.server)
            .post('/services')
            .set('Authorization', `Bearer ${providerAuth.body.token}`)
            .send({
                title: 'Corte de Cabelo',
                description: 'Corte moderno',
                price: 50.0,
                durationInMinutes: 30,
            });

        const servicesList = await request(app.server)
            .get('/services')
            .set('Authorization', `Bearer ${providerAuth.body.token}`);

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

        // Garante que não cai em fim de semana (0 = Domingo, 6 = Sábado)
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

        const response = await request(app.server)
            .get('/appointments')
            .set('Authorization', `Bearer ${clientAuth.body.token}`);

        expect(response.status).toEqual(200);
        expect(response.body.appointments).toHaveLength(1);
    });
});