import fastify, { type FastifyServerOptions } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { ApplicationError } from './errors/application-error.js';
import { userRoutes } from './http/routes/users.routes.js';
import { servicesRoutes } from './http/routes/services.routes.js';
import { appointmentsRoutes } from './http/routes/appointments.routes.js';
import { adminRoutes } from './http/routes/admin.routes.js';
import { transformOpenApiRoute } from './http/schemas/openapi.js';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function buildApp(options: FastifyServerOptions = {}) {
    const app = fastify(options);

    app.register(fastifyJwt, {
        secret: env.JWT_SECRET,
    });

    app.register(rateLimit, {
        global: true,
        max: 100,
        timeWindow: '1 minute',
        errorResponseBuilder: (_request, context) => ({
            statusCode: 429,
            error: {
                code: 'TOO_MANY_REQUESTS',
                message: `Rate limit exceeded. Retry in ${context.after}.`,
            },
        }),
    });

    app.register(swagger, {
        openapi: {
            openapi: '3.0.3',
            info: {
                title: 'Bookify API',
                version: '1.0.0',
                description: 'Service discovery, appointment booking, provider operations, reviews, and administration.',
            },
            servers: [{ url: '/', description: 'Current server' }],
            tags: [
                { name: 'Authentication', description: 'Registration and login' },
                { name: 'Profile', description: 'Authenticated user profile' },
                { name: 'Services', description: 'Service catalog and provider service management' },
                { name: 'Appointments', description: 'Booking and appointment lifecycle' },
                { name: 'Reviews', description: 'Ratings for completed appointments' },
                { name: 'Administration', description: 'Administrative operations' },
                { name: 'Health', description: 'Service health check' },
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                        description: 'JWT returned by POST /sessions.',
                    },
                },
            },
        },
        transform: transformOpenApiRoute,
    });
    app.register(async (healthRoutes) => {
        healthRoutes.get('/health', {
            schema: {
                tags: ['Health'],
                summary: 'Check API health',
                response: { 200: { description: 'API is healthy', type: 'object' } },
            },
        }, async () => ({ status: 'ok' }));
    });
    app.register(userRoutes);
    app.register(servicesRoutes);
    app.register(appointmentsRoutes);
    app.register(adminRoutes);

    app.register(swaggerUi, {
        routePrefix: '/docs',
        uiConfig: {
            docExpansion: 'list',
            deepLinking: true,
        },
        staticCSP: true,
    });

    app.addHook('onSend', async (request, reply, payload) => {
        if (
            request.url.startsWith('/docs') ||
            reply.statusCode === 204 ||
            reply.statusCode >= 400 ||
            payload == null
        ) {
            return payload;
        }

        const serialized = Buffer.isBuffer(payload)
            ? payload.toString('utf8')
            : typeof payload === 'string'
                ? payload
                : undefined;

        if (serialized === undefined) {
            return payload;
        }

        try {
            const body: unknown = JSON.parse(serialized);
            if (typeof body === 'object' && body !== null && 'data' in body) {
                return serialized;
            }
            return JSON.stringify({ data: body });
        } catch {
            return payload;
        }
    });

    app.setErrorHandler((error, request, reply) => {
        const errorRecord = isRecord(error) ? error : {};

        if (error instanceof ZodError) {
            return reply
                .status(400)
                .send({
                    message: 'Validation error.',
                    errorCode: 'VALIDATION_ERROR',
                    issues: error.issues,
                });
        }

        if (errorRecord.code === 'FST_ERR_VALIDATION') {
            return reply.status(400).send({
                message: 'Validation error.',
                errorCode: 'VALIDATION_ERROR',
                issues: Array.isArray(errorRecord.validation)
                    ? errorRecord.validation
                    : [],
            });
        }

        if (
            errorRecord.statusCode === 429 ||
            errorRecord.code === 'FST_ERR_RATE_LIMIT'
        ) {
            const rateLimitError = isRecord(errorRecord.error) ? errorRecord.error : {};
            return reply.status(429).send({
                error: {
                    code: typeof rateLimitError.code === 'string' ? rateLimitError.code : 'TOO_MANY_REQUESTS',
                    message: typeof rateLimitError.message === 'string'
                        ? rateLimitError.message
                        : typeof errorRecord.message === 'string'
                            ? errorRecord.message
                            : 'Rate limit exceeded. Please try again later.',
                },
            });
        }

        if (error instanceof ApplicationError) {
            return reply.status(error.statusCode).send({
                message: error.message,
                errorCode: error.errorCode,
            });
        }

        if (errorRecord.code === 'P2002') {
            return reply.status(409).send({
                message: 'A resource with these values already exists.',
                errorCode: 'RESOURCE_CONFLICT',
            });
        }

        const statusCode = typeof errorRecord.statusCode === 'number'
            ? errorRecord.statusCode
            : 500;
        if (statusCode === 401) {
            return reply.status(401).send({
                message: 'Authentication required or token is invalid.',
                errorCode: 'UNAUTHORIZED',
            });
        }

        request.log.error(error);

        return reply.status(500).send({
            message: 'Internal server error.',
            errorCode: 'INTERNAL_SERVER_ERROR',
        });
    });

    app.setNotFoundHandler((_request, reply) => {
        return reply.status(404).send({
            message: 'Route not found.',
            errorCode: 'ROUTE_NOT_FOUND',
        });
    });

    return app;
}

export const app = buildApp();