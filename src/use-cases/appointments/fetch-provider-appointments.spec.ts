import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryAppointmentsRepository } from '../../repositories/in-memory/in-memory-appointments-repository.js';
import { FetchProviderAppointmentsUseCase } from './fetch-provider-appointments.js';

let appointmentsRepository: InMemoryAppointmentsRepository;
let sut: FetchProviderAppointmentsUseCase;

describe('Fetch Provider Appointments Use Case', () => {
    beforeEach(() => {
        appointmentsRepository = new InMemoryAppointmentsRepository();
        sut = new FetchProviderAppointmentsUseCase(appointmentsRepository);
    });

    it('should only return appointments assigned to the provider', async () => {
        await appointmentsRepository.create({
            clientId: 'client-1',
            providerId: 'provider-1',
            serviceId: 'service-1',
            startTime: new Date(),
            endTime: new Date(),
        });
        await appointmentsRepository.create({
            clientId: 'provider-1',
            providerId: 'provider-2',
            serviceId: 'service-2',
            startTime: new Date(),
            endTime: new Date(),
        });

        const { appointments } = await sut.execute({ providerId: 'provider-1' });

        expect(appointments).toHaveLength(1);
        expect(appointments[0]?.providerId).toEqual('provider-1');
    });

    it('should return an empty list when the provider has no appointments', async () => {
        const { appointments } = await sut.execute({ providerId: 'provider-1' });

        expect(appointments).toEqual([]);
    });
});