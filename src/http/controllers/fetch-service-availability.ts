import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { cache, serviceAvailabilityCacheKey } from '../../lib/cache.js';
import { makeFetchServiceAvailabilityUseCase } from '../../use-cases/factories/make-fetch-service-availability-use-case.js';

export async function fetchServiceAvailability(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({ serviceId: z.string().uuid() });
    const querySchema = z.object({ date: z.string() });
    const { serviceId } = paramsSchema.parse(request.params);
    const { date } = querySchema.parse(request.query);
    const availableSlots = await cache.remember(
        serviceAvailabilityCacheKey(serviceId, date),
        env.SERVICE_AVAILABILITY_CACHE_TTL_SECONDS,
        async () => {
            const useCase = makeFetchServiceAvailabilityUseCase();
            return (await useCase.execute({ serviceId, date })).availableSlots;
        },
    );
    return reply.status(200).send({ availableSlots });
}