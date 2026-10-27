import type { ServicesRepository } from '../../repositories/services-repository.js';
import type { Service } from '@prisma/client';

interface UpdateServiceUseCaseRequest {
    serviceId: string;
    userId: string;
    title?: string | undefined;
    description?: string | null | undefined;
    price?: number | undefined;
    durationInMinutes?: number | undefined;
}

interface UpdateServiceUseCaseResponse {
    service: Service;
}

export class UpdateServiceUseCase {
    constructor(private servicesRepository: ServicesRepository) { }

    async execute({
        serviceId,
        userId,
        title,
        description,
        price,
        durationInMinutes,
    }: UpdateServiceUseCaseRequest): Promise<UpdateServiceUseCaseResponse> {
        const service = await this.servicesRepository.findById(serviceId);

        if (!service) {
            throw new Error('Service not found.');
        }

        if (service.userId !== userId) {
            throw new Error('Not authorized.');
        }

        service.title = title ?? service.title;
        service.description = description !== undefined ? description : service.description;

        if (price !== undefined) {
            (service as any).price = price;
        }

        service.durationInMinutes = durationInMinutes ?? service.durationInMinutes;

        await this.servicesRepository.save(service);

        return {
            service,
        };
    }
}