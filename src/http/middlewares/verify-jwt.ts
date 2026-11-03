import type { FastifyRequest, FastifyReply } from 'fastify';
import { isSessionActive } from '../../lib/sessions.js';

export async function verifyJWT(request: FastifyRequest, reply: FastifyReply) {
    try {
        await request.jwtVerify();
    } catch {
        return reply.status(401).send({
            message: 'Authentication required or token is invalid.',
            errorCode: 'UNAUTHORIZED',
        });
    }

    if (!request.user.sid || !(await isSessionActive(request.user.sub, request.user.sid))) {
        return reply.status(401).send({
            message: 'Authentication required or token is invalid.',
            errorCode: 'UNAUTHORIZED',
        });
    }
}