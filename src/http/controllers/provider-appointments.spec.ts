import { app } from '../../app.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

async function createAppointmentFixture() {
    const suffix = randomUUID();
    const providerEmail = `provider-${suffix}@example.com`;
    const clientEmail = `client-${suffix}@example.com`;
    const password = '123456password';

    await request(app.server).post('/users').send({
        name: 'Provider User',
        email: providerEmail,
        password,
        role: 'PROVIDER',
    });
    await request(app.server).post('/users').send({
        name: 'Client User',
        email: clientEmail,
        password,
        role: 'CLIENT',
    });

    const providerAuth = await request(app.server).post('/sessions').send({
        email: providerEmail,
        password,
    });
    const clientAuth = await request(app.server).post('/sessions').send({
        email: clientEmail,
        password,
    });

    await request(app.server)
        .post('/services')
        .set('Authorization', `Bearer ${providerAuth.body.token}`)
        .send({
            title: 'Consultation',
            description: 'Provider appointment test',
            price: 50,
            durationInMinutes: 30,
        });

    const services = await request(app.server)
        .get('/services')
        .set('Authorization', `Bearer ${providerAuth.body.token}`);

    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 2);
    while (startTime.getDay() === 0 || startTime.getDay() === 6) {
        startTime.setDate(startTime.getDate() + 1);
    }
    startTime.setHours(10, 0, 0, 0);

    const appointmentResponse = await request(app.server)
        .post('/appointments')
        .set('Authorization', `Bearer ${clientAuth.body.token}`)
        .send({
            serviceId: services.body.services[0].id,
            startTime: startTime.toISOString(),
        });

    return {
        appointmentId: appointmentResponse.body.appointment.id as string,
        providerToken: providerAuth.body.token as string,
        clientToken: clientAuth.body.token as string,
    };
}

describe('Provider Appointment Routes (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should return appointments assigned to the authenticated provider', async () => {
        const { providerToken, appointmentId } = await createAppointmentFixture();

        const response = await request(app.server)
            .get('/provider/appointments')
            .set('Authorization', `Bearer ${providerToken}`);

        expect(response.status).toEqual(200);
        expect(response.body.appointments).toHaveLength(1);
        expect(response.body.appointments[0].id).toEqual(appointmentId);
    });

    it('should reject clients from fetching the provider schedule', async () => {
        const { clientToken } = await createAppointmentFixture();

        const response = await request(app.server)
            .get('/provider/appointments')
            .set('Authorization', `Bearer ${clientToken}`);

        expect(response.status).toEqual(403);
    });

    it('should allow the appointment provider to update its status', async () => {
        const { providerToken, appointmentId } = await createAppointmentFixture();

        const response = await request(app.server)
            .patch(`/appointments/${appointmentId}/status`)
            .set('Authorization', `Bearer ${providerToken}`)
            .send({ status: 'CONFIRMED' });

        expect(response.status).toEqual(200);
        expect(response.body.appointment.status).toEqual('CONFIRMED');
    });

    it('should allow admins to update appointment status', async () => {
        const { appointmentId } = await createAppointmentFixture();
        const email = `admin-${randomUUID()}@example.com`;
        const password = '123456password';

        await request(app.server).post('/users').send({
            name: 'Admin User',
            email,
            password,
            role: 'ADMIN',
        });
        const auth = await request(app.server).post('/sessions').send({ email, password });

        const response = await request(app.server)
            .patch(`/appointments/${appointmentId}/status`)
            .set('Authorization', `Bearer ${auth.body.token}`)
            .send({ status: 'COMPLETED' });

        expect(response.status).toEqual(200);
        expect(response.body.appointment.status).toEqual('COMPLETED');
    });

    it('should return 403 to clients and providers who do not own an appointment', async () => {
        const { clientToken, appointmentId } = await createAppointmentFixture();
        const otherProviderEmail = `other-provider-${randomUUID()}@example.com`;
        const password = '123456password';

        await request(app.server).post('/users').send({
            name: 'Other Provider',
            email: otherProviderEmail,
            password,
            role: 'PROVIDER',
        });
        const otherProviderAuth = await request(app.server).post('/sessions').send({
            email: otherProviderEmail,
            password,
        });

        const forbidden = await request(app.server)
            .patch(`/appointments/${randomUUID()}/status`)
            .set('Authorization', `Bearer ${clientToken}`)
            .send({ status: 'CONFIRMED' });
        const forbiddenProvider = await request(app.server)
            .patch(`/appointments/${appointmentId}/status`)
            .set('Authorization', `Bearer ${otherProviderAuth.body.token}`)
            .send({ status: 'CONFIRMED' });
        expect(forbidden.status).toEqual(403);
        expect(forbiddenProvider.status).toEqual(403);
    });

    it('should return 404 when the appointment does not exist', async () => {
        const { providerToken } = await createAppointmentFixture();
        const notFound = await request(app.server)
            .patch(`/appointments/${randomUUID()}/status`)
            .set('Authorization', `Bearer ${providerToken}`)
            .send({ status: 'CONFIRMED' });

        expect(notFound.status).toEqual(404);
    });

    it('should validate the requested appointment status', async () => {
        const { providerToken, appointmentId } = await createAppointmentFixture();

        const response = await request(app.server)
            .patch(`/appointments/${appointmentId}/status`)
            .set('Authorization', `Bearer ${providerToken}`)
            .send({ status: 'PENDING' });

        expect(response.status).toEqual(400);
    });
});