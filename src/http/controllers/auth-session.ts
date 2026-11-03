import { randomUUID } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { auditActions } from '../../audit/audit-logger.js';
import { auditRequestContext } from '../../audit/audit-request-context.js';
import { env } from '../../config/env.js';
import { makeAuditLogger } from '../../use-cases/factories/make-audit-logger.js';
import {
    ACCESS_TOKEN_TTL,
    listActiveSessions,
    REFRESH_TOKEN_TTL_SECONDS,
    revokeRefreshToken,
    revokeSession,
    rotateRefreshToken,
} from '../../lib/sessions.js';

const refreshCookieName = 'bookify_refresh';
const refreshCookiePath = '/auth';

function cookieOptions(maxAge: number) {
    return [
        `${refreshCookieName}=`,
        `Path=${refreshCookiePath}`,
        'HttpOnly',
        'SameSite=Strict',
        `Max-Age=${maxAge}`,
        ...(env.NODE_ENV === 'production' ? ['Secure'] : []),
    ];
}

export function setRefreshTokenCookie(reply: FastifyReply, token: string) {
    const cookie = cookieOptions(REFRESH_TOKEN_TTL_SECONDS);
    cookie[0] = `${refreshCookieName}=${token}`;
    reply.header('set-cookie', cookie.join('; '));
}

function clearRefreshTokenCookie(reply: FastifyReply) {
    reply.header('set-cookie', [
        ...cookieOptions(0),
        'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    ].join('; '));
}

function getRefreshToken(request: FastifyRequest) {
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) {
        return undefined;
    }

    const cookie = cookieHeader.split(';').map((part) => part.trim())
        .find((part) => part.startsWith(`${refreshCookieName}=`));

    return cookie?.slice(refreshCookieName.length + 1) || undefined;
}

function unauthorized(reply: FastifyReply) {
    return reply.status(401).send({
        message: 'Refresh token is invalid or expired.',
        errorCode: 'INVALID_REFRESH_TOKEN',
    });
}

export async function refreshSession(request: FastifyRequest, reply: FastifyReply) {
    const refreshToken = getRefreshToken(request);
    if (!refreshToken) {
        clearRefreshTokenCookie(reply);
        return unauthorized(reply);
    }

    const result = await rotateRefreshToken(refreshToken);
    if (result.status !== 'rotated') {
        clearRefreshTokenCookie(reply);
        return unauthorized(reply);
    }

    const token = await reply.jwtSign(
        { role: result.user.role, jti: randomUUID(), sid: result.sessionId },
        { sign: { sub: result.user.id, expiresIn: ACCESS_TOKEN_TTL } },
    );

    setRefreshTokenCookie(reply, result.refreshToken);
    return reply.status(200).send({
        token,
        expiresIn: 15 * 60,
        sessionId: result.sessionId,
    });
}

export async function logout(request: FastifyRequest, reply: FastifyReply) {
    const refreshToken = getRefreshToken(request);
    if (refreshToken) {
        await revokeRefreshToken(refreshToken);
    }

    clearRefreshTokenCookie(reply);
    return reply.status(204).send();
}

export async function getSessions(request: FastifyRequest, reply: FastifyReply) {
    const sessions = await listActiveSessions(request.user.sub);
    return reply.status(200).send({ sessions });
}

export async function deleteSession(request: FastifyRequest, reply: FastifyReply) {
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(request.params);
    const result = await revokeSession(request.user.sub, sessionId);
    if (result.count > 0) {
        await makeAuditLogger().log({
            ...auditRequestContext(request),
            action: auditActions.sessionRevoked,
            targetEntity: 'SESSION',
            targetId: sessionId,
            payload: { revokedCount: result.count },
        });
    }
    return reply.status(204).send();
}

export async function deleteAllSessions(request: FastifyRequest, reply: FastifyReply) {
    const result = await revokeSession(request.user.sub);
    if (result.count > 0) {
        await makeAuditLogger().log({
            ...auditRequestContext(request),
            action: auditActions.sessionRevoked,
            targetEntity: 'SESSION',
            payload: { revokedCount: result.count, scope: 'ALL_SESSIONS' },
        });
    }
    return reply.status(204).send();
}