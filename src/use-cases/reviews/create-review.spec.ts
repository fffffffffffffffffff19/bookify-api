import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryAppointmentsRepository } from '../../repositories/in-memory/in-memory-appointments-repository.js';
import { InMemoryReviewsRepository } from '../../repositories/in-memory/in-memory-reviews-repository.js';
import {
    BusinessRuleError,
    ForbiddenError,
    ResourceConflictError,
    ResourceNotFoundError,
} from '../../errors/application-error.js';
import { CreateReviewUseCase } from './create-review.js';

let appointmentsRepository: InMemoryAppointmentsRepository;
let reviewsRepository: InMemoryReviewsRepository;
let sut: CreateReviewUseCase;
let appointmentId: string;

describe('Create Review Use Case', () => {
    beforeEach(async () => {
        appointmentsRepository = new InMemoryAppointmentsRepository();
        reviewsRepository = new InMemoryReviewsRepository();
        sut = new CreateReviewUseCase(appointmentsRepository, reviewsRepository);
        const appointment = await appointmentsRepository.create({
            clientId: 'client-1',
            providerId: 'provider-1',
            serviceId: 'service-1',
            startTime: new Date('2026-10-27T10:00:00.000Z'),
            endTime: new Date('2026-10-27T10:30:00.000Z'),
            status: 'COMPLETED',
        });
        appointmentId = appointment.id;
    });

    it('creates a review for the owning client of a completed appointment', async () => {
        const { review } = await sut.execute({
            appointmentId,
            clientId: 'client-1',
            rating: 5,
            comment: 'Great service',
        });

        expect(review).toMatchObject({
            appointmentId,
            clientId: 'client-1',
            rating: 5,
            comment: 'Great service',
        });
        expect(reviewsRepository.items).toHaveLength(1);
    });

    it('returns not found when the appointment does not exist', async () => {
        await expect(sut.execute({
            appointmentId: 'missing-appointment',
            clientId: 'client-1',
            rating: 4,
        })).rejects.toBeInstanceOf(ResourceNotFoundError);
    });

    it('rejects clients who do not own the appointment', async () => {
        await expect(sut.execute({
            appointmentId,
            clientId: 'client-2',
            rating: 4,
        })).rejects.toBeInstanceOf(ForbiddenError);
    });

    it.each(['PENDING', 'CONFIRMED', 'CANCELLED'] as const)(
        'rejects reviews for %s appointments', async (status) => {
            const appointment = await appointmentsRepository.findById(appointmentId);
            if (appointment) {
                appointment.status = status;
                await appointmentsRepository.save(appointment);
            }

            await expect(sut.execute({
                appointmentId,
                clientId: 'client-1',
                rating: 4,
            })).rejects.toBeInstanceOf(BusinessRuleError);
        },
    );

    it('rejects a second review for the same appointment', async () => {
        await sut.execute({ appointmentId, clientId: 'client-1', rating: 5 });

        await expect(sut.execute({
            appointmentId,
            clientId: 'client-1',
            rating: 4,
        })).rejects.toBeInstanceOf(ResourceConflictError);
    });
});