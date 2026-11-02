import Stripe from 'stripe';
import { env } from '../../config/env.js';
import { MockPaymentGateway } from '../../payments/mock-payment-gateway.js';
import { StripePaymentGateway } from '../../payments/stripe-payment-gateway.js';
import { PrismaPaymentsRepository } from '../../repositories/prisma/prisma-payments-repository.js';
import { InitializePaymentUseCase } from '../appointments/initialize-payment.js';

export function makeInitializePaymentUseCase() {
    const gateway = env.PAYMENT_PROVIDER === 'stripe'
        ? new StripePaymentGateway(
            new Stripe(env.STRIPE_SECRET_KEY!),
            env.PAYMENT_SUCCESS_URL,
            env.PAYMENT_CANCEL_URL,
        )
        : new MockPaymentGateway();

    return new InitializePaymentUseCase(new PrismaPaymentsRepository(), gateway, env.PAYMENT_CURRENCY);
}