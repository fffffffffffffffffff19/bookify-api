import { prisma } from '../../lib/prisma.js';
import type { Prisma } from '@prisma/client';
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
}