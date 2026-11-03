import { prisma } from '../../lib/prisma.js';
import type { ApiKeysRepository } from '../api-keys-repository.js';

export class PrismaApiKeysRepository implements ApiKeysRepository {
    async create(input: Parameters<ApiKeysRepository['create']>[0]) {
        return prisma.apiKey.create({
            data: input,
            select: { id: true, name: true, scopes: true, createdAt: true, expiresAt: true },
        });
    }

    async findActiveByHash(keyHash: string, now: Date) {
        return prisma.apiKey.findFirst({
            where: {
                keyHash,
                revokedAt: null,
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
            select: { id: true, scopes: true, expiresAt: true, revokedAt: true },
        });
    }

    async touch(id: string, now: Date) {
        await prisma.apiKey.updateMany({
            where: { id, revokedAt: null },
            data: { lastUsedAt: now },
        });
    }

    async revoke(id: string) {
        const result = await prisma.apiKey.updateMany({
            where: { id, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        return result.count === 1;
    }
}