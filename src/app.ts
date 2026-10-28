import fastify, { type FastifyServerOptions } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import Sentry from '@sentry/node';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { ApplicationError } from './errors/application-error.js';
import { userRoutes } from './http/routes/users.routes.js';
import { servicesRoutes } from './http/routes/services.routes.js';
import { appointmentsRoutes } from './http/routes/appointments.routes.js';
import { adminRoutes } from './http/routes/admin.routes.js';

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

    app.get('/health', async () => ({ status: 'ok' }));
    app.register(userRoutes);
    app.register(servicesRoutes);
    app.register(appointmentsRoutes);
    app.register(adminRoutes);

    app.addHook('onSend', async (_request, reply, payload) => {
        if (reply.statusCode === 204 || reply.statusCode >= 400 || payload == null) {
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
        if (error instanceof ZodError) {
            return reply
                .status(400)
                .send({
                    message: 'Validation error.',
                    errorCode: 'VALIDATION_ERROR',
                    issues: error.issues,
                });
        }

        if (
            ('statusCode' in error && error.statusCode === 429) ||
            ('code' in error && error.code === 'FST_ERR_RATE_LIMIT')
        ) {
            const rateLimitError = 'error' in error && typeof error.error === 'object' && error.error !== null
                ? error.error as { code?: string; message?: string }
                : undefined;
            return reply.status(429).send({
                error: {
                    code: rateLimitError?.code ?? 'TOO_MANY_REQUESTS',
                    message: rateLimitError?.message ?? error.message ?? 'Rate limit exceeded. Please try again later.',
                },
            });
        }

        if (error instanceof ApplicationError) {
            return reply.status(error.statusCode).send({
                message: error.message,
                errorCode: error.errorCode,
            });
        }

        if ('code' in error && error.code === 'P2002') {
            return reply.status(409).send({
                message: 'A resource with these values already exists.',
                errorCode: 'RESOURCE_CONFLICT',
            });
        }

        const statusCode = 'statusCode' in error && typeof error.statusCode === 'number'
            ? error.statusCode
            : 500;
        if (statusCode === 401) {
            return reply.status(401).send({
                message: 'Authentication required or token is invalid.',
                errorCode: 'UNAUTHORIZED',
            });
        }

        if (env.NODE_ENV !== 'production') {
            request.log.error(error);
        } else {
            Sentry.captureException(error);
        }

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