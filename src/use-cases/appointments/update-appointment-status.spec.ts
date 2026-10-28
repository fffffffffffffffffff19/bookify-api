import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryAppointmentsRepository } from '../../repositories/in-memory/in-memory-appointments-repository.js';
import {
    BusinessRuleError,
    ForbiddenError,
} from '../../errors/application-error.js';
import {
    AppointmentNotFoundError,
    UnauthorizedAppointmentAccessError,
    UpdateAppointmentStatusUseCase,
} from './update-appointment-status.js';

let appointmentsRepository: InMemoryAppointmentsRepository;
let sut: UpdateAppointmentStatusUseCase;

function appointmentData(endTime: Date, status: 'PENDING' | 'COMPLETED' | 'CANCELLED' = 'PENDING') {
    return {
        clientId: 'client-1',
        providerId: 'provider-1',
        serviceId: 'service-1',
        startTime: new Date(endTime.getTime() - 30 * 60 * 1000),
        endTime,
        status,
    };
}

describe('Update Appointment Status Use Case', () => {
    beforeEach(() => {
        appointmentsRepository = new InMemoryAppointmentsRepository();
        sut = new UpdateAppointmentStatusUseCase(appointmentsRepository);
    });

    it('allows a client to cancel their own pending appointment', async () => {
        const appointment = await appointmentsRepository.create(appointmentData(new Date(Date.now() + 60_000)));
        const result = await sut.execute({
            appointmentId: appointment.id,
            userId: 'client-1',
            userRole: 'CLIENT',
            status: 'CANCELLED',
        });
        expect(result.appointment.status).toEqual('CANCELLED');
    });

    it('allows the provider to complete a pending appointment after its end time', async () => {
        const appointment = await appointmentsRepository.create(appointmentData(new Date(Date.now() - 60_000)));
        const result = await sut.execute({
            appointmentId: appointment.id,
            userId: 'provider-1',
            userRole: 'PROVIDER',
            status: 'COMPLETED',
        });
        expect(result.appointment.status).toEqual('COMPLETED');
    });

    it('allows admins to cancel any pending appointment', async () => {
        const appointment = await appointmentsRepository.create(appointmentData(new Date(Date.now() + 60_000)));
        const result = await sut.execute({
            appointmentId: appointment.id,
            userId: 'admin-1',
            userRole: 'ADMIN',
            status: 'CANCELLED',
        });
        expect(result.appointment.status).toEqual('CANCELLED');
    });

    it.each([
        ['COMPLETED', 'PENDING'],
        ['COMPLETED', 'CANCELLED'],
        ['CANCELLED', 'COMPLETED'],
    ] as const)('rejects terminal transition %s -> %s', async (currentStatus, targetStatus) => {
        const appointment = await appointmentsRepository.create(
            appointmentData(new Date(Date.now() - 60_000), currentStatus),
        );
        await expect(sut.execute({
            appointmentId: appointment.id,
            userId: 'admin-1',
            userRole: 'ADMIN',
            status: targetStatus,
        })).rejects.toBeInstanceOf(BusinessRuleError);
    });

    it('rejects completing an appointment before its end time', async () => {
        const appointment = await appointmentsRepository.create(appointmentData(new Date(Date.now() + 60_000)));
        await expect(sut.execute({
            appointmentId: appointment.id,
            userId: 'provider-1',
            userRole: 'PROVIDER',
            status: 'COMPLETED',
        })).rejects.toBeInstanceOf(BusinessRuleError);
    });

    it('does not allow clients to complete an appointment', async () => {
        const appointment = await appointmentsRepository.create(appointmentData(new Date(Date.now() - 60_000)));
        await expect(sut.execute({
            appointmentId: appointment.id,
            userId: 'client-1',
            userRole: 'CLIENT',
            status: 'COMPLETED',
        })).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('rejects transition back to PENDING from a pending appointment', async () => {
        const appointment = await appointmentsRepository.create(appointmentData(new Date(Date.now() + 60_000)));
        await expect(sut.execute({
            appointmentId: appointment.id,
            userId: 'provider-1',
            userRole: 'PROVIDER',
            status: 'PENDING',
        })).rejects.toBeInstanceOf(BusinessRuleError);
    });

    it('rejects a provider who is not the appointment provider', async () => {
        const appointment = await appointmentsRepository.create(appointmentData(new Date(Date.now() + 60_000)));
        await expect(sut.execute({
            appointmentId: appointment.id,
            userId: 'provider-2',
            userRole: 'PROVIDER',
            status: 'CANCELLED',
        })).rejects.toBeInstanceOf(UnauthorizedAppointmentAccessError);
    });

    it('rejects a client who does not own the appointment', async () => {
        const appointment = await appointmentsRepository.create(appointmentData(new Date(Date.now() + 60_000)));
        await expect(sut.execute({
            appointmentId: appointment.id,
            userId: 'other-client',
            userRole: 'CLIENT',
            status: 'CANCELLED',
        })).rejects.toBeInstanceOf(UnauthorizedAppointmentAccessError);
    });

    it('returns not found when the appointment does not exist', async () => {
        await expect(sut.execute({
            appointmentId: 'missing-appointment',
            userId: 'provider-1',
            userRole: 'PROVIDER',
            status: 'CANCELLED',
        })).rejects.toBeInstanceOf(AppointmentNotFoundError);
    });
});
