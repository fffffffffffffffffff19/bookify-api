import type { FastifyReply, FastifyRequest } from 'fastify';
import { makeFetchPublicServiceCatalogUseCase } from '../../use-cases/factories/make-fetch-public-service-catalog-use-case.js';

export async function fetchPublicServiceCatalog(_request: FastifyRequest, reply: FastifyReply) {
    const useCase = makeFetchPublicServiceCatalogUseCase();
    const { services } = await useCase.execute();

    return reply.status(200).send({ services });
}