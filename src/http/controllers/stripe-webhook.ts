import type { FastifyReply, FastifyRequest } from 'fastify';
import { makeDispatchPaymentWebhookUseCase } from '../../use-cases/factories/make-dispatch-payment-webhook-use-case.js';

export async function stripeWebhook(request: FastifyRequest, reply: FastifyReply) {
    const signature = request.headers['stripe-signature'];
    if (typeof signature !== 'string' || !Buffer.isBuffer(request.body)) {
        return reply.status(400).send({
            message: 'A Stripe signature and raw JSON body are required.',
            errorCode: 'INVALID_WEBHOOK_REQUEST',
        });
    }

    const { dispatcher, verifier } = makeDispatchPaymentWebhookUseCase();
    if (!verifier) {
        return reply.status(503).send({
            message: 'Stripe webhooks are not configured.',
            errorCode: 'WEBHOOK_NOT_CONFIGURED',
        });
    }

    let event;
    try {
        event = verifier.verify(request.body, signature);
    } catch {
        return reply.status(400).send({
            message: 'Stripe webhook signature is invalid.',
            errorCode: 'INVALID_WEBHOOK_SIGNATURE',
        });
    }

    const result = await dispatcher.execute(event);
    return reply.status(200).send({ received: true, duplicate: result === 'duplicate' });
}