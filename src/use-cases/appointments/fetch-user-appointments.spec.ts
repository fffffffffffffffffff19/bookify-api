import { describe, beforeEach, it, expect } from 'vitest';
import { FetchUserAppointmentsUseCase } from './fetch-user-appointments.js';
import { InMemoryAppointmentsRepository } from '../../repositories/in-memory/in-memory-appointments-repository.js';

let appointmentsRepository: InMemoryAppointmentsRepository;
let sut: FetchUserAppointmentsUseCase;

describe('Fetch User Appointments Use Case', () => {
    beforeEach(() => {
        appointmentsRepository = new InMemoryAppointmentsRepository();
        sut = new FetchUserAppointmentsUseCase(appointmentsRepository);
    });

    it('should be able to fetch appointments for a specific client', async () => {
        await appointmentsRepository.create({
            clientId: 'user-1',
            providerId: 'provider-1',
            serviceId: 'service-1',
            startTime: new Date(),
            endTime: new Date(),
        });

        await appointmentsRepository.create({
            clientId: 'user-1',
            providerId: 'provider-2',
            serviceId: 'service-2',
            startTime: new Date(),
            endTime: new Date(),
        });

        await appointmentsRepository.create({
            clientId: 'user-2',
            providerId: 'provider-1',
            serviceId: 'service-1',
            startTime: new Date(),
            endTime: new Date(),
        });

        const { appointments } = await sut.execute({
            userId: 'user-1',
        });

        expect(appointments).toHaveLength(2);
    });

    it('should be able to fetch appointments where user is a provider', async () => {
        await appointmentsRepository.create({
            clientId: 'client-1',
            providerId: 'user-1',
            serviceId: 'service-1',
            startTime: new Date(),
            endTime: new Date(),
        });

        const { appointments } = await sut.execute({
            userId: 'user-1',
        });

        expect(appointments).toHaveLength(1);
        expect(appointments[0]?.providerId).toEqual('user-1');
    });

    it('should return an empty list when user has no appointments', async () => {
        const { appointments } = await sut.execute({
            userId: 'user-without-appointments',
        });

        expect(appointments).toEqual([]);
    });
});