import type { Payment } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import type { PaymentsRepository } from '../../repositories/payments-repository.js';
import type { PaymentGateway } from '../../payments/payment-gateway.js';
import { ForbiddenError, BusinessRuleError } from '../../errors/application-error.js';
import { InitializePaymentUseCase } from './initialize-payment.js';

const pendingPayment = {
    id: 'payment-id',
    provider: 'MOCK',
    providerPaymentId: null,
    checkoutUrl: null,
    status: 'PENDING',
    amount: { toString: () => '12.50' },
    currency: 'usd',
} as unknown as Payment;

function makePaymentsRepository(payment = pendingPayment): PaymentsRepository {
    return {
        findPayableAppointment: async () => ({
            id: 'appointment-id',
            clientId: 'client-id',
            status: 'PENDING',
            paymentStatus: 'PENDING',
            service: { price: { toString: () => '12.50' } as never },
        }),
        getOrCreatePendingPayment: async () => payment,
        attachCheckoutSession: async (_paymentId, providerPaymentId, checkoutUrl) => ({
            ...payment,
            providerPaymentId,
            checkoutUrl,
        }),
        processWebhookEvent: async () => 'processed',
    };
}

describe('Initialize Payment Use Case', () => {
    it('uses the stored service price and creates a checkout session', async () => {
        const gatewayRequests: unknown[] = [];
        const gateway: PaymentGateway = {
            provider: 'MOCK',
            createCheckoutSession: async (input) => {
                gatewayRequests.push(input);
                return { providerPaymentId: 'mock-session', checkoutUrl: 'https://checkout.example/session' };
            },
        };
        const useCase = new InitializePaymentUseCase(makePaymentsRepository(), gateway, 'usd');

        const result = await useCase.execute({ appointmentId: 'appointment-id', userId: 'client-id' });

        expect(gatewayRequests).toEqual([{
            paymentId: 'payment-id',
            appointmentId: 'appointment-id',
            amountMinorUnits: 1250,
            currency: 'usd',
        }]);
        expect(result).toMatchObject({
            checkoutUrl: 'https://checkout.example/session',
            payment: { providerPaymentId: 'mock-session' },
        });
    });

    it('rejects users who do not own the appointment', async () => {
        const useCase = new InitializePaymentUseCase(makePaymentsRepository(), {
            provider: 'MOCK',
            createCheckoutSession: async () => ({ providerPaymentId: 'unused', checkoutUrl: 'unused' }),
        }, 'usd');

        await expect(useCase.execute({ appointmentId: 'appointment-id', userId: 'someone-else' }))
            .rejects.toBeInstanceOf(ForbiddenError);
    });

    it('rejects appointments that are already paid', async () => {
        const repository = makePaymentsRepository();
        repository.findPayableAppointment = async () => ({
            id: 'appointment-id',
            clientId: 'client-id',
            status: 'PENDING',
            paymentStatus: 'PAID',
            service: { price: { toString: () => '12.50' } as never },
        });
        const useCase = new InitializePaymentUseCase(repository, {
            provider: 'MOCK',
            createCheckoutSession: async () => ({ providerPaymentId: 'unused', checkoutUrl: 'unused' }),
        }, 'usd');

        await expect(useCase.execute({ appointmentId: 'appointment-id', userId: 'client-id' }))
            .rejects.toBeInstanceOf(BusinessRuleError);
    });
});