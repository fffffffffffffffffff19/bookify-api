import { app } from '../../app.js';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { provisionAndAuthenticate } from '../../test/e2e/provision-user.js';

describe('Fetch User Services (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should be able to fetch user services', async () => {
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

        const response = await request(app.server)
            .get('/services')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toEqual(200);
        expect(response.body.data.services).toHaveLength(1);
        expect(response.body.data.services[0].title).toEqual('Corte de Cabelo');
    });
});