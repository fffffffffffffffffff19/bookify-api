import type { Review } from '@prisma/client';
import {
    BusinessRuleError,
    ForbiddenError,
    ResourceConflictError,
    ResourceNotFoundError,
} from '../../errors/application-error.js';
import type { AppointmentsRepository } from '../../repositories/appointments-repository.js';
import type { ReviewsRepository } from '../../repositories/reviews-repository.js';

interface CreateReviewUseCaseRequest {
    appointmentId: string;
    clientId: string;
    rating: number;
    comment?: string;
}

interface CreateReviewUseCaseResponse {
    review: Review;
}

export class CreateReviewUseCase {
    constructor(
        private appointmentsRepository: AppointmentsRepository,
        private reviewsRepository: ReviewsRepository,
    ) { }

    async execute({
        appointmentId,
        clientId,
        rating,
        comment,
    }: CreateReviewUseCaseRequest): Promise<CreateReviewUseCaseResponse> {
        const appointment = await this.appointmentsRepository.findById(appointmentId);
        if (!appointment) {
            throw new ResourceNotFoundError('Appointment not found.');
        }

        if (appointment.clientId !== clientId) {
            throw new ForbiddenError('You can only review your own appointments.');
        }

        if (appointment.status !== 'COMPLETED') {
            throw new BusinessRuleError(
                'Only completed appointments can be reviewed.',
                'APPOINTMENT_NOT_COMPLETED',
            );
        }

        const existingReview = await this.reviewsRepository.findByAppointmentId(appointmentId);
        if (existingReview) {
            throw new ResourceConflictError(
                'This appointment has already been reviewed.',
                'REVIEW_ALREADY_EXISTS',
            );
        }

        const review = await this.reviewsRepository.create({
            appointmentId,
            clientId,
            rating,
            comment,
        });

        return { review };
    }
}