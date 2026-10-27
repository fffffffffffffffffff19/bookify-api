import { app } from '../../app.js';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';

describe('Delete Service (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should be able to delete a service', async () => {
        const email = `provider-${randomUUID()}@example.com`;

        await request(app.server).post('/users').send({
            name: 'Provider John',
            email,
            password: '123456password',
            role: 'PROVIDER',
        });

        const authResponse = await request(app.server).post('/sessions').send({
            email,
            password: '123456password',
        });

        const { token } = authResponse.body;

        await request(app.server)
            .post('/services')
            .set('Authorization', `Bearer ${token}`)
            .send({
                title: 'Corte de Cabelo',
                description: 'Corte moderno',
                price: 50.0,
                durationInMinutes: 30,
            });

        const listResponse = await request(app.server)
            .get('/services')
            .set('Authorization', `Bearer ${token}`);

        const serviceId = listResponse.body.services[0].id;

        const response = await request(app.server)
            .delete(`/services/${serviceId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toEqual(204);
    });
});