import { describe, expect, it } from 'vitest';
import type { PaymentsRepository } from '../../repositories/payments-repository.js';
import { DispatchPaymentWebhookUseCase } from './dispatch-payment-webhook.js';

describe('Dispatch Payment Webhook Use Case', () => {
    it('passes verified provider events to the idempotent repository dispatcher', async () => {
        const received: unknown[] = [];
        const repository: PaymentsRepository = {
            findPayableAppointment: async () => null,
            getOrCreatePendingPayment: async () => { throw new Error('not used'); },
            attachCheckoutSession: async () => { throw new Error('not used'); },
            processWebhookEvent: async (event) => {
                received.push(event);
                return 'duplicate';
            },
        };
        const event = {
            eventId: 'evt_test',
            eventType: 'checkout.session.completed',
            paymentId: 'payment-id',
            status: 'PAID' as const,
        };

        const result = await new DispatchPaymentWebhookUseCase(repository).execute(event);

        expect(result).toEqual('duplicate');
        expect(received).toEqual([event]);
    });
});