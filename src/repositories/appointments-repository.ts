import type { Appointment, Prisma } from '@prisma/client';

export interface AppointmentsRepository {
    findById(id: string): Promise<Appointment | null>;
    findMany(): Promise<Appointment[]>;
    findManyByUserId(userId: string): Promise<Appointment[]>;
    findByServiceAndDate(serviceId: string, date: Date): Promise<Appointment | null>;
    findConflictingAppointment(
        providerId: string,
        startTime: Date,
        endTime: Date,
    ): Promise<Appointment | null>;
    create(data: Prisma.AppointmentUncheckedCreateInput): Promise<Appointment>;
    save(appointment: Appointment): Promise<Appointment>;
}