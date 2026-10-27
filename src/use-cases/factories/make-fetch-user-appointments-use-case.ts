import { PrismaAppointmentsRepository } from '../../repositories/prisma/prisma-appointments-repository.js';
import { FetchUserAppointmentsUseCase } from '../appointments/fetch-user-appointments.js';

export function makeFetchUserAppointmentsUseCase() {
    const appointmentsRepository = new PrismaAppointmentsRepository();
    const useCase = new FetchUserAppointmentsUseCase(appointmentsRepository);

    return useCase;
}