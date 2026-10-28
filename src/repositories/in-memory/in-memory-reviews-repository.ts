import type { Prisma, Review } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { ReviewsRepository } from '../reviews-repository.js';

export class InMemoryReviewsRepository implements ReviewsRepository {
    public items: Review[] = [];

    async findByAppointmentId(appointmentId: string): Promise<Review | null> {
        return this.items.find((review) => review.appointmentId === appointmentId) ?? null;
    }

    async create(data: Prisma.ReviewUncheckedCreateInput): Promise<Review> {
        const review: Review = {
            id: randomUUID(),
            rating: data.rating,
            comment: data.comment ?? null,
            appointmentId: data.appointmentId,
            clientId: data.clientId,
            createdAt: new Date(),
        };
        this.items.push(review);
        return review;
    }
}