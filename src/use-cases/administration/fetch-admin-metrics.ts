import type { AppointmentStatus } from '@prisma/client';
import type { AdminMetricsRepository } from '../../repositories/admin-metrics-repository.js';

interface FetchAdminMetricsResponse {
    appointments: {
        total: number;
        pending: number;
        confirmed: number;
        completed: number;
        cancelled: number;
    };
    users: {
        clients: number;
        providers: number;
    };
    performance: {
        completionRate: number;
        cancellationRate: number;
    };
}

export class FetchAdminMetricsUseCase {
    constructor(private adminMetricsRepository: AdminMetricsRepository) { }

    async execute(): Promise<FetchAdminMetricsResponse> {
        const [statusCounts, clients, providers] = await Promise.all([
            this.adminMetricsRepository.getAppointmentCountsByStatus(),
            this.adminMetricsRepository.countUsersByRole('CLIENT'),
            this.adminMetricsRepository.countUsersByRole('PROVIDER'),
        ]);
        const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
        const rate = (count: number) => total === 0 ? 0 : Math.round((count / total) * 1000) / 10;

        const appointmentCount = (status: AppointmentStatus) => statusCounts[status];

        return {
            appointments: {
                total,
                pending: appointmentCount('PENDING'),
                confirmed: appointmentCount('CONFIRMED'),
                completed: appointmentCount('COMPLETED'),
                cancelled: appointmentCount('CANCELLED'),
            },
            users: { clients, providers },
            performance: {
                completionRate: rate(appointmentCount('COMPLETED')),
                cancellationRate: rate(appointmentCount('CANCELLED')),
            },
        };
    }
}