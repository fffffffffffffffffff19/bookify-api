import type { Appointment, Prisma } from '@prisma/client';
import type {
    AppointmentListFilters,
    AppointmentsRepository,
    PaginatedAppointments,
} from '../appointments-repository.js';
import { randomUUID } from 'node:crypto';

export class InMemoryAppointmentsRepository implements AppointmentsRepository {
    public items: Appointment[] = [];

    async findById(id: string): Promise<Appointment | null> {
        const appointment = this.items.find((item) => item.id === id);
        return appointment ?? null;
    }

    async findMany(filters: AppointmentListFilters): Promise<PaginatedAppointments> {
        return this.filterAndPaginate(this.items, filters);
    }

    async findManyByUserId(
        userId: string,
        filters: AppointmentListFilters,
    ): Promise<PaginatedAppointments> {
        return this.filterAndPaginate(
            this.items.filter((item) => item.clientId === userId || item.providerId === userId),
            filters,
        );
    }

    private filterAndPaginate(
        appointments: Appointment[],
        filters: AppointmentListFilters,
    ): PaginatedAppointments {
        const filtered = appointments
            .filter((appointment) => !filters.status || appointment.status === filters.status)
            .filter((appointment) => !filters.from || appointment.startTime >= filters.from)
            .filter((appointment) => !filters.to || appointment.startTime < filters.to)
            .sort((left, right) =>
                left.startTime.getTime() - right.startTime.getTime() || left.id.localeCompare(right.id),
            );
        const offset = (filters.page - 1) * filters.perPage;

        return {
            appointments: filtered.slice(offset, offset + filters.perPage),
            total: filtered.length,
        };
    }

    async findManyByProviderId(providerId: string): Promise<Appointment[]> {
        return this.items.filter((item) => item.providerId === providerId);
    }

    async findManyByProviderIdAndDateRange(
        providerId: string,
        startTime: Date,
        endTime: Date,
    ): Promise<Appointment[]> {
        return this.items.filter(
            (item) =>
                item.providerId === providerId &&
                item.status !== 'CANCELLED' &&
                item.startTime < endTime &&
                item.endTime > startTime,
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