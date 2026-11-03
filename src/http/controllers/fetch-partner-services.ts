import type { FastifyReply, FastifyRequest } from 'fastify';
import { partnerServiceCatalogQuerySchema } from '../schemas/partner-service-catalog-query.js';
import { makeFetchPublicServiceCatalogUseCase } from '../../use-cases/factories/make-fetch-public-service-catalog-use-case.js';

export async function fetchPartnerServices(request: FastifyRequest, reply: FastifyReply) {
    const pagination = partnerServiceCatalogQuerySchema.parse(request.query);
    const result = await makeFetchPublicServiceCatalogUseCase().execute(pagination);
    return reply.status(200).send(result);
}