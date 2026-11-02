import type { OutboxEvent } from '@prisma/client';

export interface OutboxEventsRepository {
    findPending(limit: number): Promise<OutboxEvent[]>;
    findById(id: string): Promise<OutboxEvent | null>;
    incrementAttempts(id: string): Promise<boolean>;
    markProcessed(id: string): Promise<void>;
    markFailed(id: string): Promise<void>;
}