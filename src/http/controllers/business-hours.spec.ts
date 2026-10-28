import { app } from '../../app.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

async function authenticate(role: 'ADMIN' | 'CLIENT') {
    const email = `${role.toLowerCase()}-${randomUUID()}@example.com`;
    const password = '123456password';

    await request(app.server).post('/users').send({
        name: `${role} User`,
        email,
        password,
        role,
    });
    const response = await request(app.server).post('/sessions').send({ email, password });
    return response.body.token as string;
}

describe('Admin Business Hours Routes (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should allow admins to fetch default settings and persist updates', async () => {
        const token = await authenticate('ADMIN');
        const initial = await request(app.server)
            .get('/admin/business-hours')
            .set('Authorization', `Bearer ${token}`);

        expect(initial.status).toEqual(200);
        expect(initial.body).toEqual({ allowedDays: [1, 2, 3, 4, 5], openHour: 8, closeHour: 18 });

        const update = await request(app.server)
            .patch('/admin/business-hours')
            .set('Authorization', `Bearer ${token}`)
            .send({ allowedDays: [0, 2, 4, 6], openHour: 9, closeHour: 17 });

        expect(update.status).toEqual(200);
        expect(update.body).toEqual({ allowedDays: [0, 2, 4, 6], openHour: 9, closeHour: 17 });

        const readback = await request(app.server)
            .get('/admin/business-hours')
            .set('Authorization', `Bearer ${token}`);

        expect(readback.body).toEqual(update.body);
    });

    it('should reject non-admins from fetching or updating settings', async () => {
        const token = await authenticate('CLIENT');
        const getResponse = await request(app.server)
            .get('/admin/business-hours')
            .set('Authorization', `Bearer ${token}`);
        const patchResponse = await request(app.server)
            .patch('/admin/business-hours')
            .set('Authorization', `Bearer ${token}`)
            .send({ allowedDays: [1, 2, 3], openHour: 9, closeHour: 17 });

        expect(getResponse.status).toEqual(403);
        expect(patchResponse.status).toEqual(403);
    });

    it('should validate day and hour bounds and closing time order', async () => {
        const token = await authenticate('ADMIN');
        const invalidDay = await request(app.server)
            .patch('/admin/business-hours')
            .set('Authorization', `Bearer ${token}`)
            .send({ allowedDays: [7], openHour: 9, closeHour: 17 });
        const invalidRange = await request(app.server)
            .patch('/admin/business-hours')
            .set('Authorization', `Bearer ${token}`)
            .send({ allowedDays: [1], openHour: 17, closeHour: 17 });

        expect(invalidDay.status).toEqual(400);
        expect(invalidRange.status).toEqual(400);
    });
});