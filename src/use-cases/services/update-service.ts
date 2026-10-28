import type { ServicesRepository } from '../../repositories/services-repository.js';
import type { Service } from '@prisma/client';
import { ForbiddenError, ResourceNotFoundError } from '../../errors/application-error.js';

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
            throw new ResourceNotFoundError('Service not found.');
        }

        if (service.userId !== userId) {
            throw new ForbiddenError();
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