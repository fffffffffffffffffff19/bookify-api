import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../../config/env.js';
import { cache, serviceCatalogCacheKey } from '../../lib/cache.js';
import { makeFetchPublicServiceCatalogUseCase } from '../../use-cases/factories/make-fetch-public-service-catalog-use-case.js';

export async function fetchPublicServiceCatalog(_request: FastifyRequest, reply: FastifyReply) {
    const services = await cache.remember(
        serviceCatalogCacheKey,
        env.SERVICE_CATALOG_CACHE_TTL_SECONDS,
        async () => {
            const useCase = makeFetchPublicServiceCatalogUseCase();
            return (await useCase.execute()).services;
        },
    );

    return reply.status(200).send({ services });
}