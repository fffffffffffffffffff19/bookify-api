import type { Appointment } from '@prisma/client';
import type {
    AppointmentListFilters,
    AppointmentsRepository,
} from '../../repositories/appointments-repository.js';

interface FetchAdminAppointmentsUseCaseRequest {
    filters?: Partial<AppointmentListFilters>;
}

interface FetchAdminAppointmentsUseCaseResponse {
    appointments: Appointment[];
    pagination: {
        page: number;
        perPage: number;
        total: number;
        totalPages: number;
    };
}

export class FetchAdminAppointmentsUseCase {
    constructor(private appointmentsRepository: AppointmentsRepository) { }

    async execute({ filters = {} }: FetchAdminAppointmentsUseCaseRequest = {}): Promise<FetchAdminAppointmentsUseCaseResponse> {
        const page = filters.page ?? 1;
        const perPage = filters.perPage ?? 20;
        const result = await this.appointmentsRepository.findMany({
            page,
            perPage,
            status: filters.status,
            from: filters.from,
            to: filters.to,
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
