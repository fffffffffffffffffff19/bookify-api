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

    it('should paginate and filter all appointments by status and start-time range', async () => {
        for (const [hour, status] of [[10, 'CONFIRMED'], [11, 'CONFIRMED'], [12, 'PENDING']] as const) {
            await appointmentsRepository.create({
                clientId: `client-${hour}`,
                providerId: `provider-${hour}`,
                serviceId: `service-${hour}`,
                startTime: new Date(`2026-10-28T${String(hour).padStart(2, '0')}:00:00.000Z`),
                endTime: new Date(`2026-10-28T${String(hour).padStart(2, '0')}:30:00.000Z`),
                status,
            });
        }

        const { appointments, pagination } = await sut.execute({
            filters: {
                page: 2,
                perPage: 1,
                status: 'CONFIRMED',
                from: new Date('2026-10-28T10:00:00.000Z'),
                to: new Date('2026-10-28T13:00:00.000Z'),
            },
        });

        expect(appointments).toHaveLength(1);
        expect(appointments[0]?.startTime).toEqual(new Date('2026-10-28T11:00:00.000Z'));
        expect(pagination).toEqual({ page: 2, perPage: 1, total: 2, totalPages: 2 });
    });
});
