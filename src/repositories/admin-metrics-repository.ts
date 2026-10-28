import type { AppointmentStatus } from '@prisma/client';

export interface AdminMetricsRepository {
    getAppointmentCountsByStatus(): Promise<Record<AppointmentStatus, number>>;
    countUsersByRole(role: 'CLIENT' | 'PROVIDER'): Promise<number>;
}