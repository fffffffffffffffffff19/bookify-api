import type { AppointmentsRepository } from '../../repositories/appointments-repository.js';
import type { Appointment } from '@prisma/client';
import { BusinessRuleError, ForbiddenError, ResourceNotFoundError } from '../../errors/application-error.js';

interface CancelAppointmentUseCaseRequest {
    appointmentId: string;
    userId: string;
}

interface CancelAppointmentUseCaseResponse {
    appointment: Appointment;
}

export class CancelAppointmentUseCase {
    constructor(private appointmentsRepository: AppointmentsRepository) { }

    async execute({
        appointmentId,
        userId,
    }: CancelAppointmentUseCaseRequest): Promise<CancelAppointmentUseCaseResponse> {
        const appointment = await this.appointmentsRepository.findById(appointmentId);

        if (!appointment) {
            throw new ResourceNotFoundError('Appointment not found.');
        }

        if (appointment.clientId !== userId && appointment.providerId !== userId) {
            throw new ForbiddenError();
        }

        if (appointment.status === 'CANCELLED') {
            throw new BusinessRuleError('Appointment is already cancelled.', 'APPOINTMENT_ALREADY_CANCELLED');
        }

        if (appointment.startTime < new Date()) {
            throw new BusinessRuleError('Cannot cancel a past appointment.', 'PAST_APPOINTMENT');
        }

        (appointment as any).status = 'CANCELLED';

        await this.appointmentsRepository.save(appointment);

        return {
            appointment,
        };
    }
}