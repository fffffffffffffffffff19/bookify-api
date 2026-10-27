import type { Appointment, Prisma } from '@prisma/client';

export interface AppointmentsRepository {
    create(data: Prisma.AppointmentUncheckedCreateInput): Promise<Appointment>;
    findByServiceAndDate(serviceId: string, startTime: Date): Promise<Appointment | null>;
}