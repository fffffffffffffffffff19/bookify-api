import { AuditLogger } from '../../audit/audit-logger.js';
import { PrismaAuditLogsRepository } from '../../repositories/prisma/prisma-audit-logs-repository.js';

export function makeAuditLogger() {
    return new AuditLogger(new PrismaAuditLogsRepository());
}