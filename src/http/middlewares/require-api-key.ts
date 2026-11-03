import { createHash } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { PrismaApiKeysRepository } from '../../repositories/prisma/prisma-api-keys-repository.js';

const apiKeysRepository = new PrismaApiKeysRepository();

export function requireApiKey(requiredScopes: readonly string[]) {
    return async function verifyApiKey(request: FastifyRequest, reply: FastifyReply) {
        const key = request.headers['x-api-key'];
        if (typeof key !== 'string' || key.length < 40 || key.length > 200) {
            return reply.status(401).send({ message: 'A valid API key is required.', errorCode: 'UNAUTHORIZED' });
        }

        const keyHash = createHash('sha256').update(key).digest('hex');
        const record = await apiKeysRepository.findActiveByHash(keyHash, new Date());
        if (!record) {
            return reply.status(401).send({ message: 'A valid API key is required.', errorCode: 'UNAUTHORIZED' });
        }

        if (!requiredScopes.every((scope) => record.scopes.includes(scope))) {
            return reply.status(403).send({ message: 'API key does not have the required scope.', errorCode: 'INSUFFICIENT_API_KEY_SCOPE' });
        }

        await apiKeysRepository.touch(record.id, new Date());
    };
}