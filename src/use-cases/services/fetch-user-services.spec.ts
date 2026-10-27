import { describe, beforeEach, it, expect } from 'vitest';
import { FetchUserServicesUseCase } from './fetch-user-services.js';
import { InMemoryServicesRepository } from '../../repositories/in-memory/in-memory-services-repository.js';

let servicesRepository: InMemoryServicesRepository;
let sut: FetchUserServicesUseCase;

describe('Fetch User Services Use Case', () => {
    beforeEach(() => {
        servicesRepository = new InMemoryServicesRepository();
        sut = new FetchUserServicesUseCase(servicesRepository);
    });

    it('should be able to fetch services of a specific provider', async () => {
        await servicesRepository.create({
            userId: 'provider-1',
            title: 'Haircut',
            price: 50,
            durationInMinutes: 30,
        });

        await servicesRepository.create({
            userId: 'provider-1',
            title: 'Beard Trim',
            price: 30,
            durationInMinutes: 20,
        });

        await servicesRepository.create({
            userId: 'provider-2',
            title: 'Manicure',
            price: 40,
            durationInMinutes: 45,
        });

        const { services } = await sut.execute({
            userId: 'provider-1',
        });

        expect(services).toHaveLength(2);
    });
});