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
        const health = await request(app.server).get('/health');

        expect(ui.status).toEqual(200);
        expect(ui.headers['content-type']).toContain('text/html');
        expect(health.status).toEqual(200);
        expect(health.body).toEqual({ data: { status: 'ok' } });
        expect(specification.status).toEqual(200);
        expect(specification.body.info).toMatchObject({
            title: 'Bookify API',
            version: '1.0.0',
        });
        expect(specification.body.paths).toHaveProperty('/health');
        expect(specification.body.paths['/health'].get.tags).toEqual(['Health']);
        expect(specification.body.paths).toEqual(expect.objectContaining({
            '/users': expect.any(Object),
            '/sessions': expect.any(Object),
            '/auth/refresh': expect.any(Object),
            '/auth/logout': expect.any(Object),
            '/auth/sessions': expect.any(Object),
            '/auth/sessions/all': expect.any(Object),
            '/auth/sessions/{sessionId}': expect.any(Object),
            '/me': expect.any(Object),
            '/services': expect.any(Object),
            '/services/public': expect.any(Object),
            '/partner/services': expect.any(Object),
            '/partner/services/{serviceId}/availability': expect.any(Object),
            '/services/{serviceId}/availability': expect.any(Object),
            '/services/{id}': expect.any(Object),
            '/appointments': expect.any(Object),
            '/appointments/{id}/cancel': expect.any(Object),
            '/appointments/{id}/reschedule': expect.any(Object),
            '/appointments/{id}/review': expect.any(Object),
            '/appointments/{id}/status': expect.any(Object),
            '/appointments/{id}/pay': expect.any(Object),
            '/webhooks/stripe': expect.any(Object),
            '/provider/appointments': expect.any(Object),
            '/admin/appointments': expect.any(Object),
            '/admin/business-hours': expect.any(Object),
            '/admin/metrics': expect.any(Object),
            '/admin/reports/stream': expect.any(Object),
            '/admin/api-keys': expect.any(Object),
        }));
        expect(specification.body.paths).toHaveProperty('/services/public');
        expect(specification.body.paths).toHaveProperty('/appointments/{id}/review');
        expect(specification.body.paths['/admin/business-hours'].get.security).toEqual([
            { bearerAuth: [] },
        ]);
        expect(specification.body.paths['/admin/metrics'].get).toMatchObject({
            tags: ['Administration'],
            security: [{ bearerAuth: [] }],
            responses: expect.objectContaining({ 200: expect.any(Object), 403: expect.any(Object) }),
        });
        expect(specification.body.paths['/admin/metrics'].get.responses[200].content['application/json'].schema.properties.data.properties)
            .toHaveProperty('performance');
        expect(specification.body.components.securitySchemes.bearerAuth).toMatchObject({
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
        });
        expect(specification.body.components.securitySchemes.ApiKeyAuth).toMatchObject({
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
        });
        expect(specification.body.paths['/partner/services'].get.security).toEqual([{ ApiKeyAuth: [] }]);
        expect(specification.body.paths['/partner/services/{serviceId}/availability'].get.security).toEqual([{ ApiKeyAuth: [] }]);
        expect(specification.body.paths['/admin/reports/stream'].get.security).toEqual([{ bearerAuth: [] }]);
        expect(specification.body.paths['/admin/api-keys'].post.security).toEqual([{ bearerAuth: [] }]);
    });
});