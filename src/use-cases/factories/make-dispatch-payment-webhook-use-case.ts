import Stripe from 'stripe';
import { env } from '../../config/env.js';
import { StripeWebhookVerifier } from '../../payments/stripe-payment-gateway.js';
import { PrismaPaymentsRepository } from '../../repositories/prisma/prisma-payments-repository.js';
import { DispatchPaymentWebhookUseCase } from '../administration/dispatch-payment-webhook.js';

export function makeDispatchPaymentWebhookUseCase() {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY ?? 'sk_test_webhook_verifier');
    return {
        dispatcher: new DispatchPaymentWebhookUseCase(new PrismaPaymentsRepository()),
        verifier: env.STRIPE_WEBHOOK_SECRET
            ? new StripeWebhookVerifier(stripe, env.STRIPE_WEBHOOK_SECRET)
            : null,
    };
}