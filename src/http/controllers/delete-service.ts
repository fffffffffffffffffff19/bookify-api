import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { makeDeleteServiceUseCase } from '../../use-cases/factories/make-delete-service-use-case.js';

export async function deleteService(request: FastifyRequest, reply: FastifyReply) {
    const deleteServiceParamsSchema = z.object({
        id: z.string().uuid(),
    });

    const { id } = deleteServiceParamsSchema.parse(request.params);

    const deleteServiceUseCase = makeDeleteServiceUseCase();

    await deleteServiceUseCase.execute({
        serviceId: id,
        userId: request.user.sub,
    });

    return reply.status(204).send();
}