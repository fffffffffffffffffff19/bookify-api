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

    it('should paginate and filter user appointments by status and start time', async () => {
        const from = new Date('2026-10-28T10:00:00.000Z');
        const to = new Date('2026-10-28T13:00:00.000Z');
        for (const [hour, status] of [[10, 'CONFIRMED'], [11, 'CONFIRMED'], [12, 'PENDING']] as const) {
            await appointmentsRepository.create({
                clientId: 'user-1',
                providerId: 'provider-1',
                serviceId: 'service-1',
                startTime: new Date(`2026-10-28T${String(hour).padStart(2, '0')}:00:00.000Z`),
                endTime: new Date(`2026-10-28T${String(hour).padStart(2, '0')}:30:00.000Z`),
                status,
            });
        }

        const { appointments, pagination } = await sut.execute({
            userId: 'user-1',
            filters: { page: 2, perPage: 1, status: 'CONFIRMED', from, to },
        });

        expect(appointments).toHaveLength(1);
        expect(appointments[0]?.startTime).toEqual(new Date('2026-10-28T11:00:00.000Z'));
        expect(pagination).toEqual({ page: 2, perPage: 1, total: 2, totalPages: 2 });
    });
});