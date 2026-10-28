import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { makeUpdateBusinessHoursUseCase } from '../../use-cases/factories/make-update-business-hours-use-case.js';

const updateBusinessHoursBodySchema = z.object({
    allowedDays: z.array(z.number().int().min(0).max(6)).refine(
        (days) => new Set(days).size === days.length,
        'Allowed days must not contain duplicates.',
    ),
    openHour: z.number().int().min(0).max(23),
    closeHour: z.number().int().min(0).max(23),
}).refine((settings) => settings.closeHour > settings.openHour, {
    message: 'closeHour must be greater than openHour.',
    path: ['closeHour'],
});

export async function updateBusinessHours(request: FastifyRequest, reply: FastifyReply) {
    const settings = updateBusinessHoursBodySchema.parse(request.body);
    const useCase = makeUpdateBusinessHoursUseCase();
    const businessHours = await useCase.execute(settings);

    return reply.status(200).send(businessHours);
}