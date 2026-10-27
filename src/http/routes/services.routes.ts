import type { FastifyInstance } from 'fastify';
import { verifyJWT } from '../middlewares/verify-jwt.js';
import { createService } from '../controllers/create-service.js';
import { fetchUserServices } from '../controllers/fetch-user-services.js';
import { updateService } from '../controllers/update-service.js';
import { deleteService } from '../controllers/delete-service.js';

export async function servicesRoutes(app: FastifyInstance) {
    app.addHook('onRequest', verifyJWT);

    app.post('/services', createService);
    app.get('/services', fetchUserServices);
    app.put('/services/:id', updateService);
    app.delete('/services/:id', deleteService);
}