import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { makeUpdateAppointmentStatusUseCase } from '../../use-cases/factories/make-update-appointment-status-use-case.js';

export async function updateAppointmentStatus(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
        status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']),
    });
    const { id } = paramsSchema.parse(request.params);
    const { status } = bodySchema.parse(request.body);
    const useCase = makeUpdateAppointmentStatusUseCase();

    const { appointment } = await useCase.execute({
        appointmentId: id,
        userId: request.user.sub,
        userRole: request.user.role,
        status,
    });

    return reply.status(200).send({ appointment });
}