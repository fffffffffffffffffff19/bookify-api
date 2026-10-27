import type { Appointment } from '@prisma/client';
import type { AppointmentsRepository } from '../../repositories/appointments-repository.js';
import type { ServicesRepository } from '../../repositories/services-repository.js';
import { businessHoursConfig } from '../../config/business-hours.js';

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
    ) { }

    async execute({
        clientId,
        serviceId,
        startTime,
    }: CreateAppointmentUseCaseRequest): Promise<CreateAppointmentUseCaseResponse> {
        const service = await this.servicesRepository.findById(serviceId);

        if (!service) {
            throw new Error('Service not found.');
        }

        const durationInMs = service.durationInMinutes * 60 * 1000;
        const endTime = new Date(startTime.getTime() + durationInMs);

        const dayOfWeek = startTime.getDay();
        const isAllowedDay = businessHoursConfig.allowedDays.includes(dayOfWeek);

        if (!isAllowedDay) {
            throw new Error('Appointments cannot be scheduled on non-working days.');
        }

        const startHour = startTime.getHours();
        const endHour = endTime.getHours();
        const endMinutes = endTime.getMinutes();

        const { openHour, closeHour } = businessHoursConfig;

        if (
            startHour < openHour ||
            endHour > closeHour ||
            (endHour === closeHour && endMinutes > 0)
        ) {
            throw new Error(
                `Appointments must be within business hours (${String(openHour).padStart(2, '0')}:00 - ${String(closeHour).padStart(2, '0')}:00).`
            );
        }

        const conflictingAppointment = await this.appointmentsRepository.findConflictingAppointment(
            service.userId,
            startTime,
            endTime,
        );

        if (conflictingAppointment) {
            throw new Error('This time slot is already booked.');
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