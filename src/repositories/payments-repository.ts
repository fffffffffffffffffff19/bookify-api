import type { Payment, PaymentStatus, Prisma } from '@prisma/client';
import type { PaymentWebhookEvent } from '../payments/payment-gateway.js';

export interface PayableAppointment {
    id: string;
    clientId: string;
    status: string;
    paymentStatus: PaymentStatus;
    service: { price: Prisma.Decimal };
}

export interface CreatePendingPaymentInput {
    appointmentId: string;
    provider: string;
    amount: string;
    currency: string;
}

export interface PaymentsRepository {
    findPayableAppointment(appointmentId: string): Promise<PayableAppointment | null>;
    getOrCreatePendingPayment(input: CreatePendingPaymentInput): Promise<Payment>;
    attachCheckoutSession(paymentId: string, providerPaymentId: string, checkoutUrl: string): Promise<Payment>;
    processWebhookEvent(event: PaymentWebhookEvent): Promise<'processed' | 'duplicate'>;
}