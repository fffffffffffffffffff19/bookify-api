import { createHash, randomBytes } from 'node:crypto';
import { prisma } from './prisma.js';

export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const refreshTokenLifetimeMs = REFRESH_TOKEN_TTL_SECONDS * 1000;

function hashRefreshToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
}

function createRefreshToken() {
    return randomBytes(32).toString('base64url');
}

export async function createSession(userId: string) {
    const refreshToken = createRefreshToken();
    const expiresAt = new Date(Date.now() + refreshTokenLifetimeMs);
    const session = await prisma.session.create({
        data: {
            userId,
            expiresAt,
            refreshTokens: {
                create: {
                    tokenHash: hashRefreshToken(refreshToken),
                    expiresAt,
                },
            },
        },
    });

    return { sessionId: session.id, refreshToken };
}

export async function rotateRefreshToken(refreshToken: string) {
    const tokenHash = hashRefreshToken(refreshToken);
    const now = new Date();

    return prisma.$transaction(async (transaction) => {
        const storedToken = await transaction.refreshToken.findUnique({
            where: { tokenHash },
            include: { session: { include: { user: true } } },
        });

        if (!storedToken) {
            return { status: 'invalid' as const };
        }

        if (
            storedToken.expiresAt <= now ||
            storedToken.session.expiresAt <= now ||
            storedToken.session.revokedAt
        ) {
            return { status: 'invalid' as const };
        }

        if (storedToken.consumedAt) {
            await transaction.session.updateMany({
                where: { userId: storedToken.session.userId, revokedAt: null },
                data: { revokedAt: now },
            });
            return { status: 'reuse' as const };
        }

        const consumed = await transaction.refreshToken.updateMany({
            where: { id: storedToken.id, consumedAt: null, expiresAt: { gt: now } },
            data: { consumedAt: now },
        });

        if (consumed.count !== 1) {
            await transaction.session.updateMany({
                where: { userId: storedToken.session.userId, revokedAt: null },
                data: { revokedAt: now },
            });
            return { status: 'reuse' as const };
        }

        const nextRefreshToken = createRefreshToken();
        const nextExpiresAt = new Date(Date.now() + refreshTokenLifetimeMs);
        const updatedSession = await transaction.session.updateMany({
            where: { id: storedToken.sessionId, revokedAt: null, expiresAt: { gt: now } },
            data: { lastUsedAt: now, expiresAt: nextExpiresAt },
        });

        if (updatedSession.count !== 1) {
            return { status: 'invalid' as const };
        }

        await transaction.refreshToken.create({
            data: {
                sessionId: storedToken.sessionId,
                tokenHash: hashRefreshToken(nextRefreshToken),
                expiresAt: nextExpiresAt,
            },
        });

        return {
            status: 'rotated' as const,
            user: storedToken.session.user,
            sessionId: storedToken.sessionId,
            refreshToken: nextRefreshToken,
        };
    });
}

export async function revokeRefreshToken(refreshToken: string) {
    const storedToken = await prisma.refreshToken.findUnique({
        where: { tokenHash: hashRefreshToken(refreshToken) },
        select: { sessionId: true },
    });

    if (storedToken) {
        await prisma.session.updateMany({
            where: { id: storedToken.sessionId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
}

export async function listActiveSessions(userId: string) {
    return prisma.session.findMany({
        where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true, createdAt: true, lastUsedAt: true, expiresAt: true },
        orderBy: { createdAt: 'desc' },
    });
}

export async function isSessionActive(userId: string, sessionId: string) {
    const session = await prisma.session.findFirst({
        where: {
            id: sessionId,
            userId,
            revokedAt: null,
            expiresAt: { gt: new Date() },
        },
        select: { id: true },
    });
    return session !== null;
}

export async function revokeSession(userId: string, sessionId?: string) {
    return prisma.session.updateMany({
        where: {
            userId,
            revokedAt: null,
            ...(sessionId ? { id: sessionId } : {}),
        },
        data: { revokedAt: new Date() },
    });
}

export async function revokeOtherSessions(userId: string, activeSessionId: string) {
    return prisma.session.updateMany({
        where: {
            userId,
            id: { not: activeSessionId },
            revokedAt: null,
        },
        data: { revokedAt: new Date() },
    });
}