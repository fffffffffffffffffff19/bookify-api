import type { FastifyRequest } from 'fastify';

export function auditRequestContext(request: FastifyRequest) {
    const userAgent = request.headers['user-agent'];

    const context = {
        actorId: request.user.sub,
        actorRole: request.user.role,
        ipAddress: request.ip,
    };
    const normalizedUserAgent = Array.isArray(userAgent) ? userAgent.join(', ') : userAgent;
    return normalizedUserAgent ? { ...context, userAgent: normalizedUserAgent } : context;
}