import type { ServicesRepository } from '../../repositories/services-repository.js';

interface DeleteServiceUseCaseRequest {
    serviceId: string;
    userId: string;
}

export class DeleteServiceUseCase {
    constructor(private servicesRepository: ServicesRepository) { }

    async execute({ serviceId, userId }: DeleteServiceUseCaseRequest): Promise<void> {
        const service = await this.servicesRepository.findById(serviceId);

        if (!service) {
            throw new Error('Service not found.');
        }

        if (service.userId !== userId) {
            throw new Error('Not authorized.');
        }

        await this.servicesRepository.delete(serviceId);
    }
}