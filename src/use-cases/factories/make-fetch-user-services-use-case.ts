import { PrismaServicesRepository } from '../../repositories/prisma/prisma-services-repository.js';
import { FetchUserServicesUseCase } from '../services/fetch-user-services.js';

export function makeFetchUserServicesUseCase() {
    const servicesRepository = new PrismaServicesRepository();
    const useCase = new FetchUserServicesUseCase(servicesRepository);

    return useCase;
}