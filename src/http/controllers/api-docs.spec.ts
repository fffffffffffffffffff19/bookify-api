import { app } from '../../app.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('OpenAPI documentation (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('serves Swagger UI and an OpenAPI document containing public and protected routes', async () => {
        const ui = await request(app.server).get('/docs');
        const specification = await request(app.server).get('/docs/json');

        expect(ui.status).toEqual(200);
        expect(ui.headers['content-type']).toContain('text/html');
        expect(specification.status).toEqual(200);
        expect(specification.body.info).toMatchObject({
            title: 'Bookify API',
            version: '1.0.0',
        });
        expect(specification.body.paths).toHaveProperty('/services/public');
        expect(specification.body.paths).toHaveProperty('/appointments/{id}/review');
        expect(specification.body.paths['/admin/business-hours'].get.security).toEqual([
            { bearerAuth: [] },
        ]);
        expect(specification.body.components.securitySchemes.bearerAuth).toMatchObject({
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
        });
    });
});