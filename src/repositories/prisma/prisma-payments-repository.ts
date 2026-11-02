import { prisma } from '../../lib/prisma.js';
import type { PaymentWebhookEvent } from '../../payments/payment-gateway.js';
import type { CreatePendingPaymentInput, PaymentsRepository } from '../payments-repository.js';

export class PrismaPaymentsRepository implements PaymentsRepository {
    async findPayableAppointment(appointmentId: string) {
        return prisma.appointment.findUnique({
            where: { id: appointmentId },
            select: {
                id: true,
                clientId: true,
                status: true,
                paymentStatus: true,
                service: { select: { price: true } },
            },
        });
    }

    async getOrCreatePendingPayment(input: CreatePendingPaymentInput) {
        return prisma.$transaction(async (transaction) => {
            await transaction.$queryRaw`SELECT "id" FROM "appointments" WHERE "id" = ${input.appointmentId} FOR UPDATE`;
            const existing = await transaction.payment.findFirst({
                where: {
                    appointmentId: input.appointmentId,
                    provider: input.provider,
                    status: 'PENDING',
                },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            });
            if (existing) return existing;

            const payment = await transaction.payment.create({
                data: {
                    appointmentId: input.appointmentId,
                    provider: input.provider,
                    amount: input.amount,
                    currency: input.currency,
                },
            });
            await transaction.appointment.update({
                where: { id: input.appointmentId },
                data: { paymentStatus: 'PENDING' },
            });
            return payment;
        });
    }

    async attachCheckoutSession(paymentId: string, providerPaymentId: string, checkoutUrl: string) {
        return prisma.payment.update({
            where: { id: paymentId },
            data: { providerPaymentId, checkoutUrl },
        });
    }

    async processWebhookEvent(event: PaymentWebhookEvent): Promise<'processed' | 'duplicate'> {
        return prisma.$transaction(async (transaction) => {
            const inserted = await transaction.processedWebhookEvent.createMany({
                data: [{ provider: 'STRIPE', eventId: event.eventId, eventType: event.eventType }],
                skipDuplicates: true,
            });
            if (inserted.count === 0) return 'duplicate';

            if (!event.paymentId || event.status === 'IGNORED') return 'processed';

            const payment = await transaction.payment.findUnique({ where: { id: event.paymentId } });
            if (!payment) throw new Error(`Payment ${event.paymentId} was not found for a verified webhook.`);

            if (event.status === 'PAID') {
                if (payment.status !== 'REFUNDED') {
                    await transaction.payment.update({
                        where: { id: payment.id },
                        data: { status: 'PAID' },
                    });
                    await transaction.appointment.update({
                        where: { id: payment.appointmentId },
                        data: { paymentStatus: 'PAID' },
                    });
                }
            } else if (event.status === 'FAILED' && payment.status === 'PENDING') {
                await transaction.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
                await transaction.appointment.updateMany({
                    where: { id: payment.appointmentId, paymentStatus: 'PENDING' },
                    data: { paymentStatus: 'FAILED' },
                });
            } else if (event.status === 'REFUNDED' && payment.status === 'PAID') {
                await transaction.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
                await transaction.appointment.updateMany({
                    where: { id: payment.appointmentId, paymentStatus: 'PAID' },
                    data: { paymentStatus: 'REFUNDED' },
                });
            }

            return 'processed';
        });
    }
}