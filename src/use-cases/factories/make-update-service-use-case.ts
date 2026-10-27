import { PrismaServicesRepository } from '../../repositories/prisma/prisma-services-repository.js';
import { UpdateServiceUseCase } from '../services/update-service.js';

export function makeUpdateServiceUseCase() {
    const servicesRepository = new PrismaServicesRepository();
    const useCase = new UpdateServiceUseCase(servicesRepository);

    return useCase;
}