import { createHash, randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { PrismaApiKeysRepository } from '../../repositories/prisma/prisma-api-keys-repository.js';

const createApiKeyBodySchema = z.object({
    name: z.string().trim().min(1).max(100),
    scopes: z.array(z.enum(['services:read', 'availability:read'])).min(1).max(2),
    expiresAt: z.string().datetime({ offset: true }).optional(),
}).strict().refine(
    (body) => body.expiresAt === undefined || new Date(body.expiresAt) > new Date(),
    { message: 'expiresAt must be in the future.', path: ['expiresAt'] },
);

export async function createApiKey(request: FastifyRequest, reply: FastifyReply) {
    const body = createApiKeyBodySchema.parse(request.body);
    const secret = `bk_${randomBytes(32).toString('base64url')}`;
    const keyHash = createHash('sha256').update(secret).digest('hex');
    const apiKey = await new PrismaApiKeysRepository().create({
        name: body.name,
        keyHash,
        scopes: [...new Set(body.scopes)],
        createdBy: request.user.sub,
        ...(body.expiresAt ? { expiresAt: new Date(body.expiresAt) } : {}),
    });

    return reply.status(201).send({ apiKey: { ...apiKey, secret } });
}