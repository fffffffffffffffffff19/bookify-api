import type { Appointment, Prisma } from '@prisma/client';
import type { AppointmentsRepository } from '../appointments-repository.js';
import { randomUUID } from 'node:crypto';

export class InMemoryAppointmentsRepository implements AppointmentsRepository {
    public items: Appointment[] = [];

    async findById(id: string): Promise<Appointment | null> {
        const appointment = this.items.find((item) => item.id === id);
        return appointment ?? null;
    }

    async findManyByUserId(userId: string): Promise<Appointment[]> {
        return this.items.filter(
            (item) => item.clientId === userId || item.providerId === userId
        );
    }

    async findByServiceAndDate(serviceId: string, date: Date): Promise<Appointment | null> {
        const appointment = this.items.find(
            (item) =>
                item.serviceId === serviceId &&
                item.startTime.getTime() === date.getTime() &&
                item.status !== 'CANCELLED'
        );
        return appointment ?? null;
    }

    async findConflictingAppointment(
        providerId: string,
        startTime: Date,
        endTime: Date
    ): Promise<Appointment | null> {
        const conflicting = this.items.find((item) => {
            if (item.providerId !== providerId || item.status === 'CANCELLED') {
                return false;
            }

            return startTime < item.endTime && endTime > item.startTime;
        });

        return conflicting ?? null;
    }

    async create(data: Prisma.AppointmentUncheckedCreateInput): Promise<Appointment> {
        const appointment: Appointment = {
            id: randomUUID(),
            clientId: data.clientId,
            providerId: data.providerId,
            serviceId: data.serviceId,
            startTime: new Date(data.startTime),
            endTime: new Date(data.endTime),
            status: data.status ?? 'PENDING',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        this.items.push(appointment);
        return appointment;
    }

    async save(appointment: Appointment): Promise<Appointment> {
        const index = this.items.findIndex((item) => item.id === appointment.id);

        if (index >= 0) {
            this.items[index] = appointment;
        }

        return appointment;
    }
}