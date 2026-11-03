import { createHash, randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { PrismaApiKeysRepository } from '../../repositories/prisma/prisma-api-keys-repository.js';

const DEFAULT_API_KEY_LIFETIME_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_API_KEY_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000;

const createApiKeyBodySchema = z.object({
    name: z.string().trim().min(1).max(100),
    scopes: z.array(z.enum(['services:read', 'availability:read'])).min(1).max(2),
    expiresAt: z.string().datetime({ offset: true }).optional(),
}).strict().refine(
    (body) => body.expiresAt === undefined || new Date(body.expiresAt) > new Date(),
    { message: 'expiresAt must be in the future.', path: ['expiresAt'] },
).refine(
    (body) => body.expiresAt === undefined || new Date(body.expiresAt).getTime() <= Date.now() + MAX_API_KEY_LIFETIME_MS,
    { message: 'expiresAt cannot exceed the 365-day API key lifetime.', path: ['expiresAt'] },
);

export async function createApiKey(request: FastifyRequest, reply: FastifyReply) {
    const body = createApiKeyBodySchema.parse(request.body);
    const secret = `bk_${randomBytes(32).toString('base64url')}`;
    const keyHash = createHash('sha256').update(secret).digest('hex');
    const expiresAt = body.expiresAt
        ? new Date(body.expiresAt)
        : new Date(Date.now() + DEFAULT_API_KEY_LIFETIME_MS);
    const apiKey = await new PrismaApiKeysRepository().create({
        name: body.name,
        keyHash,
        scopes: [...new Set(body.scopes)],
        createdBy: request.user.sub,
        expiresAt,
    });

    return reply.status(201).send({ apiKey: { ...apiKey, secret } });
}