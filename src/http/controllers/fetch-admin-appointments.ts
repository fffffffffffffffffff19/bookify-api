import type { FastifyReply, FastifyRequest } from 'fastify';
import { makeFetchAdminAppointmentsUseCase } from '../../use-cases/factories/make-fetch-admin-appointments-use-case.js';
import { appointmentListQuerySchema } from '../schemas/appointment-list-query.js';

export async function fetchAdminAppointments(request: FastifyRequest, reply: FastifyReply) {
    const filters = appointmentListQuerySchema.parse(request.query);
    const fetchAdminAppointmentsUseCase = makeFetchAdminAppointmentsUseCase();
    const { appointments, pagination } = await fetchAdminAppointmentsUseCase.execute({ filters });

    return reply.status(200).send({ appointments, pagination });
}
