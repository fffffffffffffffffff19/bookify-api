import type { AuditLog, Prisma } from '@prisma/client';

export interface CreateAuditLogInput {
    actorId: string;
    actorRole: string;
    action: string;
    targetEntity: string;
    targetId?: string | null;
    payload?: Prisma.InputJsonValue;
    ipAddress?: string | null;
    userAgent?: string | null;
}

export interface ListAuditLogsInput {
    action?: string;
    actorId?: string;
    from?: Date;
    to?: Date;
    skip: number;
    take: number;
}

export interface AuditLogsRepository {
    create(input: CreateAuditLogInput): Promise<AuditLog>;
    list(input: ListAuditLogsInput): Promise<{ logs: AuditLog[]; total: number }>;
}