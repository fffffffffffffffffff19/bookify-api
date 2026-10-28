import type { FastifyInstance } from 'fastify';
import { verifyJWT } from '../middlewares/verify-jwt.js';
import { verifyUserRole } from '../middlewares/verify-user-role.js';
import { fetchBusinessHours } from '../controllers/fetch-business-hours.js';
import { updateBusinessHours } from '../controllers/update-business-hours.js';
import { fetchAdminMetrics } from '../controllers/fetch-admin-metrics.js';
import { bearerSecurity, errorResponses, responses, schemas } from '../schemas/openapi.js';

export async function adminRoutes(app: FastifyInstance) {
    app.addHook('onRequest', verifyJWT);
    app.addHook('onRequest', verifyUserRole('ADMIN'));

    app.get('/admin/metrics', {
        schema: {
            tags: ['Administration'],
            summary: 'Get system metrics',
            security: bearerSecurity,
            response: {
                200: { description: 'System metrics', ...schemas.adminMetrics },
                ...errorResponses,
            },
        },
    }, fetchAdminMetrics);

    app.get('/admin/business-hours', {
        schema: {
            tags: ['Administration'],
            summary: 'Get global business hours',
            security: bearerSecurity,
            response: responses(200, 'Current business hours'),
        },
    }, fetchBusinessHours);
    app.patch('/admin/business-hours', {
        schema: {
            tags: ['Administration'],
            summary: 'Update global business hours',
            security: bearerSecurity,
            body: schemas.createBusinessHoursBody,
            response: responses(200, 'Updated business hours'),
        },
    }, updateBusinessHours);
}