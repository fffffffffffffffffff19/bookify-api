import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { auditActions } from '../../audit/audit-logger.js';
import { auditRequestContext } from '../../audit/audit-request-context.js';
import { makeAuditLogger } from '../../use-cases/factories/make-audit-logger.js';
import { makeFetchBusinessHoursUseCase } from '../../use-cases/factories/make-fetch-business-hours-use-case.js';
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
    const before = await makeFetchBusinessHoursUseCase().execute();
    const useCase = makeUpdateBusinessHoursUseCase();
    const businessHours = await useCase.execute(settings);
    await makeAuditLogger().log({
        ...auditRequestContext(request),
        action: auditActions.businessHoursUpdated,
        targetEntity: 'BUSINESS_HOURS',
        targetId: 'global',
        payload: { before, after: businessHours },
    });

    return reply.status(200).send(businessHours);
}