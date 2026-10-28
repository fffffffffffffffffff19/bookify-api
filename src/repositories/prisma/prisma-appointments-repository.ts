import { prisma } from '../../lib/prisma.js';
import type { Prisma, Appointment } from '@prisma/client';
import type {
    AppointmentListFilters,
    AppointmentsRepository,
} from '../appointments-repository.js';

export class PrismaAppointmentsRepository implements AppointmentsRepository {
    async create(data: Prisma.AppointmentUncheckedCreateInput) {
        const appointment = await prisma.appointment.create({
            data,
        });

        return appointment;
    }

    async findByServiceAndDate(serviceId: string, startTime: Date) {
        const appointment = await prisma.appointment.findFirst({
            where: {
                serviceId,
                startTime,
            },
        });

        return appointment;
    }

    async findConflictingAppointment(
        providerId: string,
        startTime: Date,
        endTime: Date,
        excludeAppointmentId?: string,
    ) {
        const appointment = await prisma.appointment.findFirst({
            where: {
                providerId,
                status: { not: 'CANCELLED' },
                startTime: { lt: endTime },
                endTime: { gt: startTime },
                ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
            },
        });

        return appointment;
    }

    async findById(id: string) {
        const appointment = await prisma.appointment.findUnique({
            where: {
                id,
            },
        });

        return appointment;
    }

    async findMany(filters: AppointmentListFilters) {
        const where = this.buildListWhere(filters);
        const [appointments, total] = await prisma.$transaction([
            prisma.appointment.findMany({
                where,
                skip: (filters.page - 1) * filters.perPage,
                take: filters.perPage,
                orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
            }),
            prisma.appointment.count({ where }),
        ]);

        return { appointments, total };
    }

    async save(appointment: Appointment) {
        const updatedAppointment = await prisma.appointment.update({
            where: {
                id: appointment.id,
            },
            data: appointment,
        });

        return updatedAppointment;
    }

    async findManyByUserId(userId: string, filters: AppointmentListFilters) {
        const where: Prisma.AppointmentWhereInput = {
            AND: [
                {
                    OR: [
                        { clientId: userId },
                        { providerId: userId },
                    ],
                },
                this.buildListWhere(filters),
            ],
        };
        const [appointments, total] = await prisma.$transaction([
            prisma.appointment.findMany({
                where,
                skip: (filters.page - 1) * filters.perPage,
                take: filters.perPage,
                orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
            }),
            prisma.appointment.count({ where }),
        ]);

        return { appointments, total };
    }

    private buildListWhere(filters: AppointmentListFilters): Prisma.AppointmentWhereInput {
        return {
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.from || filters.to
                ? {
                    startTime: {
                        ...(filters.from ? { gte: filters.from } : {}),
                        ...(filters.to ? { lt: filters.to } : {}),
                    },
                }
                : {}),
        };
    }

    async findManyByProviderId(providerId: string) {
        return prisma.appointment.findMany({
            where: { providerId },
        });
    }

    async findManyByProviderIdAndDateRange(providerId: string, startTime: Date, endTime: Date) {
        return prisma.appointment.findMany({
            where: {
                providerId,
                status: { not: 'CANCELLED' },
                startTime: { lt: endTime },
                endTime: { gt: startTime },
            },
        });
    }
}