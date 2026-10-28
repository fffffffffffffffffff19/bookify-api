import type { FastifyReply, FastifyRequest } from 'fastify';
import { makeFetchProviderAppointmentsUseCase } from '../../use-cases/factories/make-fetch-provider-appointments-use-case.js';

export async function fetchProviderAppointments(request: FastifyRequest, reply: FastifyReply) {
    const useCase = makeFetchProviderAppointmentsUseCase();
    const { appointments } = await useCase.execute({ providerId: request.user.sub });

    return reply.status(200).send({ appointments });
}