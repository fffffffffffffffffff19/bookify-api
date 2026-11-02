import { prisma } from '../../lib/prisma.js';
import type { AuditLogsRepository, CreateAuditLogInput, ListAuditLogsInput } from '../audit-logs-repository.js';

export class PrismaAuditLogsRepository implements AuditLogsRepository {
    async create(input: CreateAuditLogInput) {
        return prisma.auditLog.create({
            data: {
                actorId: input.actorId,
                actorRole: input.actorRole,
                action: input.action,
                targetEntity: input.targetEntity,
                targetId: input.targetId,
                payload: input.payload ?? {},
                ipAddress: input.ipAddress,
                userAgent: input.userAgent,
            },
        });
    }

    async list(input: ListAuditLogsInput) {
        const where = {
            ...(input.action ? { action: input.action } : {}),
            ...(input.actorId ? { actorId: input.actorId } : {}),
            ...(input.from || input.to ? {
                createdAt: {
                    ...(input.from ? { gte: input.from } : {}),
                    ...(input.to ? { lte: input.to } : {}),
                },
            } : {}),
        };
        const [logs, total] = await prisma.$transaction([
            prisma.auditLog.findMany({
                where,
                skip: input.skip,
                take: input.take,
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            }),
            prisma.auditLog.count({ where }),
        ]);

        return { logs, total };
    }
}