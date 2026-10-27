import { describe, beforeEach, it, expect } from 'vitest';
import { CreateAppointmentUseCase } from './create-appointment.js';
import { InMemoryAppointmentsRepository } from '../../repositories/in-memory/in-memory-appointments-repository.js';
import { InMemoryServicesRepository } from '../../repositories/in-memory/in-memory-services-repository.js';

let appointmentsRepository: InMemoryAppointmentsRepository;
let servicesRepository: InMemoryServicesRepository;
let sut: CreateAppointmentUseCase;

describe('Create Appointment Use Case', () => {
    beforeEach(async () => {
        appointmentsRepository = new InMemoryAppointmentsRepository();
        servicesRepository = new InMemoryServicesRepository();
        sut = new CreateAppointmentUseCase(appointmentsRepository, servicesRepository);

        await servicesRepository.create({
            id: 'service-1',
            title: 'Haircut',
            price: 50.0,
            durationInMinutes: 30,
            userId: 'provider-1',
        });
    });

    it('should be able to create an appointment within business hours', async () => {
        const startTime = new Date();
        startTime.setDate(startTime.getDate() + 1);
        startTime.setHours(10, 0, 0, 0);

        if (startTime.getDay() === 0) startTime.setDate(startTime.getDate() + 1);
        if (startTime.getDay() === 6) startTime.setDate(startTime.getDate() + 2);

        const { appointment } = await sut.execute({
            clientId: 'client-1',
            serviceId: 'service-1',
            startTime,
        });

        expect(appointment.id).toEqual(expect.any(String));
        expect(appointment.status).toEqual('PENDING');
    });

    it('should not be able to create appointments outside business hours', async () => {
        const startTime = new Date();
        startTime.setDate(startTime.getDate() + 1);
        startTime.setHours(7, 0, 0, 0);

        if (startTime.getDay() === 0) startTime.setDate(startTime.getDate() + 1);
        if (startTime.getDay() === 6) startTime.setDate(startTime.getDate() + 2);

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
        const startTime = new Date();
        startTime.setDate(startTime.getDate() + 1);
        startTime.setHours(14, 0, 0, 0);

        if (startTime.getDay() === 0) startTime.setDate(startTime.getDate() + 1);
        if (startTime.getDay() === 6) startTime.setDate(startTime.getDate() + 2);

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
});