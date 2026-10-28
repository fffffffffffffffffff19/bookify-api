import type { FastifyInstance } from 'fastify';
import { verifyJWT } from '../middlewares/verify-jwt.js';
import { verifyUserRole } from '../middlewares/verify-user-role.js';
import { createAppointment } from '../controllers/create-appointment.js';
import { fetchUserAppointments } from '../controllers/fetch-user-appointments.js';
import { fetchAdminAppointments } from '../controllers/fetch-admin-appointments.js';
import { cancelAppointment } from '../controllers/cancel-appointment.js';
import { updateAppointmentStatus } from '../controllers/update-appointment-status.js';
import { fetchProviderAppointments } from '../controllers/fetch-provider-appointments.js';
import { rescheduleAppointment } from '../controllers/reschedule-appointment.js';
import { createReview } from '../controllers/create-review.js';

export async function appointmentsRoutes(app: FastifyInstance) {
    app.addHook('onRequest', verifyJWT);

    app.post('/appointments', { onRequest: [verifyUserRole('CLIENT')] }, createAppointment);

    app.get('/appointments', fetchUserAppointments);
    app.get('/admin/appointments', { onRequest: [verifyUserRole('ADMIN')] }, fetchAdminAppointments);
    app.get(
        '/provider/appointments',
        { onRequest: [verifyUserRole(['PROVIDER', 'ADMIN'])] },
        fetchProviderAppointments,
    );
    app.patch('/appointments/:id/cancel', cancelAppointment);
    app.patch('/appointments/:id/reschedule', rescheduleAppointment);
    app.post('/appointments/:id/review', createReview);
    app.patch(
        '/appointments/:id/status',
        { onRequest: [verifyUserRole(['ADMIN', 'PROVIDER'])] },
        updateAppointmentStatus,
    );
}