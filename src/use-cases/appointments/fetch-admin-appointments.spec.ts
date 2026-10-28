import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryAppointmentsRepository } from '../../repositories/in-memory/in-memory-appointments-repository.js';
import { FetchAdminAppointmentsUseCase } from './fetch-admin-appointments.js';

let appointmentsRepository: InMemoryAppointmentsRepository;
let sut: FetchAdminAppointmentsUseCase;

describe('Fetch Admin Appointments Use Case', () => {
    beforeEach(() => {
        appointmentsRepository = new InMemoryAppointmentsRepository();
        sut = new FetchAdminAppointmentsUseCase(appointmentsRepository);
    });

    it('should fetch all appointments across clients and providers', async () => {
        await appointmentsRepository.create({
            clientId: 'client-1',
            providerId: 'provider-1',
            serviceId: 'service-1',
            startTime: new Date('2026-10-28T10:00:00.000Z'),
            endTime: new Date('2026-10-28T10:30:00.000Z'),
        });
        await appointmentsRepository.create({
            clientId: 'client-2',
            providerId: 'provider-2',
            serviceId: 'service-2',
            startTime: new Date('2026-10-28T11:00:00.000Z'),
            endTime: new Date('2026-10-28T11:30:00.000Z'),
        });

        const { appointments } = await sut.execute();

        expect(appointments).toHaveLength(2);
    });

    it('should return an empty list when there are no appointments', async () => {
        const { appointments } = await sut.execute();

        expect(appointments).toEqual([]);
    });
});
