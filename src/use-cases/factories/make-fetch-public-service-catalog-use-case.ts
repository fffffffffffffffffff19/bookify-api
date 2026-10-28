import { PrismaServicesRepository } from '../../repositories/prisma/prisma-services-repository.js';
import { FetchPublicServiceCatalogUseCase } from '../services/fetch-public-service-catalog.js';

export function makeFetchPublicServiceCatalogUseCase() {
    return new FetchPublicServiceCatalogUseCase(new PrismaServicesRepository());
}