import type { Payment } from '@prisma/client';
import { BusinessRuleError, ForbiddenError, ResourceNotFoundError } from '../../errors/application-error.js';
import type { PaymentsRepository } from '../../repositories/payments-repository.js';
import type { PaymentGateway } from '../../payments/payment-gateway.js';

interface InitializePaymentRequest {
    appointmentId: string;
    userId: string;
}

interface InitializePaymentResponse {
    payment: Payment;
    checkoutUrl: string;
}

export class InitializePaymentUseCase {
    constructor(
        private readonly paymentsRepository: PaymentsRepository,
        private readonly paymentGateway: PaymentGateway,
        private readonly currency: string,
    ) { }

    async execute({ appointmentId, userId }: InitializePaymentRequest): Promise<InitializePaymentResponse> {
        const appointment = await this.paymentsRepository.findPayableAppointment(appointmentId);
        if (!appointment) throw new ResourceNotFoundError('Appointment not found.');
        if (appointment.clientId !== userId) throw new ForbiddenError();
        if (appointment.status !== 'PENDING') {
            throw new BusinessRuleError('Only pending appointments can be paid.', 'APPOINTMENT_NOT_PAYABLE');
        }
        if (appointment.paymentStatus === 'PAID' || appointment.paymentStatus === 'REFUNDED') {
            throw new BusinessRuleError('This appointment has already been paid.', 'PAYMENT_ALREADY_COMPLETED');
        }

        const amount = appointment.service.price.toString();
        const amountMinorUnits = Math.round(Number(amount) * 100);
        if (!Number.isSafeInteger(amountMinorUnits) || amountMinorUnits <= 0) {
            throw new BusinessRuleError('The appointment price must be greater than zero.', 'INVALID_PAYMENT_AMOUNT');
        }

        const payment = await this.paymentsRepository.getOrCreatePendingPayment({
            appointmentId,
            provider: this.paymentGateway.provider,
            amount,
            currency: this.currency,
        });
        if (payment.providerPaymentId && payment.checkoutUrl) {
            return { payment, checkoutUrl: payment.checkoutUrl };
        }

        const session = await this.paymentGateway.createCheckoutSession({
            paymentId: payment.id,
            appointmentId,
            amountMinorUnits,
            currency: this.currency,
        });
        const updatedPayment = await this.paymentsRepository.attachCheckoutSession(
            payment.id,
            session.providerPaymentId,
            session.checkoutUrl,
        );

        return { payment: updatedPayment, checkoutUrl: session.checkoutUrl };
    }
}