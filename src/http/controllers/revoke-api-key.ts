import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ResourceNotFoundError } from '../../errors/application-error.js';
import { PrismaApiKeysRepository } from '../../repositories/prisma/prisma-api-keys-repository.js';

export async function revokeApiKey(request: FastifyRequest, reply: FastifyReply) {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const revoked = await new PrismaApiKeysRepository().revoke(id);
    if (!revoked) throw new ResourceNotFoundError('API key not found.');
    return reply.status(204).send();
}