import { describe, beforeEach, it, expect } from 'vitest';
import { CreateAppointmentUseCase } from './create-appointment.js';
import { InMemoryAppointmentsRepository } from '../../repositories/in-memory/in-memory-appointments-repository.js';
import { InMemoryServicesRepository } from '../../repositories/in-memory/in-memory-services-repository.js';
import { InMemoryBusinessHoursRepository } from '../../repositories/in-memory/in-memory-business-hours-repository.js';
import { ResourceConflictError } from '../../errors/application-error.js';

let appointmentsRepository: InMemoryAppointmentsRepository;
let servicesRepository: InMemoryServicesRepository;
let businessHoursRepository: InMemoryBusinessHoursRepository;
let sut: CreateAppointmentUseCase;

function nextWeekdayAt(hour: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
    date.setHours(hour, 0, 0, 0);
    return date;
}

describe('Create Appointment Use Case', () => {
    beforeEach(async () => {
        appointmentsRepository = new InMemoryAppointmentsRepository();
        servicesRepository = new InMemoryServicesRepository();
        businessHoursRepository = new InMemoryBusinessHoursRepository();
        sut = new CreateAppointmentUseCase(
            appointmentsRepository,
            servicesRepository,
            businessHoursRepository,
        );

        await servicesRepository.create({
            id: 'service-1',
            title: 'Haircut',
            price: 50.0,
            durationInMinutes: 30,
            userId: 'provider-1',
        });
    });

    it('should be able to create an appointment within business hours', async () => {
        const startTime = nextWeekdayAt(10);

        const { appointment } = await sut.execute({
            clientId: 'client-1',
            serviceId: 'service-1',
            startTime,
        });

        expect(appointment.id).toEqual(expect.any(String));
        expect(appointment.status).toEqual('PENDING');
    });

    it('should not be able to create appointments outside business hours', async () => {
        const startTime = nextWeekdayAt(7);

        await expect(() =>
            sut.execute({
                clientId: 'client-1',
                serviceId: 'service-1',
                startTime,
            })
        ).rejects.toThrow('Appointments must be within business hours (08:00 - 18:00).');
    });

    it('should not be able to create appointments on non-working days', async () => {
        const startTime = new Date();
        while (startTime.getDay() !== 6 && startTime.getDay() !== 0) {
            startTime.setDate(startTime.getDate() + 1);
        }
        startTime.setHours(10, 0, 0, 0);

        await expect(() =>
            sut.execute({
                clientId: 'client-1',
                serviceId: 'service-1',
                startTime,
            })
        ).rejects.toThrow('Appointments cannot be scheduled on non-working days.');
    });

    it('should not be able to create overlapping appointments for the same provider', async () => {
        const startTime = nextWeekdayAt(14);

        await sut.execute({
            clientId: 'client-1',
            serviceId: 'service-1',
            startTime,
        });

        await expect(() =>
            sut.execute({
                clientId: 'client-2',
                serviceId: 'service-1',
                startTime,
            })
        ).rejects.toThrow('This time slot is already booked.');
    });

    it('should prevent overlaps across services owned by the same provider', async () => {
        await servicesRepository.create({
            id: 'service-2',
            title: 'Coloring',
            price: 80,
            durationInMinutes: 30,
            userId: 'provider-1',
        });
        const startTime = nextWeekdayAt(10);
        await appointmentsRepository.create({
            clientId: 'client-1',
            providerId: 'provider-1',
            serviceId: 'service-1',
            startTime: new Date(startTime.getTime() - 15 * 60 * 1000),
            endTime: new Date(startTime.getTime() + 15 * 60 * 1000),
        });

        await expect(sut.execute({
            clientId: 'client-2',
            serviceId: 'service-2',
            startTime,
        })).rejects.toThrow('This time slot is already booked.');
    });

    it('should atomically reject concurrent bookings for the same provider slot', async () => {
        const startTime = new Date();
        startTime.setDate(startTime.getDate() + 2);
        while (startTime.getDay() === 0 || startTime.getDay() === 6) {
            startTime.setDate(startTime.getDate() + 1);
        }
        startTime.setHours(14, 0, 0, 0);

        const results = await Promise.allSettled([
            sut.execute({ clientId: 'client-1', serviceId: 'service-1', startTime }),
            sut.execute({ clientId: 'client-2', serviceId: 'service-1', startTime }),
        ]);

        expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
        const rejected = results.find((result) => result.status === 'rejected');
        expect(rejected?.status).toBe('rejected');
        if (rejected?.status === 'rejected') {
            expect(rejected.reason).toBeInstanceOf(ResourceConflictError);
        }
        expect(appointmentsRepository.items).toHaveLength(1);
    });

    it('should allow a slot when the existing provider appointment is cancelled', async () => {
        const startTime = nextWeekdayAt(10);
        await appointmentsRepository.create({
            clientId: 'client-1',
            providerId: 'provider-1',
            serviceId: 'another-service',
            startTime,
            endTime: new Date(startTime.getTime() + 30 * 60 * 1000),
            status: 'CANCELLED',
        });

        const { appointment } = await sut.execute({
            clientId: 'client-2',
            serviceId: 'service-1',
            startTime,
        });

        expect(appointment.status).toEqual('PENDING');
    });

    it('should respect updated business hours when creating an appointment', async () => {
        await businessHoursRepository.save({
            allowedDays: [1, 2, 3, 4, 5],
            openHour: 10,
            closeHour: 16,
        });
        const startTime = nextWeekdayAt(9);

        await expect(sut.execute({
            clientId: 'client-1',
            serviceId: 'service-1',
            startTime,
        })).rejects.toThrow('Appointments must be within business hours (10:00 - 16:00).');
    });

    it('rejects appointment start times in the past', async () => {
        await expect(sut.execute({
            clientId: 'client-1',
            serviceId: 'service-1',
            startTime: new Date(Date.now() - 60_000),
        })).rejects.toThrow('Appointments must be scheduled in the future.');
    });
});