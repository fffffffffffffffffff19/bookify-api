import type { ServicesRepository } from '../../repositories/services-repository.js';
import type { Service } from '@prisma/client';

interface FetchUserServicesUseCaseRequest {
    userId: string;
}

interface FetchUserServicesUseCaseResponse {
    services: Service[];
}

export class FetchUserServicesUseCase {
    constructor(private servicesRepository: ServicesRepository) { }

    async execute({
        userId,
    }: FetchUserServicesUseCaseRequest): Promise<FetchUserServicesUseCaseResponse> {
        const services = await this.servicesRepository.findManyByUserId(userId);

        return {
            services,
        };
    }
}