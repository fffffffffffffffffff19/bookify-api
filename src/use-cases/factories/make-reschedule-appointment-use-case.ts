import { PrismaAppointmentsRepository } from '../../repositories/prisma/prisma-appointments-repository.js';
import { PrismaBusinessHoursRepository } from '../../repositories/prisma/prisma-business-hours-repository.js';
import { PrismaServicesRepository } from '../../repositories/prisma/prisma-services-repository.js';
import { RescheduleAppointmentUseCase } from '../appointments/reschedule-appointment.js';

export function makeRescheduleAppointmentUseCase() {
    return new RescheduleAppointmentUseCase(
        new PrismaAppointmentsRepository(),
        new PrismaServicesRepository(),
        new PrismaBusinessHoursRepository(),
    );
}