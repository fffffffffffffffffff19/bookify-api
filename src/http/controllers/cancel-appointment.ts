import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { invalidateAppointmentAvailability } from '../../lib/cache.js';
import { makeCancelAppointmentUseCase } from '../../use-cases/factories/make-cancel-appointment-use-case.js';

export async function cancelAppointment(request: FastifyRequest, reply: FastifyReply) {
    const cancelAppointmentParamsSchema = z.object({
        id: z.string().uuid(),
    });

    const { id } = cancelAppointmentParamsSchema.parse(request.params);

    const cancelAppointmentUseCase = makeCancelAppointmentUseCase();

    const { appointment } = await cancelAppointmentUseCase.execute({
        appointmentId: id,
        userId: request.user.sub,
    });
    await invalidateAppointmentAvailability(appointment.serviceId, appointment.startTime);

    return reply.status(204).send();
}