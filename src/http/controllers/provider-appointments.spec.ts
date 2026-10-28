import { app } from '../../app.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { provisionAndAuthenticate } from '../../test/e2e/provision-user.js';

async function createAppointmentFixture() {
    const providerAuth = await provisionAndAuthenticate(app, 'PROVIDER');
    const clientAuth = await provisionAndAuthenticate(app, 'CLIENT');

    await request(app.server)
        .post('/services')
        .set('Authorization', `Bearer ${providerAuth.token}`)
        .send({
            title: 'Consultation',
            description: 'Provider appointment test',
            price: 50,
            durationInMinutes: 30,
        });

    const services = await request(app.server)
        .get('/services')
        .set('Authorization', `Bearer ${providerAuth.token}`);

    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 2);
    while (startTime.getDay() === 0 || startTime.getDay() === 6) {
        startTime.setDate(startTime.getDate() + 1);
    }
    startTime.setHours(10, 0, 0, 0);

    const appointmentResponse = await request(app.server)
        .post('/appointments')
        .set('Authorization', `Bearer ${clientAuth.token}`)
        .send({
            serviceId: services.body.services[0].id,
            startTime: startTime.toISOString(),
        });

    return {
        appointmentId: appointmentResponse.body.appointment.id as string,
        providerToken: providerAuth.token,
        clientToken: clientAuth.token,
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
        const auth = await provisionAndAuthenticate(app, 'ADMIN');

        const response = await request(app.server)
            .patch(`/appointments/${appointmentId}/status`)
            .set('Authorization', `Bearer ${auth.token}`)
            .send({ status: 'COMPLETED' });

        expect(response.status).toEqual(200);
        expect(response.body.appointment.status).toEqual('COMPLETED');
    });

    it('should return 403 to clients and providers who do not own an appointment', async () => {
        const { clientToken, appointmentId } = await createAppointmentFixture();
        const otherProviderAuth = await provisionAndAuthenticate(app, 'PROVIDER');

        const forbidden = await request(app.server)
            .patch(`/appointments/${randomUUID()}/status`)
            .set('Authorization', `Bearer ${clientToken}`)
            .send({ status: 'CONFIRMED' });
        const forbiddenProvider = await request(app.server)
            .patch(`/appointments/${appointmentId}/status`)
            .set('Authorization', `Bearer ${otherProviderAuth.token}`)
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