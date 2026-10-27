import { PrismaAppointmentsRepository } from '../../repositories/prisma/prisma-appointments-repository.js';
import { PrismaServicesRepository } from '../../repositories/prisma/prisma-services-repository.js';
import { CreateAppointmentUseCase } from '../appointments/create-appointment.js';

export function makeCreateAppointmentUseCase() {
    const appointmentsRepository = new PrismaAppointmentsRepository();
    const servicesRepository = new PrismaServicesRepository();

    const useCase = new CreateAppointmentUseCase(appointmentsRepository, servicesRepository);

    return useCase;
}