import type { FastifyInstance } from 'fastify';
import { verifyJWT } from '../middlewares/verify-jwt.js';
import { createService } from '../controllers/create-service.js';
import { fetchUserServices } from '../controllers/fetch-user-services.js';

export async function servicesRoutes(app: FastifyInstance) {
    app.addHook('onRequest', verifyJWT);

    app.post('/services', createService);
    app.get('/services', fetchUserServices);
}