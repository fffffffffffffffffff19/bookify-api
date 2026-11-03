import type { FastifyInstance } from 'fastify';
import { verifyJWT } from '../middlewares/verify-jwt.js';
import { verifyUserRole } from '../middlewares/verify-user-role.js';
import { fetchBusinessHours } from '../controllers/fetch-business-hours.js';
import { updateBusinessHours } from '../controllers/update-business-hours.js';
import { fetchAdminMetrics } from '../controllers/fetch-admin-metrics.js';
import { fetchAdminAuditLogs } from '../controllers/fetch-admin-audit-logs.js';
import { streamAdminReport } from '../controllers/stream-admin-report.js';
import { createApiKey } from '../controllers/create-api-key.js';
import { revokeApiKey } from '../controllers/revoke-api-key.js';
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

    app.post('/admin/api-keys', {
        schema: {
            tags: ['Administration'],
            summary: 'Create a scoped partner API key',
            security: bearerSecurity,
            body: schemas.createApiKeyBody,
            response: { 201: { description: 'API key secret, shown once', type: 'object', additionalProperties: true }, ...errorResponses },
        },
    }, createApiKey);
    app.delete('/admin/api-keys/:id', {
        schema: {
            tags: ['Administration'],
            summary: 'Revoke an API key',
            security: bearerSecurity,
            params: schemas.idParams,
            response: { 204: { description: 'API key revoked' }, ...errorResponses },
        },
    }, revokeApiKey);

    app.get('/admin/reports/stream', {
        schema: {
            tags: ['Administration'],
            summary: 'Stream all appointments as CSV',
            security: bearerSecurity,
            response: {
                200: { description: 'CSV appointment export', type: 'string', format: 'binary' },
                ...errorResponses,
            },
        },
    }, streamAdminReport);

    app.get('/admin/audit-logs', {
        schema: {
            tags: ['Administration'],
            summary: 'List audit logs',
            security: bearerSecurity,
            querystring: schemas.auditLogsQuery,
            response: {
                200: { description: 'Paginated audit trail', ...schemas.auditLogs },
                ...errorResponses,
            },
        },
    }, fetchAdminAuditLogs);

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