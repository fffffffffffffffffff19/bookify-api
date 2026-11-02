import type { CheckoutSession, CreateCheckoutSessionInput, PaymentGateway } from './payment-gateway.js';

export class MockPaymentGateway implements PaymentGateway {
    readonly provider = 'MOCK';

    async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSession> {
        return {
            providerPaymentId: `mock_${input.paymentId}`,
            checkoutUrl: `http://localhost:3333/mock-checkout/${encodeURIComponent(input.paymentId)}`,
        };
    }
}