import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { makeUpdateAppointmentStatusUseCase } from '../../use-cases/factories/make-update-appointment-status-use-case.js';

export async function updateAppointmentStatus(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
        status: z.enum(['CONFIRMED', 'COMPLETED', 'CANCELLED']),
    });
    const { id } = paramsSchema.parse(request.params);
    const { status } = bodySchema.parse(request.body);
    const userRole = request.user.role;

    if (userRole !== 'ADMIN' && userRole !== 'PROVIDER') {
        return reply.status(403).send({ message: 'Not authorized.', errorCode: 'FORBIDDEN' });
    }

    const useCase = makeUpdateAppointmentStatusUseCase();

    const { appointment } = await useCase.execute({
        appointmentId: id,
        userId: request.user.sub,
        userRole,
        status,
    });

    return reply.status(200).send({ appointment });
}