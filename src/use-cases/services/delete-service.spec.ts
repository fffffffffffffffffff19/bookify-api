import { describe, beforeEach, it, expect } from 'vitest';
import { DeleteServiceUseCase } from './delete-service.js';
import { InMemoryServicesRepository } from '../../repositories/in-memory/in-memory-services-repository.js';

let servicesRepository: InMemoryServicesRepository;
let sut: DeleteServiceUseCase;

describe('Delete Service Use Case', () => {
    beforeEach(() => {
        servicesRepository = new InMemoryServicesRepository();
        sut = new DeleteServiceUseCase(servicesRepository);
    });

    it('should be able to delete a service', async () => {
        const createdService = await servicesRepository.create({
            userId: 'provider-1',
            title: 'Haircut',
            price: 50,
            durationInMinutes: 30,
        });

        await sut.execute({
            serviceId: createdService.id,
            userId: 'provider-1',
        });

        const service = await servicesRepository.findById(createdService.id);
        expect(service).toBeNull();
    });

    it('should not be able to delete a service from another provider', async () => {
        const createdService = await servicesRepository.create({
            userId: 'provider-1',
            title: 'Haircut',
            price: 50,
            durationInMinutes: 30,
        });

        await expect(() =>
            sut.execute({
                serviceId: createdService.id,
                userId: 'wrong-provider-id',
            })
        ).rejects.toThrow('Not authorized.');
    });

    it('should not be able to delete a non-existing service', async () => {
        await expect(() =>
            sut.execute({
                serviceId: 'non-existing-service-id',
                userId: 'provider-1',
            })
        ).rejects.toThrow('Service not found.');
    });
});