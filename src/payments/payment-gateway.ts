export interface CreateCheckoutSessionInput {
    paymentId: string;
    appointmentId: string;
    amountMinorUnits: number;
    currency: string;
}

export interface CheckoutSession {
    providerPaymentId: string;
    checkoutUrl: string;
}

export interface PaymentGateway {
    readonly provider: string;
    createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSession>;
}

export type PaymentEventStatus = 'PAID' | 'FAILED' | 'REFUNDED' | 'IGNORED';

export interface PaymentWebhookEvent {
    eventId: string;
    eventType: string;
    paymentId?: string;
    status: PaymentEventStatus;
}

export interface PaymentWebhookVerifier {
    verify(rawBody: Buffer, signature: string): PaymentWebhookEvent;
}