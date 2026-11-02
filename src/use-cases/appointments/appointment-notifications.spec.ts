import type { OutboxEvent } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import type { OutboxEventsRepository } from '../../outbox/outbox-events-repository.js';
import {
    markNotificationFailedAfterRetries,
    OUTBOX_MAX_ATTEMPTS,
    processAppointmentNotification,
    publishPendingEvents,
} from '../../outbox/appointment-notifications.js';

function makeEvent(status: OutboxEvent['status'] = 'PENDING'): OutboxEvent {
    return {
        id: 'event-1',
        aggregateType: 'Appointment',
        aggregateId: 'appointment-1',
        eventType: 'appointment.created',
        payload: {},
        status,
        attempts: 0,
        createdAt: new Date(),
        processedAt: status === 'PROCESSED' ? new Date() : null,
    };
}

function makeRepository(event = makeEvent()) {
    const repository: OutboxEventsRepository & { event: OutboxEvent } = {
        event,
        findPending: vi.fn(async () => event.status === 'PENDING' ? [event] : []),
        findById: vi.fn(async () => event),
        incrementAttempts: vi.fn(async (id) => {
            if (id !== event.id || event.status !== 'PENDING') return false;
            event.attempts += 1;
            return true;
        }),
        markProcessed: vi.fn(async () => {
            event.status = 'PROCESSED';
            event.processedAt = new Date();
        }),
        markFailed: vi.fn(async () => {
            event.status = 'FAILED';
        }),
    };
    return repository;
}

describe('appointment notification outbox', () => {
    it('publishes pending events using their unique event IDs', async () => {
        const repository = makeRepository();
        const enqueue = vi.fn(async () => undefined);

        await publishPendingEvents(repository, enqueue);

        expect(enqueue).toHaveBeenCalledWith('event-1');
    });

    it('increments attempts on a failed delivery and processes the retry once delivered', async () => {
        const repository = makeRepository();
        const deliver = vi.fn()
            .mockRejectedValueOnce(new Error('temporary delivery failure'))
            .mockResolvedValueOnce(undefined);

        await expect(processAppointmentNotification('event-1', repository, deliver))
            .rejects.toThrow('temporary delivery failure');
        await processAppointmentNotification('event-1', repository, deliver);

        expect(repository.event.attempts).toBe(2);
        expect(repository.event.status).toBe('PROCESSED');
        expect(repository.event.processedAt).toBeInstanceOf(Date);
    });

    it('does not deliver an event already marked processed', async () => {
        const repository = makeRepository(makeEvent('PROCESSED'));
        const deliver = vi.fn();

        await processAppointmentNotification('event-1', repository, deliver);

        expect(deliver).not.toHaveBeenCalled();
        expect(repository.incrementAttempts).not.toHaveBeenCalled();
    });

    it('marks an event failed only after the retry limit is exhausted', async () => {
        const repository = makeRepository();

        await markNotificationFailedAfterRetries('event-1', OUTBOX_MAX_ATTEMPTS - 1, repository);
        expect(repository.markFailed).not.toHaveBeenCalled();

        await markNotificationFailedAfterRetries('event-1', OUTBOX_MAX_ATTEMPTS, repository);
        expect(repository.event.status).toBe('FAILED');
    });
});