import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { makeFetchServiceAvailabilityUseCase } from '../../use-cases/factories/make-fetch-service-availability-use-case.js';
import {
    InvalidAvailabilityDateError,
    ServiceNotFoundError,
} from '../../use-cases/appointments/fetch-service-availability.js';

export async function fetchServiceAvailability(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({ serviceId: z.string().uuid() });
    const querySchema = z.object({ date: z.string() });
    const { serviceId } = paramsSchema.parse(request.params);
    const { date } = querySchema.parse(request.query);
    const useCase = makeFetchServiceAvailabilityUseCase();

    try {
        const { availableSlots } = await useCase.execute({ serviceId, date });
        return reply.status(200).send({ availableSlots });
    } catch (error) {
        if (error instanceof ServiceNotFoundError) {
            return reply.status(404).send({ message: error.message });
        }

        if (error instanceof InvalidAvailabilityDateError) {
            return reply.status(400).send({ message: error.message });
        }

        throw error;
    }
}