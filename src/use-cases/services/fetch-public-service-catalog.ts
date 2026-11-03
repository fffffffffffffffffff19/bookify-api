import type { PublicCatalogService, ServicesRepository } from '../../repositories/services-repository.js';

interface FetchPublicServiceCatalogResponse {
    services: PublicCatalogService[];
    pagination?: { page: number; perPage: number; total: number; totalPages: number };
}

export class FetchPublicServiceCatalogUseCase {
    constructor(private servicesRepository: ServicesRepository) { }

    async execute(pagination?: { page: number; perPage: number }): Promise<FetchPublicServiceCatalogResponse> {
        if (!pagination) {
            return { services: await this.servicesRepository.findPublicCatalog() };
        }

        const result = await this.servicesRepository.findPublicCatalogPage(
            (pagination.page - 1) * pagination.perPage,
            pagination.perPage,
        );
        return {
            services: result.services,
            pagination: {
                ...pagination,
                total: result.total,
                totalPages: Math.ceil(result.total / pagination.perPage),
            },
        };
    }
}