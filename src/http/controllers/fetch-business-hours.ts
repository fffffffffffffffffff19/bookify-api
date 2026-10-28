import type { FastifyReply, FastifyRequest } from 'fastify';
import { makeFetchBusinessHoursUseCase } from '../../use-cases/factories/make-fetch-business-hours-use-case.js';

export async function fetchBusinessHours(_request: FastifyRequest, reply: FastifyReply) {
    const useCase = makeFetchBusinessHoursUseCase();
    const businessHours = await useCase.execute();

    return reply.status(200).send(businessHours);
}