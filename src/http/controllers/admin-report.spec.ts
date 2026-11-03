import { app } from '../../app.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { provisionAndAuthenticate } from '../../test/e2e/provision-user.js';
import { randomUUID } from 'node:crypto';

describe('Admin streaming report (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('streams a CSV attachment to admins and rejects non-admin requests', async () => {
        const admin = await provisionAndAuthenticate(app, 'ADMIN');
        const client = await provisionAndAuthenticate(app, 'CLIENT');
        const provider = await provisionAndAuthenticate(app, 'PROVIDER');
        const service = await request(app.server)
            .post('/services')
            .set('Authorization', `Bearer ${provider.token}`)
            .send({ title: `Stream export ${randomUUID()}`, price: 20, durationInMinutes: 30 });
        const startTime = new Date();
        startTime.setDate(startTime.getDate() + 2);
        while (startTime.getDay() === 0 || startTime.getDay() === 6) {
            startTime.setDate(startTime.getDate() + 1);
        }
        startTime.setHours(9, 0, 0, 0);
        const booking = await request(app.server)
            .post('/appointments')
            .set('Authorization', `Bearer ${client.token}`)
            .send({ serviceId: service.body.data.service.id, startTime: startTime.toISOString() });
        expect(booking.status).toEqual(201);
        const anonymous = await request(app.server).get('/admin/reports/stream');
        const forbidden = await request(app.server)
            .get('/admin/reports/stream')
            .set('Authorization', `Bearer ${client.token}`);
        const report = await request(app.server)
            .get('/admin/reports/stream')
            .set('Authorization', `Bearer ${admin.token}`);

        expect(anonymous.status).toEqual(401);
        expect(forbidden.status).toEqual(403);
        expect(report.status).toEqual(200);
        expect(report.headers['content-type']).toContain('text/csv');
        expect(report.headers['content-disposition']).toContain('appointments.csv');
        expect(report.text).toContain('appointmentId,clientId,providerId,serviceId');
        expect(report.text).toContain(booking.body.data.appointment.id);
    });
});