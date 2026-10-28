import { PrismaAppointmentsRepository } from '../../repositories/prisma/prisma-appointments-repository.js';
import { PrismaServicesRepository } from '../../repositories/prisma/prisma-services-repository.js';
import { PrismaBusinessHoursRepository } from '../../repositories/prisma/prisma-business-hours-repository.js';
import { FetchServiceAvailabilityUseCase } from '../appointments/fetch-service-availability.js';

export function makeFetchServiceAvailabilityUseCase() {
    const appointmentsRepository = new PrismaAppointmentsRepository();
    const servicesRepository = new PrismaServicesRepository();
    const businessHoursRepository = new PrismaBusinessHoursRepository();
    return new FetchServiceAvailabilityUseCase(
        appointmentsRepository,
        servicesRepository,
        businessHoursRepository,
    );
}