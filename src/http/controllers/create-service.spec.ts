import { app } from '../../app.js';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';

describe('Create Service (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should be able to create a service', async () => {
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

        const response = await request(app.server)
            .post('/services')
            .set('Authorization', `Bearer ${token}`)
            .send({
                title: 'Corte de Cabelo',
                description: 'Corte moderno e barba',
                price: 50.0,
                durationInMinutes: 30,
            });

        expect(response.status).toEqual(201);
    });
});