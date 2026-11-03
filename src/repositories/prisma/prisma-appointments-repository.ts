import { prisma } from '../../lib/prisma.js';
import { Prisma, type Appointment } from '@prisma/client';
import type {
    AppointmentListFilters,
    AppointmentsRepository,
} from '../appointments-repository.js';

function isSerializationConflict(error: unknown) {
    if (typeof error !== 'object' || error === null) return false;

    const errorRecord = error as { code?: unknown; cause?: { code?: unknown } };
    return errorRecord.code === 'P2034' ||
        errorRecord.code === '40001' ||
        errorRecord.cause?.code === '40001';
}

export class PrismaAppointmentsRepository implements AppointmentsRepository {
    async create(data: Prisma.AppointmentUncheckedCreateInput) {
        return prisma.$transaction(async (transaction) => {
            const appointment = await transaction.appointment.create({ data });
            await this.createOutboxEvent(transaction, appointment, 'appointment.created');
            return appointment;
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
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

                    const appointment = await transaction.appointment.create({ data });
                    await this.createOutboxEvent(transaction, appointment, 'appointment.created');
                    return appointment;
                }, {
                    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                });
            } catch (error) {
                if (!isSerializationConflict(error)) throw error;
                if (attempt === 2) return null;
            }
        }

        return null;
    }

    async findByServiceAndDate(serviceId: string, startTime: Date) {
        const appointment = await prisma.appointment.findFirst({
            where: {
                serviceId,
                startTime,
                status: { not: 'CANCELLED' },
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
                if (!isSerializationConflict(error) || attempt === 2) throw error;
            }
        }

        return null;
    }

    async transitionStatus(
        id: string,
        expectedStatus: Appointment['status'],
        status: Appointment['status'],
    ) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                return await prisma.$transaction(async (transaction) => {
                    const updated = await transaction.appointment.updateMany({
                        where: { id, status: expectedStatus },
                        data: { status },
                    });
                    if (updated.count !== 1) return null;

                    const appointment = await transaction.appointment.findUnique({ where: { id } });
                    if (appointment && status === 'CANCELLED') {
                        await this.createOutboxEvent(transaction, appointment, 'appointment.cancelled');
                    }
                    return appointment;
                }, {
                    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                });
            } catch (error) {
                if (!isSerializationConflict(error) || attempt === 2) throw error;
            }
        }

        return null;
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

    private async createOutboxEvent(
        transaction: Prisma.TransactionClient,
        appointment: Appointment,
        eventType: string,
    ) {
        await transaction.outboxEvent.create({
            data: {
                aggregateType: 'Appointment',
                aggregateId: appointment.id,
                eventType,
                payload: {
                    appointmentId: appointment.id,
                    clientId: appointment.clientId,
                    providerId: appointment.providerId,
                    serviceId: appointment.serviceId,
                    startTime: appointment.startTime.toISOString(),
                    endTime: appointment.endTime.toISOString(),
                },
            },
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