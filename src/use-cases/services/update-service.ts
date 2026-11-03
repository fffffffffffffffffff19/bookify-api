import type { ServiceUpdateData, ServicesRepository } from '../../repositories/services-repository.js';
import type { Service } from '@prisma/client';
import { ForbiddenError, ResourceNotFoundError } from '../../errors/application-error.js';

interface UpdateServiceUseCaseRequest {
    serviceId: string;
    userId: string;
    title?: string | undefined;
    description?: string | null | undefined;
    price?: number | undefined;
    durationInMinutes?: number | undefined;
    imageUrl?: string | undefined;
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
        imageUrl,
    }: UpdateServiceUseCaseRequest): Promise<UpdateServiceUseCaseResponse> {
        const service = await this.servicesRepository.findById(serviceId);

        if (!service) {
            throw new ResourceNotFoundError('Service not found.');
        }

        if (service.userId !== userId) {
            throw new ForbiddenError();
        }

        const updateData: ServiceUpdateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) updateData.price = price;
        if (durationInMinutes !== undefined) updateData.durationInMinutes = durationInMinutes;
        if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

        const updatedService = await this.servicesRepository.update(serviceId, updateData);

        return {
            service: updatedService,
        };
    }
}