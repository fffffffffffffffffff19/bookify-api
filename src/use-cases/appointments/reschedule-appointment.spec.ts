import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryAppointmentsRepository } from '../../repositories/in-memory/in-memory-appointments-repository.js';
import { InMemoryBusinessHoursRepository } from '../../repositories/in-memory/in-memory-business-hours-repository.js';
import { InMemoryServicesRepository } from '../../repositories/in-memory/in-memory-services-repository.js';
import { ForbiddenError, ResourceConflictError, ResourceNotFoundError } from '../../errors/application-error.js';
import { RescheduleAppointmentUseCase } from './reschedule-appointment.js';

let appointmentsRepository: InMemoryAppointmentsRepository;
let servicesRepository: InMemoryServicesRepository;
let businessHoursRepository: InMemoryBusinessHoursRepository;
let sut: RescheduleAppointmentUseCase;
let appointmentId: string;
let initialStart: Date;

function nextWeekdayAt(hour: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
    date.setHours(hour, 0, 0, 0);
    return date;
}

describe('Reschedule Appointment Use Case', () => {
    beforeEach(async () => {
        appointmentsRepository = new InMemoryAppointmentsRepository();
        servicesRepository = new InMemoryServicesRepository();
        businessHoursRepository = new InMemoryBusinessHoursRepository();
        sut = new RescheduleAppointmentUseCase(
            appointmentsRepository,
            servicesRepository,
            businessHoursRepository,
        );

        await servicesRepository.create({
            id: 'service-1',
            title: 'Consultation',
            price: 50,
            durationInMinutes: 30,
            userId: 'provider-1',
        });
        initialStart = nextWeekdayAt(10);
        const appointment = await appointmentsRepository.create({
            clientId: 'client-1',
            providerId: 'provider-1',
            serviceId: 'service-1',
            startTime: initialStart,
            endTime: new Date(initialStart.getTime() + 30 * 60 * 1000),
        });
        appointmentId = appointment.id;
    });

    it('reschedules an appointment and recalculates its end time', async () => {
        const newStartTime = new Date(initialStart.getTime() + 2 * 60 * 60 * 1000);
        const { appointment } = await sut.execute({
            appointmentId,
            userId: 'client-1',
            userRole: 'CLIENT',
            startTime: newStartTime,
        });

        expect(appointment.startTime).toEqual(newStartTime);
        expect(appointment.endTime).toEqual(new Date(newStartTime.getTime() + 30 * 60 * 1000));
    });

    it('returns not found for a missing appointment', async () => {
        await expect(sut.execute({
            appointmentId: 'missing',
            userId: 'client-1',
            userRole: 'CLIENT',
            startTime: nextWeekdayAt(12),
        })).rejects.toBeInstanceOf(ResourceNotFoundError);
    });

    it('rejects users who are not appointment participants', async () => {
        await expect(sut.execute({
            appointmentId,
            userId: 'other-user',
            userRole: 'CLIENT',
            startTime: nextWeekdayAt(12),
        })).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('excludes the current appointment from its own conflict lookup', async () => {
        const { appointment } = await sut.execute({
            appointmentId,
            userId: 'provider-1',
            userRole: 'PROVIDER',
            startTime: initialStart,
        });

        expect(appointment.id).toBe(appointmentId);
    });

    it('rejects a slot conflicting with another active appointment for the provider', async () => {
        const conflictingStart = new Date(initialStart.getTime() + 2 * 60 * 60 * 1000);
        await appointmentsRepository.create({
            clientId: 'client-2',
            providerId: 'provider-1',
            serviceId: 'service-1',
            startTime: conflictingStart,
            endTime: new Date(conflictingStart.getTime() + 30 * 60 * 1000),
        });

        await expect(sut.execute({
            appointmentId,
            userId: 'client-1',
            userRole: 'CLIENT',
            startTime: conflictingStart,
        })).rejects.toBeInstanceOf(ResourceConflictError);
    });
});