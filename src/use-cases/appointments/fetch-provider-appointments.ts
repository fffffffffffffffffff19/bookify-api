import type { Appointment } from '@prisma/client';
import type { AppointmentsRepository } from '../../repositories/appointments-repository.js';

interface FetchProviderAppointmentsUseCaseRequest {
    providerId: string;
}

interface FetchProviderAppointmentsUseCaseResponse {
    appointments: Appointment[];
}

export class FetchProviderAppointmentsUseCase {
    constructor(private appointmentsRepository: AppointmentsRepository) { }

    async execute({
        providerId,
    }: FetchProviderAppointmentsUseCaseRequest): Promise<FetchProviderAppointmentsUseCaseResponse> {
        const appointments = await this.appointmentsRepository.findManyByProviderId(providerId);

        return { appointments };
    }
}