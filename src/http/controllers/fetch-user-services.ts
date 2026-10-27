import type { FastifyRequest, FastifyReply } from 'fastify';
import { makeFetchUserServicesUseCase } from '../../use-cases/factories/make-fetch-user-services-use-case.js';

export async function fetchUserServices(request: FastifyRequest, reply: FastifyReply) {
    const fetchUserServicesUseCase = makeFetchUserServicesUseCase();

    const { services } = await fetchUserServicesUseCase.execute({
        userId: request.user.sub,
    });

    return reply.status(200).send({
        services,
    });
}