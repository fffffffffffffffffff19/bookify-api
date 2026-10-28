import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { makeUpdateAppointmentStatusUseCase } from '../../use-cases/factories/make-update-appointment-status-use-case.js';
import {
    AppointmentNotFoundError,
    UnauthorizedAppointmentAccessError,
} from '../../use-cases/appointments/update-appointment-status.js';

export async function updateAppointmentStatus(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
        status: z.enum(['CONFIRMED', 'COMPLETED', 'CANCELLED']),
    });
    const { id } = paramsSchema.parse(request.params);
    const { status } = bodySchema.parse(request.body);
    const userRole = request.user.role;

    if (userRole !== 'ADMIN' && userRole !== 'PROVIDER') {
        return reply.status(403).send({ message: 'Unauthorized.' });
    }

    const useCase = makeUpdateAppointmentStatusUseCase();

    try {
        const { appointment } = await useCase.execute({
            appointmentId: id,
            userId: request.user.sub,
            userRole,
            status,
        });

        return reply.status(200).send({ appointment });
    } catch (error) {
        if (error instanceof AppointmentNotFoundError) {
            return reply.status(404).send({ message: error.message });
        }

        if (error instanceof UnauthorizedAppointmentAccessError) {
            return reply.status(403).send({ message: error.message });
        }

        throw error;
    }
}