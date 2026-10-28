import type { Appointment, Prisma } from '@prisma/client';

export interface AppointmentListFilters {
    page: number;
    perPage: number;
    status?: Appointment['status'];
    from?: Date;
    to?: Date;
}

export interface PaginatedAppointments {
    appointments: Appointment[];
    total: number;
}

export interface AppointmentsRepository {
    findById(id: string): Promise<Appointment | null>;
    findMany(filters: AppointmentListFilters): Promise<PaginatedAppointments>;
    findManyByUserId(userId: string, filters: AppointmentListFilters): Promise<PaginatedAppointments>;
    findManyByProviderId(providerId: string): Promise<Appointment[]>;
    findManyByProviderIdAndDateRange(
        providerId: string,
        startTime: Date,
        endTime: Date,
    ): Promise<Appointment[]>;
    findByServiceAndDate(serviceId: string, date: Date): Promise<Appointment | null>;
    findConflictingAppointment(
        providerId: string,
        startTime: Date,
        endTime: Date,
    ): Promise<Appointment | null>;
    create(data: Prisma.AppointmentUncheckedCreateInput): Promise<Appointment>;
    save(appointment: Appointment): Promise<Appointment>;
}