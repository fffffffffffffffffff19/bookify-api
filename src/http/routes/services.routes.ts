import type { FastifyInstance } from 'fastify';
import { createService } from '../controllers/create-service.js';
import { verifyJWT } from '../middlewares/verify-jwt.js';

export async function servicesRoutes(app: FastifyInstance) {
    app.addHook('onRequest', verifyJWT);

    app.post('/services', createService);
}