import type { FastifyInstance } from 'fastify';
import { verifyJWT } from '../middlewares/verify-jwt.js';
import { verifyUserRole } from '../middlewares/verify-user-role.js';
import { createAppointment } from '../controllers/create-appointment.js';
import { fetchUserAppointments } from '../controllers/fetch-user-appointments.js';
import { cancelAppointment } from '../controllers/cancel-appointment.js';

export async function appointmentsRoutes(app: FastifyInstance) {
    app.addHook('onRequest', verifyJWT);

    app.post('/appointments', { onRequest: [verifyUserRole('CLIENT')] }, createAppointment);

    app.get('/appointments', fetchUserAppointments);
    app.patch('/appointments/:id/cancel', cancelAppointment);
}