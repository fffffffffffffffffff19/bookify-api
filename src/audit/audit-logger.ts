import type { Prisma } from '@prisma/client';
import type { AuditLogsRepository } from '../repositories/audit-logs-repository.js';

export interface AuditLogListQuery {
    page: number;
    perPage: number;
    action?: string;
    actorId?: string;
    from?: Date;
    to?: Date;
}

export const auditActions = {
    userProfileUpdated: 'USER_PROFILE_UPDATED',
    userRoleUpdated: 'USER_ROLE_UPDATED',
    businessHoursUpdated: 'BUSINESS_HOURS_UPDATED',
    sessionRevoked: 'SESSION_REVOKED',
} as const;

export type AuditAction = typeof auditActions[keyof typeof auditActions];

export interface WriteAuditLogInput {
    actorId: string;
    actorRole: string;
    action: AuditAction;
    targetEntity: string;
    targetId?: string | null;
    payload?: Prisma.InputJsonValue;
    ipAddress?: string | null;
    userAgent?: string | null;
}

export class AuditLogger {
    constructor(private readonly auditLogsRepository: AuditLogsRepository) { }

    async log(input: WriteAuditLogInput) {
        return this.auditLogsRepository.create(input);
    }

    async list(input: AuditLogListQuery) {
        const { logs, total } = await this.auditLogsRepository.list({
            ...(input.action ? { action: input.action } : {}),
            ...(input.actorId ? { actorId: input.actorId } : {}),
            ...(input.from ? { from: input.from } : {}),
            ...(input.to ? { to: input.to } : {}),
            skip: (input.page - 1) * input.perPage,
            take: input.perPage,
        });

        return {
            logs,
            pagination: {
                page: input.page,
                perPage: input.perPage,
                total,
                totalPages: Math.ceil(total / input.perPage),
            },
        };
    }
}