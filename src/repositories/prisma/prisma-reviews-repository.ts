import { prisma } from '../../lib/prisma.js';
import type { Prisma } from '@prisma/client';
import type { ReviewsRepository } from '../reviews-repository.js';

export class PrismaReviewsRepository implements ReviewsRepository {
    async findByAppointmentId(appointmentId: string) {
        return prisma.review.findUnique({
            where: { appointmentId },
        });
    }

    async create(data: Prisma.ReviewUncheckedCreateInput) {
        return prisma.review.create({ data });
    }
}