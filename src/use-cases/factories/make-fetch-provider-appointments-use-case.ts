import { PrismaAppointmentsRepository } from '../../repositories/prisma/prisma-appointments-repository.js';
import { FetchProviderAppointmentsUseCase } from '../appointments/fetch-provider-appointments.js';

export function makeFetchProviderAppointmentsUseCase() {
    const appointmentsRepository = new PrismaAppointmentsRepository();
    return new FetchProviderAppointmentsUseCase(appointmentsRepository);
}