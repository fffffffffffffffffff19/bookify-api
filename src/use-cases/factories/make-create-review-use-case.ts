import { PrismaAppointmentsRepository } from '../../repositories/prisma/prisma-appointments-repository.js';
import { PrismaReviewsRepository } from '../../repositories/prisma/prisma-reviews-repository.js';
import { CreateReviewUseCase } from '../reviews/create-review.js';

export function makeCreateReviewUseCase() {
    return new CreateReviewUseCase(
        new PrismaAppointmentsRepository(),
        new PrismaReviewsRepository(),
    );
}