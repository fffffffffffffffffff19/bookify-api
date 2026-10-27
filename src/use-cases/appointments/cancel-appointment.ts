import type { AppointmentsRepository } from '../../repositories/appointments-repository.js';
import type { Appointment } from '@prisma/client';

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
            throw new Error('Appointment not found.');
        }

        if (appointment.clientId !== userId && appointment.providerId !== userId) {
            throw new Error('Not authorized.');
        }

        if (appointment.status === 'CANCELLED') {
            throw new Error('Appointment is already cancelled.');
        }

        if (appointment.startTime < new Date()) {
            throw new Error('Cannot cancel a past appointment.');
        }

        (appointment as any).status = 'CANCELLED';

        await this.appointmentsRepository.save(appointment);

        return {
            appointment,
        };
    }
}