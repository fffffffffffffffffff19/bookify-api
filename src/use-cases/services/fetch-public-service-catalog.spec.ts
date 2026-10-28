import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryServicesRepository } from '../../repositories/in-memory/in-memory-services-repository.js';
import { FetchPublicServiceCatalogUseCase } from './fetch-public-service-catalog.js';

describe('Fetch Public Service Catalog Use Case', () => {
    let repository: InMemoryServicesRepository;
    let sut: FetchPublicServiceCatalogUseCase;

    beforeEach(() => {
        repository = new InMemoryServicesRepository();
        sut = new FetchPublicServiceCatalogUseCase(repository);
    });

    it('returns a sorted public service projection with provider identity', async () => {
        await repository.create({
            id: 'service-b',
            title: 'Yoga',
            price: 35,
            durationInMinutes: 45,
            userId: 'provider-2',
        });
        await repository.create({
            id: 'service-a',
            title: 'Massage',
            description: 'Relaxation session',
            price: 50,
            durationInMinutes: 60,
            userId: 'provider-1',
        });

        const { services } = await sut.execute();

        expect(services).toHaveLength(2);
        expect(services[0]).toMatchObject({
            id: 'service-a',
            title: 'Massage',
            provider: { id: 'provider-1', name: null },
        });
        expect(services[1]?.title).toEqual('Yoga');
        expect(services[0]).not.toHaveProperty('userId');
    });
});