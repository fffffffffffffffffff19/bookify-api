import type { Appointment } from '@prisma/client';
import type { AppointmentsRepository } from '../../repositories/appointments-repository.js';
import { ForbiddenError, ResourceNotFoundError } from '../../errors/application-error.js';

interface UpdateAppointmentStatusUseCaseRequest {
    appointmentId: string;
    userId: string;
    userRole: 'PROVIDER' | 'ADMIN';
    status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
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

        if (userRole !== 'ADMIN' && appointment.providerId !== userId) {
            throw new UnauthorizedAppointmentAccessError();
        }

        appointment.status = status;
        const updatedAppointment = await this.appointmentsRepository.save(appointment);

        return { appointment: updatedAppointment };
    }
}