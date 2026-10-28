import type { FastifyRequest, FastifyReply } from 'fastify';
import { makeFetchUserAppointmentsUseCase } from '../../use-cases/factories/make-fetch-user-appointments-use-case.js';
import { appointmentListQuerySchema } from '../schemas/appointment-list-query.js';

export async function fetchUserAppointments(request: FastifyRequest, reply: FastifyReply) {
    const filters = appointmentListQuerySchema.parse(request.query);
    const fetchUserAppointmentsUseCase = makeFetchUserAppointmentsUseCase();

    const { appointments, pagination } = await fetchUserAppointmentsUseCase.execute({
        userId: request.user.sub,
        filters,
    });

    return reply.status(200).send({
        appointments,
        pagination,
    });
}