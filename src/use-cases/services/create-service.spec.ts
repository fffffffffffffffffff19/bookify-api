import { describe, beforeEach, it, expect } from 'vitest';
import { CreateServiceUseCase } from './create-service.js';
import { InMemoryServicesRepository } from '../../repositories/in-memory/in-memory-services-repository.js';

let servicesRepository: InMemoryServicesRepository;
let sut: CreateServiceUseCase;

describe('Create Service Use Case', () => {
    beforeEach(() => {
        servicesRepository = new InMemoryServicesRepository();
        sut = new CreateServiceUseCase(servicesRepository);
    });

    it('should be able to create a new service', async () => {
        const { service } = await sut.execute({
            userId: 'provider-1',
            title: 'Haircut',
            description: 'Standard haircut service',
            price: 50,
            durationInMinutes: 30,
        });

        expect(service.id).toEqual(expect.any(String));
        expect(service.title).toEqual('Haircut');
        expect(Number(service.price)).toEqual(50);
    });
});