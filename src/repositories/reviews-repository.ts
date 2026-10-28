import type { Prisma, Review } from '@prisma/client';

export interface ReviewsRepository {
    findByAppointmentId(appointmentId: string): Promise<Review | null>;
    create(data: Prisma.ReviewUncheckedCreateInput): Promise<Review>;
}