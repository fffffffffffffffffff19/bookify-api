import { Prisma, type Payment } from '@prisma/client';
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

function toMinorUnits(amount: string, currency: string): number {
    const currencyCode = currency.toLowerCase();
    const fractionDigits = ['isk', 'ugx'].includes(currencyCode)
        ? 2
        : new Intl.NumberFormat('en', {
            style: 'currency',
            currency,
        }).resolvedOptions().maximumFractionDigits ?? 2;
    const scaledAmount = new Prisma.Decimal(amount)
        .mul(10 ** fractionDigits)
        .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
    const minorUnits = scaledAmount.toNumber();

    if (!Number.isSafeInteger(minorUnits) || !scaledAmount.isPositive()) {
        throw new BusinessRuleError('The appointment price must be greater than zero.', 'INVALID_PAYMENT_AMOUNT');
    }

    return minorUnits;
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
        const amountMinorUnits = toMinorUnits(amount, this.currency);

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