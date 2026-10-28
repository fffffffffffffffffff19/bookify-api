import { prisma } from '../../lib/prisma.js';
import type { Prisma, Appointment } from '@prisma/client';
import type { AppointmentsRepository } from '../appointments-repository.js';

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

    async findConflictingAppointment(serviceId: string, startTime: Date, endTime: Date) {
        const appointment = await prisma.appointment.findFirst({
            where: {
                serviceId,
                OR: [
                    {
                        startTime: {
                            gte: startTime,
                            lt: endTime,
                        },
                    },
                    {
                        endTime: {
                            gt: startTime,
                            lte: endTime,
                        },
                    },
                ],
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

    async findMany() {
        return prisma.appointment.findMany();
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

    async findManyByUserId(userId: string) {
        const appointments = await prisma.appointment.findMany({
            where: {
                OR: [
                    { clientId: userId },
                    { providerId: userId },
                ],
            },
        });

        return appointments;
    }

    async findManyByProviderId(providerId: string) {
        return prisma.appointment.findMany({
            where: { providerId },
        });
    }
}