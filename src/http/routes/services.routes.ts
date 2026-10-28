import type { FastifyInstance } from 'fastify';
import { verifyJWT } from '../middlewares/verify-jwt.js';
import { verifyUserRole } from '../middlewares/verify-user-role.js';
import { createService } from '../controllers/create-service.js';
import { fetchUserServices } from '../controllers/fetch-user-services.js';
import { updateService } from '../controllers/update-service.js';
import { deleteService } from '../controllers/delete-service.js';
import { fetchServiceAvailability } from '../controllers/fetch-service-availability.js';
import { fetchPublicServiceCatalog } from '../controllers/fetch-public-service-catalog.js';

export async function servicesRoutes(app: FastifyInstance) {
    app.get('/services/public', fetchPublicServiceCatalog);
    app.get('/services', { onRequest: [verifyJWT] }, fetchUserServices);
    app.get('/services/:serviceId/availability', fetchServiceAvailability);

    app.register(async (providerRoutes) => {
        providerRoutes.addHook('onRequest', verifyJWT);
        providerRoutes.addHook('onRequest', verifyUserRole('PROVIDER'));

        providerRoutes.post('/services', createService);
        providerRoutes.put('/services/:id', updateService);
        providerRoutes.delete('/services/:id', deleteService);
    });
}