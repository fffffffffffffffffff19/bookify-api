import type { FastifyReply, FastifyRequest } from 'fastify';
import { makeFetchPublicServiceCatalogUseCase } from '../../use-cases/factories/make-fetch-public-service-catalog-use-case.js';

export async function fetchPartnerServices(_request: FastifyRequest, reply: FastifyReply) {
    const { services } = await makeFetchPublicServiceCatalogUseCase().execute();
    return reply.status(200).send({ services });
}