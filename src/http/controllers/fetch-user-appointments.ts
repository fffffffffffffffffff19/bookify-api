import type { FastifyRequest, FastifyReply } from 'fastify';
import { makeFetchUserAppointmentsUseCase } from '../../use-cases/factories/make-fetch-user-appointments-use-case.js';

export async function fetchUserAppointments(request: FastifyRequest, reply: FastifyReply) {
    const fetchUserAppointmentsUseCase = makeFetchUserAppointmentsUseCase();

    const { appointments } = await fetchUserAppointmentsUseCase.execute({
        userId: request.user.sub,
    });

    return reply.status(200).send({
        appointments,
    });
}