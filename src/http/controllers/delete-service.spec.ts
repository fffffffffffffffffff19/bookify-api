import { app } from '../../app.js';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { provisionAndAuthenticate } from '../../test/e2e/provision-user.js';

describe('Delete Service (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should be able to delete a service', async () => {
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

        const serviceId = listResponse.body.services[0].id;

        const response = await request(app.server)
            .delete(`/services/${serviceId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toEqual(204);
    });
});