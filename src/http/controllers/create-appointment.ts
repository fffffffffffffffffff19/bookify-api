import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { makeCreateAppointmentUseCase } from '../../use-cases/factories/make-create-appointment-use-case.js';

export async function createAppointment(request: FastifyRequest, reply: FastifyReply) {
    const createAppointmentBodySchema = z.object({
        serviceId: z.string().uuid(),
        startTime: z.string().datetime().transform((val) => new Date(val)),
    });

    const { serviceId, startTime } = createAppointmentBodySchema.parse(request.body);

    const createAppointmentUseCase = makeCreateAppointmentUseCase();

    const { appointment } = await createAppointmentUseCase.execute({
        clientId: request.user.sub,
        serviceId,
        startTime,
    });

    return reply.status(201).send({
        appointment,
    });
}