import type { FastifyInstance } from 'fastify';
import { register } from '../controllers/register.js';
import { authenticate } from '../controllers/authenticate.js';
import { profile } from '../controllers/profile.js';
import { verifyJWT } from '../middlewares/verify-jwt.js';
import { updateProfile } from '../controllers/update-profile.js';
import { bearerSecurity, responses, schemas } from '../schemas/openapi.js';

export async function userRoutes(app: FastifyInstance) {
    app.post('/users', {
        config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
        schema: {
            tags: ['Authentication'],
            summary: 'Register a client account',
            body: schemas.registerBody,
            response: responses(201, 'Account registered'),
        },
    }, register);
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
        schema: {
            tags: ['Authentication'],
            summary: 'Authenticate and receive a JWT',
            body: schemas.authenticateBody,
            response: responses(200, 'Authentication successful'),
        },
    }, authenticate);

    app.get('/me', {
        onRequest: [verifyJWT],
        schema: {
            tags: ['Profile'],
            summary: 'Get the authenticated user profile',
            security: bearerSecurity,
            response: responses(200, 'Safe user profile'),
        },
    }, profile);
    app.patch('/me', {
        onRequest: [verifyJWT],
        schema: {
            tags: ['Profile'],
            summary: 'Update the authenticated user profile',
            security: bearerSecurity,
            body: schemas.updateProfileBody,
            response: responses(200, 'Updated safe user profile'),
        },
    }, updateProfile);
}