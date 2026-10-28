import type { FastifyReply, FastifyRequest } from 'fastify';
import { makeFetchAdminMetricsUseCase } from '../../use-cases/factories/make-fetch-admin-metrics-use-case.js';

export async function fetchAdminMetrics(_request: FastifyRequest, reply: FastifyReply) {
    const fetchAdminMetricsUseCase = makeFetchAdminMetricsUseCase();
    const metrics = await fetchAdminMetricsUseCase.execute();

    return reply.status(200).send(metrics);
}