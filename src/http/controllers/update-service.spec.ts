import { app } from '../../app.js';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { provisionAndAuthenticate } from '../../test/e2e/provision-user.js';

describe('Update Service (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should be able to update a service', async () => {
        const { token } = await provisionAndAuthenticate(app, 'PROVIDER');

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

        const serviceId = listResponse.body.data.services[0].id;

        const response = await request(app.server)
            .put(`/services/${serviceId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                title: 'Corte Premium',
                description: 'Corte atualizado',
                price: 70.0,
                durationInMinutes: 45,
            });

        expect(response.status).toEqual(200);
    });
});