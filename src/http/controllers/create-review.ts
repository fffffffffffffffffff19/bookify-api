import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { makeCreateReviewUseCase } from '../../use-cases/factories/make-create-review-use-case.js';

const createReviewParamsSchema = z.object({
    id: z.string().uuid(),
});

const createReviewBodySchema = z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(500).optional(),
});

export async function createReview(request: FastifyRequest, reply: FastifyReply) {
    const { id: appointmentId } = createReviewParamsSchema.parse(request.params);
    const { rating, comment } = createReviewBodySchema.parse(request.body);
    const useCase = makeCreateReviewUseCase();
    const { review } = await useCase.execute({
        appointmentId,
        clientId: request.user.sub,
        rating,
        comment,
    });

    return reply.status(201).send({ review });
}