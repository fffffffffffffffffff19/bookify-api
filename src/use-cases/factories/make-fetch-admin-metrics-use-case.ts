import { PrismaAdminMetricsRepository } from '../../repositories/prisma/prisma-admin-metrics-repository.js';
import { FetchAdminMetricsUseCase } from '../administration/fetch-admin-metrics.js';

export function makeFetchAdminMetricsUseCase() {
    return new FetchAdminMetricsUseCase(new PrismaAdminMetricsRepository());
}