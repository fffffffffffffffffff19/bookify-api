import { describe, expect, it } from 'vitest';
import { AuditLogger, auditActions } from '../../audit/audit-logger.js';
import type { AuditLogsRepository, CreateAuditLogInput, ListAuditLogsInput } from '../../repositories/audit-logs-repository.js';

describe('Audit Logger', () => {
    it('appends entries through a repository with no mutation operations', async () => {
        const writes: CreateAuditLogInput[] = [];
        const repository: AuditLogsRepository = {
            create: async (input) => {
                writes.push(input);
                return {} as never;
            },
            list: async () => ({ logs: [], total: 0 }),
        };
        const logger = new AuditLogger(repository);
        const entry: CreateAuditLogInput = {
            actorId: 'actor-1',
            actorRole: 'ADMIN',
            action: auditActions.businessHoursUpdated,
            targetEntity: 'BUSINESS_HOURS',
            targetId: 'global',
            payload: { before: { openHour: 8 }, after: { openHour: 9 } },
        };

        await logger.log({ ...entry, action: auditActions.businessHoursUpdated });

        expect(writes).toEqual([entry]);
        expect(Object.keys(repository).sort()).toEqual(['create', 'list']);
    });

    it('converts page parameters into repository offsets and returns pagination metadata', async () => {
        let query: ListAuditLogsInput | undefined;
        const repository: AuditLogsRepository = {
            create: async () => ({} as never),
            list: async (input) => {
                query = input;
                return { logs: [], total: 23 };
            },
        };

        const result = await new AuditLogger(repository).list({
            page: 3,
            perPage: 10,
            action: 'SESSION_REVOKED',
            actorId: 'actor-1',
            from: new Date('2026-11-01T00:00:00.000Z'),
            to: new Date('2026-11-02T00:00:00.000Z'),
        });

        expect(query).toMatchObject({ action: 'SESSION_REVOKED', actorId: 'actor-1', skip: 20, take: 10 });
        expect(result.pagination).toEqual({ page: 3, perPage: 10, total: 23, totalPages: 3 });
    });
});