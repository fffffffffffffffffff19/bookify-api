import type { Appointment } from '@prisma/client';
import type { AppointmentsRepository } from '../../repositories/appointments-repository.js';

interface FetchAdminAppointmentsUseCaseResponse {
    appointments: Appointment[];
}

export class FetchAdminAppointmentsUseCase {
    constructor(private appointmentsRepository: AppointmentsRepository) { }

    async execute(): Promise<FetchAdminAppointmentsUseCaseResponse> {
        const appointments = await this.appointmentsRepository.findMany();

        return { appointments };
    }
}
