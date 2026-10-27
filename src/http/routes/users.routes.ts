import type { FastifyInstance } from 'fastify';
import { register } from '../controllers/register.js';
import { authenticate } from '../controllers/authenticate.js';
import { profile } from '../controllers/profile.js';
import { verifyJWT } from '../middlewares/verify-jwt.js';

export async function userRoutes(app: FastifyInstance) {
    app.post('/users', register);
    app.post('/sessions', authenticate);

    app.get('/me', { onRequest: [verifyJWT] }, profile);
}