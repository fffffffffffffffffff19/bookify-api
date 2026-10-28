import { describe, expect, it } from 'vitest';
import type { AdminMetricsRepository } from '../../repositories/admin-metrics-repository.js';
import { FetchAdminMetricsUseCase } from './fetch-admin-metrics.js';

describe('Fetch Admin Metrics Use Case', () => {
    it('returns appointment totals, account counts, and performance rates', async () => {
        const repository: AdminMetricsRepository = {
            getAppointmentCountsByStatus: async () => ({
                PENDING: 2,
                CONFIRMED: 1,
                COMPLETED: 5,
                CANCELLED: 2,
            }),
            countUsersByRole: async (role) => role === 'CLIENT' ? 14 : 4,
        };

        const metrics = await new FetchAdminMetricsUseCase(repository).execute();

        expect(metrics).toEqual({
            appointments: {
                total: 10,
                pending: 2,
                confirmed: 1,
                completed: 5,
                cancelled: 2,
            },
            users: { clients: 14, providers: 4 },
            performance: { completionRate: 50, cancellationRate: 20 },
        });
    });

    it('returns zero rates when there are no appointments', async () => {
        const repository: AdminMetricsRepository = {
            getAppointmentCountsByStatus: async () => ({
                PENDING: 0,
                CONFIRMED: 0,
                COMPLETED: 0,
                CANCELLED: 0,
            }),
            countUsersByRole: async () => 0,
        };

        const metrics = await new FetchAdminMetricsUseCase(repository).execute();

        expect(metrics.performance).toEqual({ completionRate: 0, cancellationRate: 0 });
    });
});