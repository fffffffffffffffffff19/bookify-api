import { PrismaAppointmentsRepository } from '../../repositories/prisma/prisma-appointments-repository.js';
import { CancelAppointmentUseCase } from '../appointments/cancel-appointment.js';

export function makeCancelAppointmentUseCase() {
    const appointmentsRepository = new PrismaAppointmentsRepository();
    const useCase = new CancelAppointmentUseCase(appointmentsRepository);

    return useCase;
}