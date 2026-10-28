import { app } from '../../app.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

async function createProviderService() {
    const email = `provider-${randomUUID()}@example.com`;
    const password = '123456password';

    await request(app.server).post('/users').send({
        name: 'Availability Provider',
        email,
        password,
        role: 'PROVIDER',
    });
    const auth = await request(app.server).post('/sessions').send({ email, password });

    await request(app.server)
        .post('/services')
        .set('Authorization', `Bearer ${auth.body.token}`)
        .send({
            title: 'Consultation',
            description: 'Availability test service',
            price: 50,
            durationInMinutes: 30,
        });

    const services = await request(app.server)
        .get('/services')
        .set('Authorization', `Bearer ${auth.body.token}`);

    return {
        serviceId: services.body.services[0].id as string,
    };
}

function nextWeekdayAt(hour: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() + 1);
    }
    date.setHours(hour, 0, 0, 0);
    return date;
}

function dateQuery(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

describe('Fetch Service Availability (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should return available time strings without requiring authentication', async () => {
        const { serviceId } = await createProviderService();
        const date = nextWeekdayAt(10);

        const response = await request(app.server)
            .get(`/services/${serviceId}/availability`)
            .query({ date: dateQuery(date) });

        expect(response.status).toEqual(200);
        expect(response.body.availableSlots).toContain('08:00');
        expect(response.body.availableSlots).toContain('17:30');
    });

    it('should omit slots that overlap an existing appointment', async () => {
        const { serviceId } = await createProviderService();
        const date = nextWeekdayAt(10);
        const clientEmail = `client-${randomUUID()}@example.com`;
        const password = '123456password';

        await request(app.server).post('/users').send({
            name: 'Availability Client',
            email: clientEmail,
            password,
            role: 'CLIENT',
        });
        const clientAuth = await request(app.server).post('/sessions').send({
            email: clientEmail,
            password,
        });
        const booking = await request(app.server)
            .post('/appointments')
            .set('Authorization', `Bearer ${clientAuth.body.token}`)
            .send({ serviceId, startTime: date.toISOString() });
        expect(booking.status).toEqual(201);

        const response = await request(app.server)
            .get(`/services/${serviceId}/availability`)
            .query({ date: dateQuery(date) });

        expect(response.status).toEqual(200);
        expect(response.body.availableSlots).not.toContain('10:00');
        expect(response.body.availableSlots).toContain('10:30');
    });

    it('should validate the date and return 404 for an unknown service', async () => {
        const { serviceId } = await createProviderService();

        const invalidDate = await request(app.server)
            .get(`/services/${serviceId}/availability`)
            .query({ date: '2026-02-30' });
        const missingDate = await request(app.server)
            .get(`/services/${serviceId}/availability`);
        const missingService = await request(app.server)
            .get(`/services/${randomUUID()}/availability`)
            .query({ date: '2026-10-28' });

        expect(invalidDate.status).toEqual(400);
        expect(missingDate.status).toEqual(400);
        expect(missingService.status).toEqual(404);
    });
});