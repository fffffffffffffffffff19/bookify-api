import Stripe from 'stripe';
import type { CheckoutSession, CreateCheckoutSessionInput, PaymentGateway, PaymentWebhookEvent, PaymentWebhookVerifier } from './payment-gateway.js';

export class StripePaymentGateway implements PaymentGateway {
    readonly provider = 'STRIPE';

    constructor(
        private readonly stripe: Stripe,
        private readonly successUrl: string,
        private readonly cancelUrl: string,
    ) { }

    async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSession> {
        const session = await this.stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: input.currency,
                    unit_amount: input.amountMinorUnits,
                    product_data: { name: `Appointment ${input.appointmentId}` },
                },
                quantity: 1,
            }],
            client_reference_id: input.paymentId,
            metadata: {
                paymentId: input.paymentId,
                appointmentId: input.appointmentId,
            },
            payment_intent_data: {
                metadata: {
                    paymentId: input.paymentId,
                    appointmentId: input.appointmentId,
                },
            },
            success_url: this.successUrl,
            cancel_url: this.cancelUrl,
        }, { idempotencyKey: input.paymentId });

        if (!session.url) {
            throw new Error('Stripe did not return a checkout URL.');
        }

        return { providerPaymentId: session.id, checkoutUrl: session.url };
    }
}

export class StripeWebhookVerifier implements PaymentWebhookVerifier {
    constructor(
        private readonly stripe: Stripe,
        private readonly webhookSecret: string,
    ) { }

    verify(rawBody: Buffer, signature: string): PaymentWebhookEvent {
        const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
        let status: PaymentWebhookEvent['status'] = 'IGNORED';
        let paymentId: string | undefined;

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            paymentId = session.metadata?.paymentId;
            status = session.payment_status === 'paid' ? 'PAID' : 'IGNORED';
        } else if (event.type === 'checkout.session.async_payment_failed') {
            const session = event.data.object as Stripe.Checkout.Session;
            paymentId = session.metadata?.paymentId;
            status = 'FAILED';
        } else if (event.type === 'payment_intent.succeeded') {
            const intent = event.data.object as Stripe.PaymentIntent;
            paymentId = intent.metadata.paymentId;
            status = 'PAID';
        } else if (event.type === 'payment_intent.payment_failed') {
            const intent = event.data.object as Stripe.PaymentIntent;
            paymentId = intent.metadata.paymentId;
            status = 'FAILED';
        }

        return {
            eventId: event.id,
            eventType: event.type,
            ...(paymentId ? { paymentId } : {}),
            status: paymentId ? status : 'IGNORED',
        };
    }
}