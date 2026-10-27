import { PrismaServicesRepository } from '../../repositories/prisma/prisma-services-repository.js';
import { CreateServiceUseCase } from '../services/create-service.js';

export function makeCreateServiceUseCase() {
    const prismaServicesRepository = new PrismaServicesRepository();
    const useCase = new CreateServiceUseCase(prismaServicesRepository);

    return useCase;
}