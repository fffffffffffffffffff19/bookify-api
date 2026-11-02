import type { FastifyInstance } from 'fastify';
import { register } from '../controllers/register.js';
import { authenticate } from '../controllers/authenticate.js';
import { profile } from '../controllers/profile.js';
import { verifyJWT } from '../middlewares/verify-jwt.js';
import { updateProfile } from '../controllers/update-profile.js';
import { uploadAvatar } from '../controllers/upload-image.js';
import {
    deleteAllSessions,
    deleteSession,
    getSessions,
    logout,
    refreshSession,
} from '../controllers/auth-session.js';
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
            summary: 'Authenticate and receive an access token and refresh cookie',
            body: schemas.authenticateBody,
            response: responses(200, 'Authentication successful'),
        },
    }, authenticate);
    app.post('/auth/refresh', {
        config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
        schema: {
            tags: ['Authentication'],
            summary: 'Rotate the refresh token and issue a new access token',
            response: responses(200, 'Tokens refreshed'),
        },
    }, refreshSession);
    app.post('/auth/logout', {
        schema: {
            tags: ['Authentication'],
            summary: 'Revoke the current refresh session',
            response: responses(204, 'Session revoked'),
        },
    }, logout);
    app.get('/auth/sessions', {
        onRequest: [verifyJWT],
        schema: {
            tags: ['Authentication'],
            summary: 'List active sessions for the authenticated user',
            security: bearerSecurity,
            response: responses(200, 'Active sessions'),
        },
    }, getSessions);
    app.delete('/auth/sessions/all', {
        onRequest: [verifyJWT],
        schema: {
            tags: ['Authentication'],
            summary: 'Revoke all active sessions for the authenticated user',
            security: bearerSecurity,
            response: responses(204, 'Sessions revoked'),
        },
    }, deleteAllSessions);
    app.delete('/auth/sessions/:sessionId', {
        onRequest: [verifyJWT],
        schema: {
            tags: ['Authentication'],
            summary: 'Revoke one session for the authenticated user',
            security: bearerSecurity,
            params: schemas.sessionIdParams,
            response: responses(204, 'Session revoked'),
        },
    }, deleteSession);

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
    app.patch('/me/avatar', {
        onRequest: [verifyJWT],
        schema: {
            tags: ['Profile'],
            summary: 'Upload the authenticated user avatar',
            security: bearerSecurity,
            response: responses(200, 'Avatar updated'),
        },
    }, uploadAvatar);
}