import { PrismaServicesRepository } from '../../repositories/prisma/prisma-services-repository.js';
import { DeleteServiceUseCase } from '../services/delete-service.js';

export function makeDeleteServiceUseCase() {
    const servicesRepository = new PrismaServicesRepository();
    const useCase = new DeleteServiceUseCase(servicesRepository);

    return useCase;
}