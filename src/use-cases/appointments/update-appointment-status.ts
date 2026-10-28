import type { Appointment } from '@prisma/client';
import type { AppointmentsRepository } from '../../repositories/appointments-repository.js';
import {
    BusinessRuleError,
    ForbiddenError,
    ResourceNotFoundError,
} from '../../errors/application-error.js';

interface UpdateAppointmentStatusUseCaseRequest {
    appointmentId: string;
    userId: string;
    userRole: 'CLIENT' | 'PROVIDER' | 'ADMIN';
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
}

interface UpdateAppointmentStatusUseCaseResponse {
    appointment: Appointment;
}

export class AppointmentNotFoundError extends ResourceNotFoundError {
    constructor() {
        super('Appointment not found.');
    }
}

export class UnauthorizedAppointmentAccessError extends ForbiddenError {
    constructor() {
        super('Not authorized.');
    }
}

export class UpdateAppointmentStatusUseCase {
    constructor(private appointmentsRepository: AppointmentsRepository) { }

    async execute({
        appointmentId,
        userId,
        userRole,
        status,
    }: UpdateAppointmentStatusUseCaseRequest): Promise<UpdateAppointmentStatusUseCaseResponse> {
        const appointment = await this.appointmentsRepository.findById(appointmentId);

        if (!appointment) {
            throw new AppointmentNotFoundError();
        }

        const isAuthorized =
            userRole === 'ADMIN' ||
            (userRole === 'CLIENT' && appointment.clientId === userId) ||
            (userRole === 'PROVIDER' && appointment.providerId === userId);
        if (!isAuthorized) {
            throw new UnauthorizedAppointmentAccessError();
        }

        if (appointment.status !== 'PENDING') {
            throw new BusinessRuleError(
                `Appointments in ${appointment.status} status cannot transition to another status.`,
                'INVALID_STATUS_TRANSITION',
            );
        }

        if (status === 'PENDING') {
            throw new BusinessRuleError(
                'Appointments cannot transition back to PENDING.',
                'INVALID_STATUS_TRANSITION',
            );
        }

        if (userRole === 'CLIENT' && status !== 'CANCELLED') {
            throw new ForbiddenError('Clients may only cancel their own pending appointments.');
        }

        if (status === 'COMPLETED' && appointment.endTime > new Date()) {
            throw new BusinessRuleError(
                'An appointment cannot be completed before its scheduled end time.',
                'APPOINTMENT_NOT_FINISHED',
            );
        }

        appointment.status = status;
        const updatedAppointment = await this.appointmentsRepository.save(appointment);

        return { appointment: updatedAppointment };
    }
}