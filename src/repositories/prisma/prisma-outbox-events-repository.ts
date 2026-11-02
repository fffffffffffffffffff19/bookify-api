import type { OutboxEventsRepository } from '../../outbox/outbox-events-repository.js';
import { prisma } from '../../lib/prisma.js';

export class PrismaOutboxEventsRepository implements OutboxEventsRepository {
    findPending(limit: number) {
        return prisma.outboxEvent.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'asc' },
            take: limit,
        });
    }

    findById(id: string) {
        return prisma.outboxEvent.findUnique({ where: { id } });
    }

    async incrementAttempts(id: string) {
        const result = await prisma.outboxEvent.updateMany({
            where: { id, status: 'PENDING' },
            data: { attempts: { increment: 1 } },
        });
        return result.count === 1;
    }

    async markProcessed(id: string) {
        await prisma.outboxEvent.updateMany({
            where: { id, status: 'PENDING' },
            data: { status: 'PROCESSED', processedAt: new Date() },
        });
    }

    async markFailed(id: string) {
        await prisma.outboxEvent.updateMany({
            where: { id, status: 'PENDING' },
            data: { status: 'FAILED' },
        });
    }
}