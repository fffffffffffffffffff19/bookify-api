import type { AppointmentsRepository } from '../../repositories/appointments-repository.js';
import type { ServicesRepository } from '../../repositories/services-repository.js';
import type { Appointment } from '@prisma/client';

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

        if (startTime < new Date()) {
            throw new Error('Cannot create an appointment in the past.');
        }

        const conflictingAppointment = await this.appointmentsRepository.findByServiceAndDate(
            serviceId,
            startTime,
        );

        if (conflictingAppointment) {
            throw new Error('This time slot is already booked for this service.');
        }

        const durationInMinutes = Number(service.durationInMinutes);
        const endTime = new Date(startTime.getTime() + durationInMinutes * 60 * 1000);

        const appointment = await this.appointmentsRepository.create({
            clientId,
            providerId: service.userId,
            serviceId,
            startTime,
            endTime,
        });

        return {
            appointment,
        };
    }
}