import type {
    AppointmentListFilters,
    AppointmentsRepository,
} from '../../repositories/appointments-repository.js';
import type { Appointment } from '@prisma/client';

interface FetchUserAppointmentsUseCaseRequest {
    userId: string;
    filters?: Partial<AppointmentListFilters>;
}

interface FetchUserAppointmentsUseCaseResponse {
    appointments: Appointment[];
    pagination: {
        page: number;
        perPage: number;
        total: number;
        totalPages: number;
    };
}

export class FetchUserAppointmentsUseCase {
    constructor(private appointmentsRepository: AppointmentsRepository) { }

    async execute({
        userId,
        filters = {},
    }: FetchUserAppointmentsUseCaseRequest): Promise<FetchUserAppointmentsUseCaseResponse> {
        const page = filters.page ?? 1;
        const perPage = filters.perPage ?? 20;
        const result = await this.appointmentsRepository.findManyByUserId(userId, {
            page,
            perPage,
            ...(filters.status !== undefined ? { status: filters.status } : {}),
            ...(filters.from !== undefined ? { from: filters.from } : {}),
            ...(filters.to !== undefined ? { to: filters.to } : {}),
        });

        return {
            appointments: result.appointments,
            pagination: {
                page,
                perPage,
                total: result.total,
                totalPages: Math.ceil(result.total / perPage),
            },
        };
    }
}