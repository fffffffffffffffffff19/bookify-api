import type { Appointment } from '@prisma/client';
import type { AppointmentsRepository } from '../../repositories/appointments-repository.js';
import type { ServicesRepository } from '../../repositories/services-repository.js';
import type { BusinessHoursRepository } from '../../repositories/business-hours-repository.js';
import {
    BusinessRuleError,
    ResourceConflictError,
    ResourceNotFoundError,
} from '../../errors/application-error.js';

interface CreateAppointmentUseCaseRequest {
    clientId: string;
    serviceId: string;
    startTime: Date;
}

interface CreateAppointmentUseCaseResponse {
    appointment: Appointment;
}

export class CreateAppointmentUseCase {
    constructor(
        private appointmentsRepository: AppointmentsRepository,
        private servicesRepository: ServicesRepository,
        private businessHoursRepository: BusinessHoursRepository,
    ) { }

    async execute({
        clientId,
        serviceId,
        startTime,
    }: CreateAppointmentUseCaseRequest): Promise<CreateAppointmentUseCaseResponse> {
        const service = await this.servicesRepository.findById(serviceId);

        if (!service) {
            throw new ResourceNotFoundError('Service not found.');
        }

        const durationInMs = service.durationInMinutes * 60 * 1000;
        const endTime = new Date(startTime.getTime() + durationInMs);
        const businessHours = await this.businessHoursRepository.getCurrent();

        const dayOfWeek = startTime.getDay();
        const isAllowedDay = businessHours.allowedDays.includes(dayOfWeek);

        if (!isAllowedDay) {
            throw new BusinessRuleError('Appointments cannot be scheduled on non-working days.', 'NON_WORKING_DAY');
        }

        const startHour = startTime.getHours();
        const endHour = endTime.getHours();
        const endMinutes = endTime.getMinutes();

        const { openHour, closeHour } = businessHours;

        if (
            startHour < openHour ||
            endHour > closeHour ||
            (endHour === closeHour && endMinutes > 0)
        ) {
            throw new BusinessRuleError(
                `Appointments must be within business hours (${String(openHour).padStart(2, '0')}:00 - ${String(closeHour).padStart(2, '0')}:00).`
            );
        }

        const conflictingAppointment = await this.appointmentsRepository.findConflictingAppointment(
            service.userId,
            startTime,
            endTime,
        );

        if (conflictingAppointment) {
            throw new ResourceConflictError('This time slot is already booked.', 'BOOKING_CONFLICT');
        }

        const appointment = await this.appointmentsRepository.create({
            clientId,
            providerId: service.userId,
            serviceId,
            startTime,
            endTime,
            status: 'PENDING',
        });

        return {
            appointment,
        };
    }
}