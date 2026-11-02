import { Queue, Worker } from 'bullmq';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { PrismaOutboxEventsRepository } from './repositories/prisma/prisma-outbox-events-repository.js';
import {
    mockAppointmentNotification,
    markNotificationFailedAfterRetries,
    OUTBOX_MAX_ATTEMPTS,
    OUTBOX_POLL_INTERVAL_MS,
    OUTBOX_QUEUE_NAME,
    OUTBOX_RETRY_DELAY_MS,
    processAppointmentNotification,
    publishPendingEvents,
    type OutboxJob,
} from './outbox/appointment-notifications.js';

const redisUrl = new URL(env.REDIS_URL);
const connection = {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    ...(redisUrl.username ? { username: decodeURIComponent(redisUrl.username) } : {}),
    ...(redisUrl.password ? { password: decodeURIComponent(redisUrl.password) } : {}),
    ...(redisUrl.pathname.length > 1 ? { db: Number(redisUrl.pathname.slice(1)) } : {}),
    ...(redisUrl.protocol === 'rediss:' ? { tls: {} } : {}),
    maxRetriesPerRequest: null,
};

const repository = new PrismaOutboxEventsRepository();
const queue = new Queue<OutboxJob>(OUTBOX_QUEUE_NAME, { connection });
const worker = new Worker<OutboxJob>(
    OUTBOX_QUEUE_NAME,
    (job) => processAppointmentNotification(job.data.eventId, repository, mockAppointmentNotification),
    { connection, concurrency: 5 },
);

worker.on('failed', async (job, error) => {
    if (job) {
        await markNotificationFailedAfterRetries(job.data.eventId, job.attemptsMade, repository);
    }
    console.error('Appointment notification job failed', {
        eventId: job?.data.eventId,
        attemptsMade: job?.attemptsMade,
        error,
    });
});

let publishing = false;
const publish = async () => {
    if (publishing) return;
    publishing = true;
    try {
        await publishPendingEvents(repository, async (eventId) => {
            await queue.add('deliver-appointment-notification', { eventId }, {
                jobId: eventId,
                attempts: OUTBOX_MAX_ATTEMPTS,
                backoff: { type: 'exponential', delay: OUTBOX_RETRY_DELAY_MS },
                removeOnComplete: false,
                removeOnFail: false,
            });
        });
    } catch (error) {
        console.error('Failed to publish pending outbox events', error);
    } finally {
        publishing = false;
    }
};

const interval = setInterval(() => void publish(), OUTBOX_POLL_INTERVAL_MS);
void publish();
console.info('Appointment notification worker started');

const shutdown = async () => {
    clearInterval(interval);
    await Promise.all([worker.close(), queue.close(), prisma.$disconnect()]);
    process.exit(0);
};

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());