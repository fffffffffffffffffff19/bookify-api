import { PrismaAppointmentsRepository } from '../../repositories/prisma/prisma-appointments-repository.js';
import { PrismaServicesRepository } from '../../repositories/prisma/prisma-services-repository.js';
import { PrismaBusinessHoursRepository } from '../../repositories/prisma/prisma-business-hours-repository.js';
import { CreateAppointmentUseCase } from '../appointments/create-appointment.js';

export function makeCreateAppointmentUseCase() {
    const appointmentsRepository = new PrismaAppointmentsRepository();
    const servicesRepository = new PrismaServicesRepository();
    const businessHoursRepository = new PrismaBusinessHoursRepository();

    const useCase = new CreateAppointmentUseCase(
        appointmentsRepository,
        servicesRepository,
        businessHoursRepository,
    );

    return useCase;
}