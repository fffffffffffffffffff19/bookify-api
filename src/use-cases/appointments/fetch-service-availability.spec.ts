import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryAppointmentsRepository } from '../../repositories/in-memory/in-memory-appointments-repository.js';
import { InMemoryServicesRepository } from '../../repositories/in-memory/in-memory-services-repository.js';
import { InMemoryBusinessHoursRepository } from '../../repositories/in-memory/in-memory-business-hours-repository.js';
import { FetchServiceAvailabilityUseCase } from './fetch-service-availability.js';

let appointmentsRepository: InMemoryAppointmentsRepository;
let servicesRepository: InMemoryServicesRepository;
let businessHoursRepository: InMemoryBusinessHoursRepository;
let sut: FetchServiceAvailabilityUseCase;

function nextWeekday(): Date {
    const date = new Date(2026, 9, 26, 0, 0, 0, 0);
    while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() + 1);
    }
    return date;
}

describe('Fetch Service Availability Use Case', () => {
    beforeEach(async () => {
        appointmentsRepository = new InMemoryAppointmentsRepository();
        servicesRepository = new InMemoryServicesRepository();
        businessHoursRepository = new InMemoryBusinessHoursRepository();
        sut = new FetchServiceAvailabilityUseCase(
            appointmentsRepository,
            servicesRepository,
            businessHoursRepository,
        );

        await servicesRepository.create({
            id: 'service-1',
            title: 'Consultation',
            price: 50,
            durationInMinutes: 60,
            userId: 'provider-1',
        });
    });

    it('should return service-duration slots during business hours', async () => {
        const date = nextWeekday();

        const { availableSlots } = await sut.execute({
            serviceId: 'service-1',
            date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        });

        expect(availableSlots).toEqual([
            '08:00', '09:00', '10:00', '11:00', '12:00',
            '13:00', '14:00', '15:00', '16:00', '17:00',
        ]);
    });

    it('should omit slots overlapping existing appointments', async () => {
        const date = nextWeekday();
        const bookedStart = new Date(date);
        bookedStart.setHours(9, 30, 0, 0);
        await appointmentsRepository.create({
            clientId: 'client-1',
            providerId: 'provider-1',
            serviceId: 'different-service',
            startTime: bookedStart,
            endTime: new Date(bookedStart.getTime() + 60 * 60 * 1000),
        });

        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const { availableSlots } = await sut.execute({ serviceId: 'service-1', date: dateString });

        expect(availableSlots).not.toContain('09:00');
        expect(availableSlots).not.toContain('10:00');
        expect(availableSlots).toContain('08:00');
    });

    it('should ignore cancelled appointments', async () => {
        const date = nextWeekday();
        const bookedStart = new Date(date);
        bookedStart.setHours(8, 0, 0, 0);
        await appointmentsRepository.create({
            clientId: 'client-1',
            providerId: 'provider-1',
            serviceId: 'service-1',
            startTime: bookedStart,
            endTime: new Date(bookedStart.getTime() + 60 * 60 * 1000),
            status: 'CANCELLED',
        });

        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const { availableSlots } = await sut.execute({ serviceId: 'service-1', date: dateString });

        expect(availableSlots[0]).toEqual('08:00');
    });

    it('should return no slots on non-working days', async () => {
        const date = new Date(2026, 9, 25);
        while (date.getDay() !== 0 && date.getDay() !== 6) {
            date.setDate(date.getDate() + 1);
        }

        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const { availableSlots } = await sut.execute({ serviceId: 'service-1', date: dateString });

        expect(availableSlots).toEqual([]);
    });

    it('should fail for a missing service', async () => {
        await expect(sut.execute({ serviceId: 'missing-service', date: '2026-10-26' }))
            .rejects.toThrow('Service not found.');
    });

    it('should reject impossible dates', async () => {
        await expect(sut.execute({ serviceId: 'service-1', date: '2026-02-30' }))
            .rejects.toThrow('Date must be a valid calendar date.');
    });

    it('should generate slots using updated business hours', async () => {
        await businessHoursRepository.save({
            allowedDays: [1, 2, 3, 4, 5],
            openHour: 11,
            closeHour: 13,
        });
        const date = nextWeekday();
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        const { availableSlots } = await sut.execute({ serviceId: 'service-1', date: dateString });

        expect(availableSlots).toEqual(['11:00', '12:00']);
    });
});