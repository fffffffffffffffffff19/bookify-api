import type { FastifyInstance } from 'fastify';
import { verifyJWT } from '../middlewares/verify-jwt.js';
import { createAppointment } from '../controllers/create-appointment.js';

export async function appointmentsRoutes(app: FastifyInstance) {
    app.addHook('onRequest', verifyJWT);

    app.post('/appointments', createAppointment);
}