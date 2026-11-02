import type { PaymentsRepository } from '../../repositories/payments-repository.js';
import type { PaymentWebhookEvent } from '../../payments/payment-gateway.js';

export class DispatchPaymentWebhookUseCase {
    constructor(private readonly paymentsRepository: PaymentsRepository) { }

    async execute(event: PaymentWebhookEvent) {
        return this.paymentsRepository.processWebhookEvent(event);
    }
}