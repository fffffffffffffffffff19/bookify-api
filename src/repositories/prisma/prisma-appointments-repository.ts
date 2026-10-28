import { prisma } from '../../lib/prisma.js';
import { Prisma, type Appointment } from '@prisma/client';
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

    async createIfNoConflict(data: Prisma.AppointmentUncheckedCreateInput) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                return await prisma.$transaction(async (transaction) => {
                    const conflict = await transaction.appointment.findFirst({
                        where: {
                            providerId: data.providerId,
                            status: { not: 'CANCELLED' },
                            startTime: { lt: new Date(data.endTime) },
                            endTime: { gt: new Date(data.startTime) },
                        },
                        select: { id: true },
                    });

                    if (conflict) {
                        return null;
                    }

                    return transaction.appointment.create({ data });
                }, {
                    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                });
            } catch (error) {
                const isSerializationConflict =
                    typeof error === 'object' &&
                    error !== null &&
                    'code' in error &&
                    error.code === 'P2034';

                if (!isSerializationConflict || attempt === 2) {
                    throw error;
                }
            }
        }

        return null;
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

    async rescheduleIfAvailable(id: string, startTime: Date, endTime: Date) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                return await prisma.$transaction(async (transaction) => {
                    const appointment = await transaction.appointment.findFirst({
                        where: { id, status: 'PENDING' },
                        select: { providerId: true },
                    });
                    if (!appointment) return null;

                    const conflict = await transaction.appointment.findFirst({
                        where: {
                            id: { not: id },
                            providerId: appointment.providerId,
                            status: { not: 'CANCELLED' },
                            startTime: { lt: endTime },
                            endTime: { gt: startTime },
                        },
                        select: { id: true },
                    });
                    if (conflict) return null;

                    const updated = await transaction.appointment.updateMany({
                        where: { id, status: 'PENDING' },
                        data: { startTime, endTime },
                    });
                    if (updated.count !== 1) return null;

                    return transaction.appointment.findUnique({ where: { id } });
                }, {
                    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                });
            } catch (error) {
                const isSerializationConflict =
                    typeof error === 'object' &&
                    error !== null &&
                    'code' in error &&
                    error.code === 'P2034';

                if (!isSerializationConflict || attempt === 2) throw error;
            }
        }

        return null;
    }

    async transitionStatus(
        id: string,
        expectedStatus: Appointment['status'],
        status: Appointment['status'],
    ) {
        const updated = await prisma.appointment.updateMany({
            where: { id, status: expectedStatus },
            data: { status },
        });
        if (updated.count !== 1) return null;

        return prisma.appointment.findUnique({ where: { id } });
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