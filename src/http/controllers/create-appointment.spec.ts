import { app } from '../../app.js';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaAppointmentsRepository } from '../../repositories/prisma/prisma-appointments-repository.js';
import { provisionAndAuthenticate } from '../../test/e2e/provision-user.js';

describe('Create Appointment (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should be able to create an appointment', async () => {
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

        const response = await request(app.server)
            .post('/appointments')
            .set('Authorization', `Bearer ${clientAuth.body.data.token}`)
            .send({
                serviceId,
                startTime: appointmentDate.toISOString(),
            });

        expect(response.status).toEqual(201);
    });

    it('should detect contained overlaps for a provider and ignore cancelled appointments', async () => {
        const providerAuth = await provisionAndAuthenticate(app, 'PROVIDER');
        const clientAuth = await provisionAndAuthenticate(app, 'CLIENT');
        const providerProfile = await request(app.server)
            .get('/me')
            .set('Authorization', `Bearer ${providerAuth.token}`);

        await request(app.server)
            .post('/services')
            .set('Authorization', `Bearer ${providerAuth.token}`)
            .send({ title: 'Consultation', price: 50, durationInMinutes: 30 });
        const services = await request(app.server)
            .get('/services')
            .set('Authorization', `Bearer ${providerAuth.token}`);
        const appointmentDate = new Date();
        appointmentDate.setDate(appointmentDate.getDate() + 2);
        while (appointmentDate.getDay() === 0 || appointmentDate.getDay() === 6) {
            appointmentDate.setDate(appointmentDate.getDate() + 1);
        }
        appointmentDate.setHours(10, 0, 0, 0);

        const created = await request(app.server)
            .post('/appointments')
            .set('Authorization', `Bearer ${clientAuth.token}`)
            .send({ serviceId: services.body.data.services[0].id, startTime: appointmentDate.toISOString() });
        expect(created.status).toEqual(201);

        const appointmentsRepository = new PrismaAppointmentsRepository();
        const containedOverlap = await appointmentsRepository.findConflictingAppointment(
            providerProfile.body.data.user.id,
            new Date(appointmentDate.getTime() + 5 * 60 * 1000),
            new Date(appointmentDate.getTime() + 15 * 60 * 1000),
        );
        expect(containedOverlap?.id).toEqual(created.body.data.appointment.id);

        const cancellation = await request(app.server)
            .patch(`/appointments/${created.body.data.appointment.id}/cancel`)
            .set('Authorization', `Bearer ${clientAuth.token}`);
        expect(cancellation.status).toEqual(204);

        const noLongerConflicting = await appointmentsRepository.findConflictingAppointment(
            providerProfile.body.data.user.id,
            new Date(appointmentDate.getTime() + 5 * 60 * 1000),
            new Date(appointmentDate.getTime() + 15 * 60 * 1000),
        );
        expect(noLongerConflicting).toBeNull();
    });

    it('should allow only one of two concurrent requests to book a provider slot', async () => {
        const providerAuth = await provisionAndAuthenticate(app, 'PROVIDER');
        const clientOne = await provisionAndAuthenticate(app, 'CLIENT');
        const clientTwo = await provisionAndAuthenticate(app, 'CLIENT');
        await request(app.server)
            .post('/services')
            .set('Authorization', `Bearer ${providerAuth.token}`)
            .send({ title: 'Concurrency Test Service', price: 45, durationInMinutes: 30 });
        const services = await request(app.server)
            .get('/services')
            .set('Authorization', `Bearer ${providerAuth.token}`);
        const serviceId = services.body.data.services[0].id as string;

        const startTime = new Date();
        startTime.setDate(startTime.getDate() + 2);
        while (startTime.getDay() === 0 || startTime.getDay() === 6) {
            startTime.setDate(startTime.getDate() + 1);
        }
        startTime.setHours(11, 0, 0, 0);

        const [responseOne, responseTwo] = await Promise.all([
            request(app.server)
                .post('/appointments')
                .set('Authorization', `Bearer ${clientOne.token}`)
                .send({ serviceId, startTime: startTime.toISOString() }),
            request(app.server)
                .post('/appointments')
                .set('Authorization', `Bearer ${clientTwo.token}`)
                .send({ serviceId, startTime: startTime.toISOString() }),
        ]);

        const statuses = [responseOne.status, responseTwo.status].sort();
        expect(statuses).toEqual([201, 409]);
        const providerProfile = await request(app.server)
            .get('/me')
            .set('Authorization', `Bearer ${providerAuth.token}`);
        const appointmentsRepository = new PrismaAppointmentsRepository();
        const providerAppointments = await appointmentsRepository.findManyByProviderId(
            providerProfile.body.data.user.id,
        );

        expect(providerAppointments).toHaveLength(1);
        expect(providerAppointments[0]?.startTime).toEqual(startTime);
    });
});