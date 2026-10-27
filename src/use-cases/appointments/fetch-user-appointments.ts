import type { AppointmentsRepository } from '../../repositories/appointments-repository.js';
import type { Appointment } from '@prisma/client';

interface FetchUserAppointmentsUseCaseRequest {
    userId: string;
}

interface FetchUserAppointmentsUseCaseResponse {
    appointments: Appointment[];
}

export class FetchUserAppointmentsUseCase {
    constructor(private appointmentsRepository: AppointmentsRepository) { }

    async execute({
        userId,
    }: FetchUserAppointmentsUseCaseRequest): Promise<FetchUserAppointmentsUseCaseResponse> {
        const appointments = await this.appointmentsRepository.findManyByUserId(userId);

        return {
            appointments,
        };
    }
}