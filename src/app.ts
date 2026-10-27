import fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import Sentry from '@sentry/node';
import { ZodError } from 'zod';
import { userRoutes } from './http/routes/users.routes.js';
import { servicesRoutes } from './http/routes/services.routes.js';
import { appointmentsRoutes } from './http/routes/appointments.routes.js';

export const app = fastify();

app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'bookify-super-secret-key',
});

app.register(userRoutes);
app.register(servicesRoutes);
app.register(appointmentsRoutes);

app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
        return reply
            .status(400)
            .send({ message: 'Validation error.', issues: error.format() });
    }

    if (process.env.NODE_ENV !== 'production') {
        console.error(error);
    } else {
        Sentry.captureException(error);
    }

    return reply.status(500).send({ message: 'Internal server error.' });
});