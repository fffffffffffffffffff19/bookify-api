import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryAppointmentsRepository } from '../../repositories/in-memory/in-memory-appointments-repository.js';
import {
    AppointmentNotFoundError,
    UnauthorizedAppointmentAccessError,
    UpdateAppointmentStatusUseCase,
} from './update-appointment-status.js';

let appointmentsRepository: InMemoryAppointmentsRepository;
let sut: UpdateAppointmentStatusUseCase;

describe('Update Appointment Status Use Case', () => {
    beforeEach(() => {
        appointmentsRepository = new InMemoryAppointmentsRepository();
        sut = new UpdateAppointmentStatusUseCase(appointmentsRepository);
    });

    it.each(['CONFIRMED', 'COMPLETED', 'CANCELLED'] as const)(
        'should update an appointment to %s for its provider',
        async (status) => {
            const appointment = await appointmentsRepository.create({
                clientId: 'client-1',
                providerId: 'provider-1',
                serviceId: 'service-1',
                startTime: new Date(),
                endTime: new Date(),
            });

            const result = await sut.execute({
                appointmentId: appointment.id,
                userId: 'provider-1',
                userRole: 'PROVIDER',
                status,
            });

            expect(result.appointment.status).toEqual(status);
        },
    );

    it('should allow admins to update any appointment', async () => {
        const appointment = await appointmentsRepository.create({
            clientId: 'client-1',
            providerId: 'provider-1',
            serviceId: 'service-1',
            startTime: new Date(),
            endTime: new Date(),
        });

        const result = await sut.execute({
            appointmentId: appointment.id,
            userId: 'admin-1',
            userRole: 'ADMIN',
            status: 'CONFIRMED',
        });

        expect(result.appointment.status).toEqual('CONFIRMED');
    });

    it('should reject a provider who does not own the appointment', async () => {
        const appointment = await appointmentsRepository.create({
            clientId: 'client-1',
            providerId: 'provider-1',
            serviceId: 'service-1',
            startTime: new Date(),
            endTime: new Date(),
        });

        await expect(sut.execute({
            appointmentId: appointment.id,
            userId: 'provider-2',
            userRole: 'PROVIDER',
            status: 'CONFIRMED',
        })).rejects.toBeInstanceOf(UnauthorizedAppointmentAccessError);
    });

    it('should report when the appointment does not exist', async () => {
        await expect(sut.execute({
            appointmentId: 'missing-appointment',
            userId: 'provider-1',
            userRole: 'PROVIDER',
            status: 'CONFIRMED',
        })).rejects.toBeInstanceOf(AppointmentNotFoundError);
    });
});