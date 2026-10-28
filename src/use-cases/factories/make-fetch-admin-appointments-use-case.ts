import { PrismaAppointmentsRepository } from '../../repositories/prisma/prisma-appointments-repository.js';
import { FetchAdminAppointmentsUseCase } from '../appointments/fetch-admin-appointments.js';

export function makeFetchAdminAppointmentsUseCase() {
    const appointmentsRepository = new PrismaAppointmentsRepository();
    return new FetchAdminAppointmentsUseCase(appointmentsRepository);
}
