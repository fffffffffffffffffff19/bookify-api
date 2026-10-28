import { describe, beforeEach, it, expect } from 'vitest';
import { CancelAppointmentUseCase } from './cancel-appointment.js';
import { InMemoryAppointmentsRepository } from '../../repositories/in-memory/in-memory-appointments-repository.js';

let appointmentsRepository: InMemoryAppointmentsRepository;
let sut: CancelAppointmentUseCase;

describe('Cancel Appointment Use Case', () => {
    beforeEach(() => {
        appointmentsRepository = new InMemoryAppointmentsRepository();
        sut = new CancelAppointmentUseCase(appointmentsRepository);
    });

    it('should be able to cancel an appointment as a client', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);

        const createdAppointment = await appointmentsRepository.create({
            clientId: 'client-1',
            providerId: 'provider-1',
            serviceId: 'service-1',
            startTime: futureDate,
            endTime: new Date(futureDate.getTime() + 30 * 60 * 1000),
            status: 'PENDING',
        });

        const { appointment } = await sut.execute({
            appointmentId: createdAppointment.id,
            userId: 'client-1',
        });

        expect(appointment.status).toEqual('CANCELLED');
    });

    it('should be able to cancel an appointment as a provider', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);

        const createdAppointment = await appointmentsRepository.create({
            clientId: 'client-1',
            providerId: 'provider-1',
            serviceId: 'service-1',
            startTime: futureDate,
            endTime: new Date(futureDate.getTime() + 30 * 60 * 1000),
            status: 'PENDING',
        });

        const { appointment } = await sut.execute({
            appointmentId: createdAppointment.id,
            userId: 'provider-1',
        });

        expect(appointment.status).toEqual('CANCELLED');
    });

    it('should not be able to cancel a non-existing appointment', async () => {
        await expect(() =>
            sut.execute({
                appointmentId: 'non-existing-id',
                userId: 'client-1',
            })
        ).rejects.toThrow('Appointment not found.');
    });

    it('should not be able to cancel an appointment if user is unauthorized', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);

        const createdAppointment = await appointmentsRepository.create({
            clientId: 'client-1',
            providerId: 'provider-1',
            serviceId: 'service-1',
            startTime: futureDate,
            endTime: new Date(futureDate.getTime() + 30 * 60 * 1000),
            status: 'PENDING',
        });

        await expect(() =>
            sut.execute({
                appointmentId: createdAppointment.id,
                userId: 'unauthorized-user',
            })
        ).rejects.toThrow('Not authorized.');
    });

    it('should not be able to cancel an already cancelled appointment', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);

        const createdAppointment = await appointmentsRepository.create({
            clientId: 'client-1',
            providerId: 'provider-1',
            serviceId: 'service-1',
            startTime: futureDate,
            endTime: new Date(futureDate.getTime() + 30 * 60 * 1000),
            status: 'CANCELLED',
        });

        await expect(() =>
            sut.execute({
                appointmentId: createdAppointment.id,
                userId: 'client-1',
            })
        ).rejects.toThrow('Appointments in CANCELLED status cannot transition to CANCELLED.');
    });

    it('should not be able to cancel a past appointment', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);

        const createdAppointment = await appointmentsRepository.create({
            clientId: 'client-1',
            providerId: 'provider-1',
            serviceId: 'service-1',
            startTime: pastDate,
            endTime: new Date(pastDate.getTime() + 30 * 60 * 1000),
            status: 'PENDING',
        });

        await expect(() =>
            sut.execute({
                appointmentId: createdAppointment.id,
                userId: 'client-1',
            })
        ).rejects.toThrow('Cannot cancel a past appointment.');
    });
});