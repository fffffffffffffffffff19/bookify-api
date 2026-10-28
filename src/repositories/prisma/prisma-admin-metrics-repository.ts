import type { AppointmentStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { AdminMetricsRepository } from '../admin-metrics-repository.js';

export class PrismaAdminMetricsRepository implements AdminMetricsRepository {
    async getAppointmentCountsByStatus(): Promise<Record<AppointmentStatus, number>> {
        const groupedCounts = await prisma.appointment.groupBy({
            by: ['status'],
            _count: { _all: true },
        });
        const counts: Record<AppointmentStatus, number> = {
            PENDING: 0,
            CONFIRMED: 0,
            COMPLETED: 0,
            CANCELLED: 0,
        };

        for (const group of groupedCounts) {
            counts[group.status] = group._count._all;
        }

        return counts;
    }

    async countUsersByRole(role: 'CLIENT' | 'PROVIDER'): Promise<number> {
        return prisma.user.count({ where: { role } });
    }
}