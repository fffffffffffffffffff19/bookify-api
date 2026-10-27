import type { ServicesRepository } from '../../repositories/services-repository.js';
import type { Service } from '@prisma/client';

interface CreateServiceUseCaseRequest {
    title: string;
    description?: string | null;
    price: number;
    durationInMinutes: number;
    userId: string;
}

interface CreateServiceUseCaseResponse {
    service: Service;
}

export class CreateServiceUseCase {
    constructor(private servicesRepository: ServicesRepository) { }

    async execute({
        title,
        description,
        price,
        durationInMinutes,
        userId,
    }: CreateServiceUseCaseRequest): Promise<CreateServiceUseCaseResponse> {
        const service = await this.servicesRepository.create({
            title,
            description: description ?? null,
            price,
            durationInMinutes,
            userId,
        });

        return {
            service,
        };
    }
}