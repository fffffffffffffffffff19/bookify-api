import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { makeUpdateServiceUseCase } from '../../use-cases/factories/make-update-service-use-case.js';

export async function updateService(request: FastifyRequest, reply: FastifyReply) {
    const updateServiceParamsSchema = z.object({
        id: z.string().uuid(),
    });

    const updateServiceBodySchema = z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        price: z.number().optional(),
        durationInMinutes: z.number().int().positive().optional(),
    });

    const { id } = updateServiceParamsSchema.parse(request.params);
    const { title, description, price, durationInMinutes } = updateServiceBodySchema.parse(request.body);

    const updateServiceUseCase = makeUpdateServiceUseCase();

    const { service } = await updateServiceUseCase.execute({
        serviceId: id,
        userId: request.user.sub,
        title,
        description: description ?? undefined,
        price,
        durationInMinutes,
    });

    return reply.status(200).send({
        service,
    });
}