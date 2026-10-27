import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { makeCreateServiceUseCase } from '../../use-cases/factories/make-create-service-use-case.js';

export async function createService(request: FastifyRequest, reply: FastifyReply) {
    const createServiceBodySchema = z.object({
        title: z.string(),
        description: z.string().optional(),
        price: z.number(),
        durationInMinutes: z.number().int().positive(),
    });

    const { title, description, price, durationInMinutes } = createServiceBodySchema.parse(request.body);

    const createServiceUseCase = makeCreateServiceUseCase();

    const { service } = await createServiceUseCase.execute({
        title,
        description: description ?? null,
        price,
        durationInMinutes,
        userId: request.user.sub,
    });

    return reply.status(201).send({
        service,
    });
}