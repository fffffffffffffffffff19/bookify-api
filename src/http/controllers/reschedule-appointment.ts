import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { makeRescheduleAppointmentUseCase } from '../../use-cases/factories/make-reschedule-appointment-use-case.js';

const rescheduleAppointmentParamsSchema = z.object({
    id: z.string().uuid(),
});

const rescheduleAppointmentBodySchema = z.object({
    startTime: z.string().datetime({ offset: true }).transform((value) => new Date(value)),
});

export async function rescheduleAppointment(request: FastifyRequest, reply: FastifyReply) {
    const { id } = rescheduleAppointmentParamsSchema.parse(request.params);
    const { startTime } = rescheduleAppointmentBodySchema.parse(request.body);
    const useCase = makeRescheduleAppointmentUseCase();
    const { appointment } = await useCase.execute({
        appointmentId: id,
        userId: request.user.sub,
        userRole: request.user.role,
        startTime,
    });

    return reply.status(200).send({ appointment });
}