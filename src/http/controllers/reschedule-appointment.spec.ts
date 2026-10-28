import { app } from '../../app.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { provisionAndAuthenticate } from '../../test/e2e/provision-user.js';

async function createBookingFixture() {
    const provider = await provisionAndAuthenticate(app, 'PROVIDER');
    const client = await provisionAndAuthenticate(app, 'CLIENT');
    const otherClient = await provisionAndAuthenticate(app, 'CLIENT');
    await request(app.server)
        .post('/services')
        .set('Authorization', `Bearer ${provider.token}`)
        .send({ title: 'Reschedule Test', price: 50, durationInMinutes: 30 });
    const services = await request(app.server)
        .get('/services')
        .set('Authorization', `Bearer ${provider.token}`);
    const serviceId = services.body.data.services[0].id as string;

    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 2);
    while (startTime.getDay() === 0 || startTime.getDay() === 6) {
        startTime.setDate(startTime.getDate() + 1);
    }
    startTime.setHours(10, 0, 0, 0);

    const create = (userToken: string, time: Date) => request(app.server)
        .post('/appointments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ serviceId, startTime: time.toISOString() });
    const appointment = await create(client.token, startTime);
    const otherAppointment = await create(otherClient.token, new Date(startTime.getTime() + 60 * 60 * 1000));

    return {
        appointmentId: appointment.body.data.appointment.id as string,
        otherAppointmentId: otherAppointment.body.data.appointment.id as string,
        providerToken: provider.token,
        clientToken: client.token,
        otherClientToken: otherClient.token,
        startTime,
    };
}

describe('Reschedule Appointment (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('reschedules an appointment and returns the standard safe data envelope', async () => {
        const fixture = await createBookingFixture();
        const newStartTime = new Date(fixture.startTime.getTime() + 2 * 60 * 60 * 1000);

        const response = await request(app.server)
            .patch(`/appointments/${fixture.appointmentId}/reschedule`)
            .set('Authorization', `Bearer ${fixture.clientToken}`)
            .send({ startTime: newStartTime.toISOString() });

        expect(response.status).toEqual(200);
        expect(response.body.data.appointment).toMatchObject({
            id: fixture.appointmentId,
            startTime: newStartTime.toISOString(),
            endTime: new Date(newStartTime.getTime() + 30 * 60 * 1000).toISOString(),
        });
    });

    it('returns 409 when the new time conflicts with another provider appointment', async () => {
        const fixture = await createBookingFixture();

        const response = await request(app.server)
            .patch(`/appointments/${fixture.appointmentId}/reschedule`)
            .set('Authorization', `Bearer ${fixture.clientToken}`)
            .send({ startTime: new Date(fixture.startTime.getTime() + 60 * 60 * 1000).toISOString() });

        expect(response.status).toEqual(409);
        expect(response.body.errorCode).toEqual('BOOKING_CONFLICT');
    });

    it('does not allow concurrent reschedules to double-book a provider slot', async () => {
        const fixture = await createBookingFixture();
        const competingStart = new Date(fixture.startTime.getTime() + 2 * 60 * 60 * 1000).toISOString();
        const responses = await Promise.all([
            request(app.server)
                .patch(`/appointments/${fixture.appointmentId}/reschedule`)
                .set('Authorization', `Bearer ${fixture.clientToken}`)
                .send({ startTime: competingStart }),
            request(app.server)
                .patch(`/appointments/${fixture.otherAppointmentId}/reschedule`)
                .set('Authorization', `Bearer ${fixture.otherClientToken}`)
                .send({ startTime: competingStart }),
        ]);

        expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    });

    it('rejects rescheduling to a time in the past', async () => {
        const fixture = await createBookingFixture();
        const response = await request(app.server)
            .patch(`/appointments/${fixture.appointmentId}/reschedule`)
            .set('Authorization', `Bearer ${fixture.clientToken}`)
            .send({ startTime: new Date(Date.now() - 60_000).toISOString() });

        expect(response.status).toEqual(400);
        expect(response.body.errorCode).toEqual('PAST_APPOINTMENT');
    });

    it('rejects unauthenticated, unauthorized, and missing-appointment requests', async () => {
        const fixture = await createBookingFixture();
        const newStartTime = new Date(fixture.startTime.getTime() + 2 * 60 * 60 * 1000).toISOString();
        const unauthenticated = await request(app.server)
            .patch(`/appointments/${fixture.appointmentId}/reschedule`)
            .send({ startTime: newStartTime });
        const forbidden = await request(app.server)
            .patch(`/appointments/${fixture.appointmentId}/reschedule`)
            .set('Authorization', `Bearer ${fixture.otherClientToken}`)
            .send({ startTime: newStartTime });
        const missing = await request(app.server)
            .patch(`/appointments/${randomUUID()}/reschedule`)
            .set('Authorization', `Bearer ${fixture.clientToken}`)
            .send({ startTime: newStartTime });

        expect(unauthenticated.status).toEqual(401);
        expect(forbidden.status).toEqual(403);
        expect(missing.status).toEqual(404);
        expect(forbidden.body.errorCode).toEqual('FORBIDDEN');
        expect(missing.body.errorCode).toEqual('RESOURCE_NOT_FOUND');
    });

    it('validates the new start time format', async () => {
        const fixture = await createBookingFixture();

        const response = await request(app.server)
            .patch(`/appointments/${fixture.appointmentId}/reschedule`)
            .set('Authorization', `Bearer ${fixture.clientToken}`)
            .send({ startTime: 'not-a-datetime' });

        expect(response.status).toEqual(400);
        expect(response.body.errorCode).toEqual('VALIDATION_ERROR');
    });
});