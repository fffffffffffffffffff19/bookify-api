import { app } from '../../app.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { provisionAndAuthenticate } from '../../test/e2e/provision-user.js';

describe('Public Service Catalog (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('lists services and provider summaries without authentication', async () => {
        const provider = await provisionAndAuthenticate(app, 'PROVIDER');
        await request(app.server)
            .post('/services')
            .set('Authorization', `Bearer ${provider.token}`)
            .send({ title: 'Catalog Massage', description: '60-minute session', price: 75, durationInMinutes: 60 });

        const response = await request(app.server).get('/services/public');

        expect(response.status).toEqual(200);
        expect(response.body.data.services).toEqual([
            expect.objectContaining({
                title: 'Catalog Massage',
                provider: expect.objectContaining({ id: expect.any(String), name: expect.any(String) }),
            }),
        ]);
    });
});