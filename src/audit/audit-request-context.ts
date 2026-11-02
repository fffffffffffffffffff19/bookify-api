import type { FastifyRequest } from 'fastify';

export function auditRequestContext(request: FastifyRequest) {
    const userAgent = request.headers['user-agent'];

    return {
        actorId: request.user.sub,
        actorRole: request.user.role,
        ipAddress: request.ip,
        userAgent: Array.isArray(userAgent) ? userAgent.join(', ') : userAgent,
    };
}