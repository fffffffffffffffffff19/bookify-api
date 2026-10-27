import { describe, beforeEach, it, expect } from 'vitest';
import { UpdateServiceUseCase } from './update-service.js';
import { InMemoryServicesRepository } from '../../repositories/in-memory/in-memory-services-repository.js';

let servicesRepository: InMemoryServicesRepository;
let sut: UpdateServiceUseCase;

describe('Update Service Use Case', () => {
    beforeEach(() => {
        servicesRepository = new InMemoryServicesRepository();
        sut = new UpdateServiceUseCase(servicesRepository);
    });

    it('should be able to update a service', async () => {
        const createdService = await servicesRepository.create({
            userId: 'provider-1',
            title: 'Haircut',
            price: 50,
            durationInMinutes: 30,
        });

        const { service } = await sut.execute({
            serviceId: createdService.id,
            userId: 'provider-1',
            title: 'VIP Haircut',
            price: 80,
            durationInMinutes: 45,
        });

        expect(service.title).toEqual('VIP Haircut');
        expect(service.price).toEqual(80);
    });

    it('should not be able to update a service from another provider', async () => {
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
                title: 'VIP Haircut',
            })
        ).rejects.toThrow('Not authorized.');
    });

    it('should not be able to update a non-existing service', async () => {
        await expect(() =>
            sut.execute({
                serviceId: 'non-existing-service-id',
                userId: 'provider-1',
                title: 'VIP Haircut',
            })
        ).rejects.toThrow('Service not found.');
    });
});