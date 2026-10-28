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
import { bearerSecurity, errorResponses, responses, schemas } from '../schemas/openapi.js';

export async function appointmentsRoutes(app: FastifyInstance) {
    app.addHook('onRequest', verifyJWT);

    app.post('/appointments', {
        onRequest: [verifyUserRole('CLIENT')],
        schema: {
            tags: ['Appointments'],
            summary: 'Book a service appointment',
            security: bearerSecurity,
            body: schemas.createAppointmentBody,
            response: responses(201, 'Appointment booked'),
        },
    }, createAppointment);

    app.get('/appointments', {
        schema: {
            tags: ['Appointments'],
            summary: 'List the authenticated user appointments',
            security: bearerSecurity,
            querystring: schemas.appointmentListQuery,
            response: responses(200, 'Paginated user appointments'),
        },
    }, fetchUserAppointments);
    app.get('/admin/appointments', {
        onRequest: [verifyUserRole('ADMIN')],
        schema: {
            tags: ['Administration'],
            summary: 'List all appointments',
            security: bearerSecurity,
            querystring: schemas.appointmentListQuery,
            response: responses(200, 'Paginated appointments'),
        },
    }, fetchAdminAppointments);
    app.get(
        '/provider/appointments',
        {
            onRequest: [verifyUserRole(['PROVIDER', 'ADMIN'])],
            schema: {
                tags: ['Appointments'],
                summary: 'List appointments assigned to the provider',
                security: bearerSecurity,
                response: responses(200, 'Provider appointment schedule'),
            },
        },
        fetchProviderAppointments,
    );
    app.patch('/appointments/:id/cancel', {
        schema: {
            tags: ['Appointments'],
            summary: 'Cancel an appointment',
            security: bearerSecurity,
            params: schemas.idParams,
            response: { 204: { description: 'Appointment cancelled' }, ...errorResponses },
        },
    }, cancelAppointment);
    app.patch('/appointments/:id/reschedule', {
        schema: {
            tags: ['Appointments'],
            summary: 'Reschedule an appointment',
            security: bearerSecurity,
            params: schemas.idParams,
            body: schemas.rescheduleBody,
            response: responses(200, 'Appointment rescheduled'),
        },
    }, rescheduleAppointment);
    app.post('/appointments/:id/review', {
        schema: {
            tags: ['Reviews'],
            summary: 'Review a completed appointment',
            security: bearerSecurity,
            params: schemas.idParams,
            body: schemas.createReviewBody,
            response: responses(201, 'Review created'),
        },
    }, createReview);
    app.patch(
        '/appointments/:id/status',
        {
            schema: {
                tags: ['Appointments'],
                summary: 'Apply an allowed appointment status transition',
                security: bearerSecurity,
                params: schemas.idParams,
                body: schemas.statusBody,
                response: responses(200, 'Appointment status updated'),
            },
        },
        updateAppointmentStatus,
    );
}