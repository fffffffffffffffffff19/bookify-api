import type { FastifyInstance } from 'fastify';
import { verifyJWT } from '../middlewares/verify-jwt.js';
import { verifyUserRole } from '../middlewares/verify-user-role.js';
import { fetchBusinessHours } from '../controllers/fetch-business-hours.js';
import { updateBusinessHours } from '../controllers/update-business-hours.js';

export async function adminRoutes(app: FastifyInstance) {
    app.addHook('onRequest', verifyJWT);
    app.addHook('onRequest', verifyUserRole('ADMIN'));

    app.get('/admin/business-hours', fetchBusinessHours);
    app.patch('/admin/business-hours', updateBusinessHours);
}