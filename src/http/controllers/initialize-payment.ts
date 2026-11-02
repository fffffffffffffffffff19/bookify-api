import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { makeInitializePaymentUseCase } from '../../use-cases/factories/make-initialize-payment-use-case.js';

export async function initializePayment(request: FastifyRequest, reply: FastifyReply) {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const result = await makeInitializePaymentUseCase().execute({
        appointmentId: id,
        userId: request.user.sub,
    });

    return reply.status(200).send({
        payment: {
            id: result.payment.id,
            status: result.payment.status,
            amount: result.payment.amount.toString(),
            currency: result.payment.currency,
        },
        checkoutUrl: result.checkoutUrl,
    });
}