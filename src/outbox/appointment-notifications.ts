import type { OutboxEvent } from '@prisma/client';
import type { OutboxEventsRepository } from './outbox-events-repository.js';

export const OUTBOX_QUEUE_NAME = 'appointment-notifications';
export const OUTBOX_MAX_ATTEMPTS = 5;
export const OUTBOX_RETRY_DELAY_MS = 1_000;
export const OUTBOX_POLL_INTERVAL_MS = 2_000;

export interface OutboxJob {
    eventId: string;
}

export async function publishPendingEvents(
    repository: OutboxEventsRepository,
    enqueue: (eventId: string) => Promise<void>,
    batchSize = 100,
) {
    const pendingEvents = await repository.findPending(batchSize);
    for (const event of pendingEvents) {
        await enqueue(event.id);
    }
}

export async function processAppointmentNotification(
    eventId: string,
    repository: OutboxEventsRepository,
    deliver: (event: OutboxEvent) => Promise<void>,
) {
    const event = await repository.findById(eventId);
    if (!event || event.status !== 'PENDING') return;

    const claimed = await repository.incrementAttempts(eventId);
    if (!claimed) return;

    await deliver(event);
    await repository.markProcessed(eventId);
}

export async function markNotificationFailedAfterRetries(
    eventId: string,
    attemptsMade: number,
    repository: OutboxEventsRepository,
) {
    if (attemptsMade >= OUTBOX_MAX_ATTEMPTS) {
        await repository.markFailed(eventId);
    }
}

export async function mockAppointmentNotification(event: OutboxEvent) {
    if (!['appointment.created', 'appointment.cancelled'].includes(event.eventType)) {
        throw new Error(`Unsupported appointment event type: ${event.eventType}`);
    }

    console.info('Mock appointment notification delivered', {
        eventId: event.id,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
    });
}