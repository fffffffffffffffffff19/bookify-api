import type { ServicesRepository } from '../../repositories/services-repository.js';
import { ForbiddenError, ResourceNotFoundError } from '../../errors/application-error.js';

interface DeleteServiceUseCaseRequest {
    serviceId: string;
    userId: string;
}

export class DeleteServiceUseCase {
    constructor(private servicesRepository: ServicesRepository) { }

    async execute({ serviceId, userId }: DeleteServiceUseCaseRequest): Promise<void> {
        const service = await this.servicesRepository.findById(serviceId);

        if (!service) {
            throw new ResourceNotFoundError('Service not found.');
        }

        if (service.userId !== userId) {
            throw new ForbiddenError();
        }

        await this.servicesRepository.delete(serviceId);
    }
}