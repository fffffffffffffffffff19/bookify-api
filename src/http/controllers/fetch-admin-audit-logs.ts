import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { makeAuditLogger } from '../../use-cases/factories/make-audit-logger.js';

const auditLogsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
    action: z.string().min(1).optional(),
    actorId: z.string().min(1).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
}).refine((query) => query.from === undefined || query.to === undefined || query.from <= query.to, {
    message: 'from must be earlier than or equal to to.',
    path: ['to'],
});

export async function fetchAdminAuditLogs(request: FastifyRequest, reply: FastifyReply) {
    const query = auditLogsQuerySchema.parse(request.query);
    const auditLogger = makeAuditLogger();
    const result = await auditLogger.list({
        page: query.page,
        perPage: query.perPage,
        ...(query.action ? { action: query.action } : {}),
        ...(query.actorId ? { actorId: query.actorId } : {}),
        ...(query.from ? { from: query.from } : {}),
        ...(query.to ? { to: query.to } : {}),
    });

    return reply.status(200).send(result);
}