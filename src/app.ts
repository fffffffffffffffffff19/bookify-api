import fastify, { type FastifyServerOptions } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import Sentry from '@sentry/node';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { userRoutes } from './http/routes/users.routes.js';
import { servicesRoutes } from './http/routes/services.routes.js';
import { appointmentsRoutes } from './http/routes/appointments.routes.js';
import { adminRoutes } from './http/routes/admin.routes.js';

export function buildApp(options: FastifyServerOptions = {}) {
    const app = fastify(options);

    app.register(fastifyJwt, {
        secret: env.JWT_SECRET,
    });

    app.get('/health', async () => ({ status: 'ok' }));
    app.register(userRoutes);
    app.register(servicesRoutes);
    app.register(appointmentsRoutes);
    app.register(adminRoutes);

    app.setErrorHandler((error, request, reply) => {
        if (error instanceof ZodError) {
            return reply
                .status(400)
                .send({ message: 'Validation error.', issues: error.format() });
        }

        if (env.NODE_ENV !== 'production') {
            request.log.error(error);
        } else {
            Sentry.captureException(error);
        }

        return reply.status(500).send({ message: 'Internal server error.' });
    });

    return app;
}

export const app = buildApp();