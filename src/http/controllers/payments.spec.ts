import { createHmac, randomUUID } from 'node:crypto';
import { app } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { PrismaPaymentsRepository } from '../../repositories/prisma/prisma-payments-repository.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { provisionAndAuthenticate } from '../../test/e2e/provision-user.js';

const webhookSecret = 'whsec_bookify_vitest_secret';

async function createAppointment() {
    const provider = await provisionAndAuthenticate(app, 'PROVIDER');
    const serviceResponse = await request(app.server)
        .post('/services')
        .set('Authorization', `Bearer ${provider.token}`)
        .send({ title: `Payment Service ${randomUUID()}`, price: 37.5, durationInMinutes: 30 });
    const client = await provisionAndAuthenticate(app, 'CLIENT');
    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 2);
    while (startTime.getDay() === 0 || startTime.getDay() === 6) {
        startTime.setDate(startTime.getDate() + 1);
    }
    startTime.setHours(10, 0, 0, 0);

    const appointmentResponse = await request(app.server)
        .post('/appointments')
        .set('Authorization', `Bearer ${client.token}`)
        .send({ serviceId: serviceResponse.body.data.service.id, startTime: startTime.toISOString() });

    expect(serviceResponse.status).toEqual(201);
    expect(appointmentResponse.status).toEqual(201);
    return { appointmentId: appointmentResponse.body.data.appointment.id as string, client };
}

function stripeSignature(payload: string) {
    const timestamp = Math.floor(Date.now() / 1000);
    const digest = createHmac('sha256', webhookSecret)
        .update(`${timestamp}.${payload}`)
        .digest('hex');
    return `t=${timestamp},v1=${digest}`;
}

describe('Payments and Stripe webhooks (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('protects checkout and allows only the appointment client to initialize payment', async () => {
        const { appointmentId, client } = await createAppointment();
        const otherClient = await provisionAndAuthenticate(app, 'CLIENT');
        const anonymous = await request(app.server).post(`/appointments/${appointmentId}/pay`);
        const denied = await request(app.server)
            .post(`/appointments/${appointmentId}/pay`)
            .set('Authorization', `Bearer ${otherClient.token}`);

        expect(anonymous.status).toEqual(401);
        expect(denied.status).toEqual(403);

        const initialized = await request(app.server)
            .post(`/appointments/${appointmentId}/pay`)
            .set('Authorization', `Bearer ${client.token}`);

        expect(initialized.status).toEqual(200);
        expect(initialized.body.data).toMatchObject({
            payment: { status: 'PENDING', amount: '37.5', currency: 'usd' },
            checkoutUrl: expect.stringContaining('/mock-checkout/'),
        });
        const resumed = await request(app.server)
            .post(`/appointments/${appointmentId}/pay`)
            .set('Authorization', `Bearer ${client.token}`);
        expect(resumed.status).toEqual(200);
        expect(resumed.body.data).toEqual(initialized.body.data);
    });

    it('verifies Stripe signatures and applies successful events once', async () => {
        const { appointmentId, client } = await createAppointment();
        const checkout = await request(app.server)
            .post(`/appointments/${appointmentId}/pay`)
            .set('Authorization', `Bearer ${client.token}`);
        expect(checkout.status).toEqual(200);

        const paymentId = checkout.body.data.payment.id as string;
        const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
        const payload = JSON.stringify({
            id: `evt_${randomUUID().replaceAll('-', '')}`,
            object: 'event',
            api_version: '2025-09-30.clover',
            created: Math.floor(Date.now() / 1000),
            data: {
                object: {
                    id: payment.providerPaymentId,
                    object: 'checkout.session',
                    payment_status: 'paid',
                    metadata: { paymentId },
                },
            },
            livemode: false,
            pending_webhooks: 1,
            request: { id: null, idempotency_key: null },
            type: 'checkout.session.completed',
        });
        const signature = stripeSignature(payload);

        const firstDelivery = await request(app.server)
            .post('/webhooks/stripe')
            .set('Content-Type', 'application/json')
            .set('Stripe-Signature', signature)
            .send(payload);
        const retry = await request(app.server)
            .post('/webhooks/stripe')
            .set('Content-Type', 'application/json')
            .set('Stripe-Signature', signature)
            .send(payload);

        expect(firstDelivery.status).toEqual(200);
        expect(firstDelivery.body.data).toEqual({ received: true, duplicate: false });
        expect(retry.status).toEqual(200);
        expect(retry.body.data).toEqual({ received: true, duplicate: true });

        const [updatedPayment, appointment, processedEvents] = await Promise.all([
            prisma.payment.findUniqueOrThrow({ where: { id: paymentId } }),
            prisma.appointment.findUniqueOrThrow({ where: { id: appointmentId } }),
            prisma.processedWebhookEvent.count({ where: { eventId: JSON.parse(payload).id } }),
        ]);
        expect(updatedPayment.status).toEqual('PAID');
        expect(appointment.paymentStatus).toEqual('PAID');
        expect(processedEvents).toEqual(1);
    });

    it('rejects invalid signatures without changing payment state', async () => {
        const payload = JSON.stringify({ id: 'evt_invalid', type: 'checkout.session.completed' });
        const response = await request(app.server)
            .post('/webhooks/stripe')
            .set('Content-Type', 'application/json')
            .set('Stripe-Signature', 't=1,v1=invalid')
            .send(payload);

        expect(response.status).toEqual(400);
        expect(response.body.errorCode).toEqual('INVALID_WEBHOOK_SIGNATURE');
    });

    it('does not create another checkout attempt after payment is completed', async () => {
        const { appointmentId, client } = await createAppointment();
        const checkout = await request(app.server)
            .post(`/appointments/${appointmentId}/pay`)
            .set('Authorization', `Bearer ${client.token}`);
        const paymentId = checkout.body.data.payment.id as string;

        await prisma.$transaction([
            prisma.payment.update({ where: { id: paymentId }, data: { status: 'PAID' } }),
            prisma.appointment.update({ where: { id: appointmentId }, data: { paymentStatus: 'PAID' } }),
        ]);

        await expect(new PrismaPaymentsRepository().getOrCreatePendingPayment({
            appointmentId,
            provider: 'MOCK',
            amount: '37.5',
            currency: 'usd',
        })).rejects.toMatchObject({ errorCode: 'PAYMENT_ALREADY_COMPLETED' });

        const payments = await prisma.payment.findMany({ where: { appointmentId } });
        expect(payments).toHaveLength(1);
    });
});