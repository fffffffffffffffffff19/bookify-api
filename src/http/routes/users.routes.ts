import type { FastifyInstance } from 'fastify';
import { register } from '../controllers/register.js';
import { authenticate } from '../controllers/authenticate.js';
import { profile } from '../controllers/profile.js';
import { verifyJWT } from '../middlewares/verify-jwt.js';
import { updateProfile } from '../controllers/update-profile.js';

export async function userRoutes(app: FastifyInstance) {
    app.post('/users', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, register);
    app.post('/sessions', {
        config: {
            rateLimit: {
                max: 5,
                timeWindow: '1 minute',
                hook: 'preHandler',
                keyGenerator: (request) => {
                    const body = request.body as { email?: unknown } | null;
                    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : 'unknown';
                    return `${request.ip}:${email}`;
                },
            },
        },
    }, authenticate);

    app.get('/me', { onRequest: [verifyJWT] }, profile);
    app.patch('/me', { onRequest: [verifyJWT] }, updateProfile);
}