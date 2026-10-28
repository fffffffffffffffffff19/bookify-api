import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { makeFetchServiceAvailabilityUseCase } from '../../use-cases/factories/make-fetch-service-availability-use-case.js';

export async function fetchServiceAvailability(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({ serviceId: z.string().uuid() });
    const querySchema = z.object({ date: z.string() });
    const { serviceId } = paramsSchema.parse(request.params);
    const { date } = querySchema.parse(request.query);
    const useCase = makeFetchServiceAvailabilityUseCase();

    const { availableSlots } = await useCase.execute({ serviceId, date });
    return reply.status(200).send({ availableSlots });
}