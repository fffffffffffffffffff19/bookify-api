import { app } from '../../app.js';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { provisionAndAuthenticate } from '../../test/e2e/provision-user.js';

describe('Create Service (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should be able to create a service', async () => {
        const { token } = await provisionAndAuthenticate(app, 'PROVIDER');

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