import type { Appointment } from '@prisma/client';
import {
    BusinessRuleError,
    ForbiddenError,
    ResourceConflictError,
    ResourceNotFoundError,
} from '../../errors/application-error.js';
import type { AppointmentsRepository } from '../../repositories/appointments-repository.js';
import type { BusinessHoursRepository } from '../../repositories/business-hours-repository.js';
import type { ServicesRepository } from '../../repositories/services-repository.js';

interface RescheduleAppointmentUseCaseRequest {
    appointmentId: string;
    userId: string;
    userRole: 'CLIENT' | 'PROVIDER' | 'ADMIN';
    startTime: Date;
}

interface RescheduleAppointmentUseCaseResponse {
    appointment: Appointment;
}

export class RescheduleAppointmentUseCase {
    constructor(
        private appointmentsRepository: AppointmentsRepository,
        private servicesRepository: ServicesRepository,
        private businessHoursRepository: BusinessHoursRepository,
    ) { }

    async execute({
        appointmentId,
        userId,
        userRole,
        startTime,
    }: RescheduleAppointmentUseCaseRequest): Promise<RescheduleAppointmentUseCaseResponse> {
        if (startTime <= new Date()) {
            throw new BusinessRuleError('Appointments must be scheduled in the future.', 'PAST_APPOINTMENT');
        }

        const appointment = await this.appointmentsRepository.findById(appointmentId);
        if (!appointment) {
            throw new ResourceNotFoundError('Appointment not found.');
        }

        const isParticipant = appointment.clientId === userId || appointment.providerId === userId;
        if (userRole !== 'ADMIN' && !isParticipant) {
            throw new ForbiddenError();
        }

        if (appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') {
            throw new BusinessRuleError('This appointment cannot be rescheduled.', 'APPOINTMENT_NOT_RESCHEDULABLE');
        }

        const service = await this.servicesRepository.findById(appointment.serviceId);
        if (!service) {
            throw new ResourceNotFoundError('Service not found.');
        }

        const endTime = new Date(startTime.getTime() + service.durationInMinutes * 60 * 1000);
        const businessHours = await this.businessHoursRepository.getCurrent();
        if (!businessHours.allowedDays.includes(startTime.getDay())) {
            throw new BusinessRuleError('Appointments cannot be scheduled on non-working days.', 'NON_WORKING_DAY');
        }

        const openingTime = new Date(startTime);
        openingTime.setHours(businessHours.openHour, 0, 0, 0);
        const closingTime = new Date(startTime);
        closingTime.setHours(businessHours.closeHour, 0, 0, 0);
        if (startTime < openingTime || endTime > closingTime) {
            throw new BusinessRuleError(
                `Appointments must be within business hours (${String(businessHours.openHour).padStart(2, '0')}:00 - ${String(businessHours.closeHour).padStart(2, '0')}:00).`,
            );
        }

        const updatedAppointment = await this.appointmentsRepository.rescheduleIfAvailable(
            appointment.id,
            startTime,
            endTime,
        );
        if (!updatedAppointment) {
            throw new ResourceConflictError('This time slot is already booked.', 'BOOKING_CONFLICT');
        }

        return { appointment: updatedAppointment };
    }
}