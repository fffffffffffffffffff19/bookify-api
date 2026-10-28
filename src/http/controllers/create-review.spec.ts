import { app } from '../../app.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { provisionAndAuthenticate } from '../../test/e2e/provision-user.js';

async function createAppointmentFixture() {
    const provider = await provisionAndAuthenticate(app, 'PROVIDER');
    const client = await provisionAndAuthenticate(app, 'CLIENT');
    const outsider = await provisionAndAuthenticate(app, 'CLIENT');
    const serviceResponse = await request(app.server)
        .post('/services')
        .set('Authorization', `Bearer ${provider.token}`)
        .send({ title: 'Review Appointment', price: 40, durationInMinutes: 30 });
    const serviceId = serviceResponse.body.data.service.id as string;

    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 2);
    while (startTime.getDay() === 0 || startTime.getDay() === 6) {
        startTime.setDate(startTime.getDate() + 1);
    }
    startTime.setHours(10, 0, 0, 0);

    const created = await request(app.server)
        .post('/appointments')
        .set('Authorization', `Bearer ${client.token}`)
        .send({ serviceId, startTime: startTime.toISOString() });
    const appointmentId = created.body.data.appointment.id as string;

    return { appointmentId, clientToken: client.token, outsiderToken: outsider.token, providerToken: provider.token };
}

async function completeAppointment(appointmentId: string, providerToken: string) {
    return request(app.server)
        .patch(`/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'COMPLETED' });
}

describe('Create Review (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('allows the appointment client to review a completed appointment', async () => {
        const fixture = await createAppointmentFixture();
        const completion = await completeAppointment(fixture.appointmentId, fixture.providerToken);
        expect(completion.status).toEqual(200);

        const response = await request(app.server)
            .post(`/appointments/${fixture.appointmentId}/review`)
            .set('Authorization', `Bearer ${fixture.clientToken}`)
            .send({ rating: 5, comment: 'Excellent service' });

        expect(response.status).toEqual(201);
        expect(response.body.data.review).toMatchObject({
            appointmentId: fixture.appointmentId,
            rating: 5,
            comment: 'Excellent service',
        });
    });

    it('returns 400 when the appointment is not completed', async () => {
        const fixture = await createAppointmentFixture();

        const response = await request(app.server)
            .post(`/appointments/${fixture.appointmentId}/review`)
            .set('Authorization', `Bearer ${fixture.clientToken}`)
            .send({ rating: 4 });

        expect(response.status).toEqual(400);
        expect(response.body.errorCode).toEqual('APPOINTMENT_NOT_COMPLETED');
    });

    it('returns 409 when the completed appointment has already been reviewed', async () => {
        const fixture = await createAppointmentFixture();
        await completeAppointment(fixture.appointmentId, fixture.providerToken);
        const endpoint = `/appointments/${fixture.appointmentId}/review`;
        const firstReview = await request(app.server)
            .post(endpoint)
            .set('Authorization', `Bearer ${fixture.clientToken}`)
            .send({ rating: 3 });
        const duplicateReview = await request(app.server)
            .post(endpoint)
            .set('Authorization', `Bearer ${fixture.clientToken}`)
            .send({ rating: 4 });

        expect(firstReview.status).toEqual(201);
        expect(duplicateReview.status).toEqual(409);
        expect(duplicateReview.body.errorCode).toEqual('REVIEW_ALREADY_EXISTS');
    });

    it('rejects unauthenticated and non-owning clients', async () => {
        const fixture = await createAppointmentFixture();
        await completeAppointment(fixture.appointmentId, fixture.providerToken);
        const endpoint = `/appointments/${fixture.appointmentId}/review`;
        const unauthenticated = await request(app.server).post(endpoint).send({ rating: 5 });
        const forbidden = await request(app.server)
            .post(endpoint)
            .set('Authorization', `Bearer ${fixture.outsiderToken}`)
            .send({ rating: 5 });

        expect(unauthenticated.status).toEqual(401);
        expect(forbidden.status).toEqual(403);
        expect(forbidden.body.errorCode).toEqual('FORBIDDEN');
    });

    it('validates rating bounds and comment length', async () => {
        const fixture = await createAppointmentFixture();
        const endpoint = `/appointments/${fixture.appointmentId}/review`;
        const invalidRating = await request(app.server)
            .post(endpoint)
            .set('Authorization', `Bearer ${fixture.clientToken}`)
            .send({ rating: 6 });
        const longComment = await request(app.server)
            .post(endpoint)
            .set('Authorization', `Bearer ${fixture.clientToken}`)
            .send({ rating: 5, comment: 'x'.repeat(501) });

        expect(invalidRating.status).toEqual(400);
        expect(longComment.status).toEqual(400);
        expect(invalidRating.body.errorCode).toEqual('VALIDATION_ERROR');
    });
});