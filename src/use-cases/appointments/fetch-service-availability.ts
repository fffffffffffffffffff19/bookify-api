import type { Appointment } from '@prisma/client';
import type { AppointmentsRepository } from '../../repositories/appointments-repository.js';
import type { ServicesRepository } from '../../repositories/services-repository.js';
import type { BusinessHoursRepository } from '../../repositories/business-hours-repository.js';

interface FetchServiceAvailabilityUseCaseRequest {
    serviceId: string;
    date: string;
}

interface FetchServiceAvailabilityUseCaseResponse {
    availableSlots: string[];
}

export class ServiceNotFoundError extends Error {
    constructor() {
        super('Service not found.');
        this.name = 'ServiceNotFoundError';
    }
}

export class InvalidAvailabilityDateError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidAvailabilityDateError';
    }
}

function parseLocalDate(date: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

    if (!match) {
        throw new InvalidAvailabilityDateError('Date must be in YYYY-MM-DD format.');
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const localDate = new Date(year, month - 1, day);

    if (
        localDate.getFullYear() !== year ||
        localDate.getMonth() !== month - 1 ||
        localDate.getDate() !== day
    ) {
        throw new InvalidAvailabilityDateError('Date must be a valid calendar date.');
    }

    return localDate;
}

function formatTime(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export class FetchServiceAvailabilityUseCase {
    constructor(
        private appointmentsRepository: AppointmentsRepository,
        private servicesRepository: ServicesRepository,
        private businessHoursRepository: BusinessHoursRepository,
    ) { }

    async execute({
        serviceId,
        date,
    }: FetchServiceAvailabilityUseCaseRequest): Promise<FetchServiceAvailabilityUseCaseResponse> {
        const service = await this.servicesRepository.findById(serviceId);

        if (!service) {
            throw new ServiceNotFoundError();
        }

        const dayStart = parseLocalDate(date);
        const { allowedDays, openHour, closeHour } = await this.businessHoursRepository.getCurrent();

        if (!allowedDays.includes(dayStart.getDay()) || service.durationInMinutes <= 0) {
            return { availableSlots: [] };
        }

        const dayEnd = new Date(dayStart);
        dayEnd.setHours(closeHour, 0, 0, 0);

        const appointments = await this.appointmentsRepository.findManyByProviderIdAndDateRange(
            service.userId,
            dayStart,
            dayEnd,
        );
        const durationInMs = service.durationInMinutes * 60 * 1000;
        const openingTime = new Date(dayStart);
        openingTime.setHours(openHour, 0, 0, 0);
        const availableSlots: string[] = [];

        for (
            let slotStart = openingTime;
            slotStart.getTime() + durationInMs <= dayEnd.getTime();
            slotStart = new Date(slotStart.getTime() + durationInMs)
        ) {
            const slotEnd = new Date(slotStart.getTime() + durationInMs);
            const isBooked = appointments.some(
                (appointment: Appointment) =>
                    slotStart < appointment.endTime && slotEnd > appointment.startTime,
            );

            if (!isBooked) {
                availableSlots.push(formatTime(slotStart));
            }
        }

        return { availableSlots };
    }
}