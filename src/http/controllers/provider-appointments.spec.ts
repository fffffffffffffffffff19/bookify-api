import { app } from '../../app.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { provisionAndAuthenticate } from '../../test/e2e/provision-user.js';
import { PrismaAppointmentsRepository } from '../../repositories/prisma/prisma-appointments-repository.js';

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
            serviceId: services.body.data.services[0].id,
            startTime: startTime.toISOString(),
        });

    return {
        appointmentId: appointmentResponse.body.data.appointment.id as string,
        providerToken: providerAuth.token,
        clientToken: clientAuth.token,
    };
}

async function setAppointmentEndTimeInPast(appointmentId: string) {
    const repository = new PrismaAppointmentsRepository();
    const appointment = await repository.findById(appointmentId);
    if (!appointment) throw new Error('Test appointment was not found.');

    appointment.endTime = new Date(Date.now() - 60_000);
    appointment.startTime = new Date(appointment.endTime.getTime() - 30 * 60 * 1000);
    await repository.save(appointment);
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
        expect(response.body.data.appointments).toHaveLength(1);
        expect(response.body.data.appointments[0].id).toEqual(appointmentId);
    });

    it('should reject clients from fetching the provider schedule', async () => {
        const { clientToken } = await createAppointmentFixture();

        const response = await request(app.server)
            .get('/provider/appointments')
            .set('Authorization', `Bearer ${clientToken}`);

        expect(response.status).toEqual(403);
    });

    it('should allow a client to cancel their own pending appointment', async () => {
        const { clientToken, appointmentId } = await createAppointmentFixture();

        const response = await request(app.server)
            .patch(`/appointments/${appointmentId}/status`)
            .set('Authorization', `Bearer ${clientToken}`)
            .send({ status: 'CANCELLED' });

        expect(response.status).toEqual(200);
        expect(response.body.data.appointment.status).toEqual('CANCELLED');
    });

    it('should allow only one concurrent status transition from pending', async () => {
        const { clientToken, appointmentId } = await createAppointmentFixture();
        const responses = await Promise.all([
            request(app.server)
                .patch(`/appointments/${appointmentId}/status`)
                .set('Authorization', `Bearer ${clientToken}`)
                .send({ status: 'CANCELLED' }),
            request(app.server)
                .patch(`/appointments/${appointmentId}/status`)
                .set('Authorization', `Bearer ${clientToken}`)
                .send({ status: 'CANCELLED' }),
        ]);

        expect(responses.filter((response) => response.status === 200)).toHaveLength(1);
        expect(responses.filter((response) => response.status !== 200)).toHaveLength(1);
        expect([400, 409]).toContain(responses.find((response) => response.status !== 200)?.status);
    });

    it('should allow the provider to complete a pending appointment after its end time', async () => {
        const { appointmentId, providerToken } = await createAppointmentFixture();
        await setAppointmentEndTimeInPast(appointmentId);

        const response = await request(app.server)
            .patch(`/appointments/${appointmentId}/status`)
            .set('Authorization', `Bearer ${providerToken}`)
            .send({ status: 'COMPLETED' });

        expect(response.status).toEqual(200);
        expect(response.body.data.appointment.status).toEqual('COMPLETED');
    });

    it('should reject admin completion before the appointment end time', async () => {
        const { appointmentId } = await createAppointmentFixture();
        const admin = await provisionAndAuthenticate(app, 'ADMIN');

        const response = await request(app.server)
            .patch(`/appointments/${appointmentId}/status`)
            .set('Authorization', `Bearer ${admin.token}`)
            .send({ status: 'COMPLETED' });

        expect(response.status).toEqual(400);
        expect(response.body.errorCode).toEqual('APPOINTMENT_NOT_FINISHED');
    });

    it('should reject status mutations after an appointment becomes terminal', async () => {
        const { appointmentId, providerToken } = await createAppointmentFixture();
        const cancelled = await request(app.server)
            .patch(`/appointments/${appointmentId}/status`)
            .set('Authorization', `Bearer ${providerToken}`)
            .send({ status: 'CANCELLED' });
        const mutation = await request(app.server)
            .patch(`/appointments/${appointmentId}/status`)
            .set('Authorization', `Bearer ${providerToken}`)
            .send({ status: 'COMPLETED' });

        expect(cancelled.status).toEqual(200);
        expect(mutation.status).toEqual(400);
        expect(mutation.body.errorCode).toEqual('INVALID_STATUS_TRANSITION');
    });

    it('should return 403 to clients and providers who do not own an appointment', async () => {
        const { clientToken, appointmentId } = await createAppointmentFixture();
        const otherProviderAuth = await provisionAndAuthenticate(app, 'PROVIDER');

        const forbidden = await request(app.server)
            .patch(`/appointments/${appointmentId}/status`)
            .set('Authorization', `Bearer ${clientToken}`)
            .send({ status: 'COMPLETED' });
        const forbiddenProvider = await request(app.server)
            .patch(`/appointments/${appointmentId}/status`)
            .set('Authorization', `Bearer ${otherProviderAuth.token}`)
            .send({ status: 'CANCELLED' });
        expect(forbidden.status).toEqual(403);
        expect(forbiddenProvider.status).toEqual(403);
    });

    it('should return 404 when the appointment does not exist', async () => {
        const { providerToken } = await createAppointmentFixture();
        const notFound = await request(app.server)
            .patch(`/appointments/${randomUUID()}/status`)
            .set('Authorization', `Bearer ${providerToken}`)
            .send({ status: 'CANCELLED' });

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