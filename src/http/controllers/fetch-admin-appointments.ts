import type { FastifyReply, FastifyRequest } from 'fastify';
import { makeFetchAdminAppointmentsUseCase } from '../../use-cases/factories/make-fetch-admin-appointments-use-case.js';

export async function fetchAdminAppointments(_request: FastifyRequest, reply: FastifyReply) {
    const fetchAdminAppointmentsUseCase = makeFetchAdminAppointmentsUseCase();
    const { appointments } = await fetchAdminAppointmentsUseCase.execute();

    return reply.status(200).send({ appointments });
}
