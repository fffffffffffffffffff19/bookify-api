import { PrismaAppointmentsRepository } from '../../repositories/prisma/prisma-appointments-repository.js';
import { UpdateAppointmentStatusUseCase } from '../appointments/update-appointment-status.js';

export function makeUpdateAppointmentStatusUseCase() {
    const appointmentsRepository = new PrismaAppointmentsRepository();
    return new UpdateAppointmentStatusUseCase(appointmentsRepository);
}