import type { FastifyInstance } from 'fastify';
import { verifyJWT } from '../middlewares/verify-jwt.js';
import { verifyUserRole } from '../middlewares/verify-user-role.js';
import { createService } from '../controllers/create-service.js';
import { fetchUserServices } from '../controllers/fetch-user-services.js';
import { updateService } from '../controllers/update-service.js';
import { deleteService } from '../controllers/delete-service.js';
import { fetchServiceAvailability } from '../controllers/fetch-service-availability.js';
import { fetchPublicServiceCatalog } from '../controllers/fetch-public-service-catalog.js';
import { bearerSecurity, errorResponses, responses, schemas } from '../schemas/openapi.js';

export async function servicesRoutes(app: FastifyInstance) {
    app.get('/services/public', {
        schema: {
            tags: ['Services'],
            summary: 'Browse the public service catalog',
            response: responses(200, 'Services with provider summaries'),
        },
    }, fetchPublicServiceCatalog);
    app.get('/services', {
        onRequest: [verifyJWT],
        schema: {
            tags: ['Services'],
            summary: 'List services owned by the authenticated provider',
            security: bearerSecurity,
            response: responses(200, 'Provider services'),
        },
    }, fetchUserServices);
    app.get('/services/:serviceId/availability', {
        schema: {
            tags: ['Services'],
            summary: 'Get available time slots for a service and date',
            params: schemas.serviceIdParams,
            querystring: schemas.availabilityQuery,
            response: responses(200, 'Available start times'),
        },
    }, fetchServiceAvailability);

    app.register(async (providerRoutes) => {
        providerRoutes.addHook('onRequest', verifyJWT);
        providerRoutes.addHook('onRequest', verifyUserRole('PROVIDER'));

        providerRoutes.post('/services', {
            schema: {
                tags: ['Services'],
                summary: 'Create a service',
                security: bearerSecurity,
                body: schemas.createServiceBody,
                response: responses(201, 'Service created'),
            },
        }, createService);
        providerRoutes.put('/services/:id', {
            schema: {
                tags: ['Services'],
                summary: 'Update an owned service',
                security: bearerSecurity,
                params: schemas.idParams,
                body: schemas.updateServiceBody,
                response: responses(200, 'Service updated'),
            },
        }, updateService);
        providerRoutes.delete('/services/:id', {
            schema: {
                tags: ['Services'],
                summary: 'Delete an owned service',
                security: bearerSecurity,
                params: schemas.idParams,
                response: { 204: { description: 'Service deleted' }, ...errorResponses },
            },
        }, deleteService);
    });
}