import type { FastifyRequest, FastifyReply } from 'fastify';
import { makeFetchUserAppointmentsUseCase } from '../../use-cases/factories/make-fetch-user-appointments-use-case.js';
import { appointmentListQuerySchema } from '../schemas/appointment-list-query.js';

export async function fetchUserAppointments(request: FastifyRequest, reply: FastifyReply) {
    const parsedFilters = appointmentListQuerySchema.parse(request.query);
    const filters = {
        page: parsedFilters.page,
        perPage: parsedFilters.perPage,
        ...(parsedFilters.status !== undefined ? { status: parsedFilters.status } : {}),
        ...(parsedFilters.from !== undefined ? { from: parsedFilters.from } : {}),
        ...(parsedFilters.to !== undefined ? { to: parsedFilters.to } : {}),
    };
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