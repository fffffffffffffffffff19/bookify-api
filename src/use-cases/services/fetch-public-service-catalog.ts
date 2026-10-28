import type { PublicCatalogService, ServicesRepository } from '../../repositories/services-repository.js';

interface FetchPublicServiceCatalogResponse {
    services: PublicCatalogService[];
}

export class FetchPublicServiceCatalogUseCase {
    constructor(private servicesRepository: ServicesRepository) { }

    async execute(): Promise<FetchPublicServiceCatalogResponse> {
        const services = await this.servicesRepository.findPublicCatalog();
        return { services };
    }
}