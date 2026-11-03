import { beforeEach, describe, expect, it, vi } from 'vitest';

const database = vi.hoisted(() => ({
    createSession: vi.fn(),
    updateSession: vi.fn(),
    findSessions: vi.fn(),
    findActiveSession: vi.fn(),
    findRefreshToken: vi.fn(),
    consumeRefreshToken: vi.fn(),
    createRefreshToken: vi.fn(),
    transaction: vi.fn(),
}));

vi.mock('../../lib/prisma.js', () => ({
    prisma: {
        session: {
            create: database.createSession,
            updateMany: database.updateSession,
            findMany: database.findSessions,
            findFirst: database.findActiveSession,
        },
        refreshToken: {
            findUnique: database.findRefreshToken,
            updateMany: database.consumeRefreshToken,
            create: database.createRefreshToken,
        },
        $transaction: database.transaction,
    },
}));

import {
    createSession,
    listActiveSessions,
    isSessionActive,
    revokeRefreshToken,
    revokeSession,
    revokeOtherSessions,
    rotateRefreshToken,
} from '../../lib/sessions.js';

describe('Session management', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        database.transaction.mockImplementation(async (operation) => operation({
            session: { updateMany: database.updateSession },
            refreshToken: {
                findUnique: database.findRefreshToken,
                updateMany: database.consumeRefreshToken,
                create: database.createRefreshToken,
            },
        }));
        database.createSession.mockResolvedValue({ id: 'session-id' });
        database.updateSession.mockResolvedValue({ count: 1 });
        database.consumeRefreshToken.mockResolvedValue({ count: 1 });
        database.createRefreshToken.mockResolvedValue({ id: 'refresh-id' });
        database.findActiveSession.mockResolvedValue({ id: 'session-id' });
    });

    it('creates a session with only a SHA-256 refresh-token hash stored', async () => {
        const result = await createSession('user-id');
        const [createCall] = database.createSession.mock.calls;
        if (!createCall) throw new Error('Expected session creation call.');
        const refreshTokenData = createCall[0].data.refreshTokens.create;

        expect(result.sessionId).toEqual('session-id');
        expect(result.refreshToken).toHaveLength(43);
        expect(refreshTokenData.tokenHash).toMatch(/^[a-f0-9]{64}$/);
        expect(refreshTokenData.tokenHash).not.toEqual(result.refreshToken);
    });

    it('atomically consumes a refresh token and stores the next token hash', async () => {
        database.findRefreshToken.mockResolvedValue({
            id: 'stored-refresh-id',
            sessionId: 'session-id',
            consumedAt: null,
            expiresAt: new Date(Date.now() + 60_000),
            session: {
                userId: 'user-id',
                expiresAt: new Date(Date.now() + 60_000),
                revokedAt: null,
                user: { id: 'user-id', role: 'CLIENT' },
            },
        });

        const result = await rotateRefreshToken('presented-token');

        expect(result.status).toEqual('rotated');
        expect(database.consumeRefreshToken).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ id: 'stored-refresh-id', consumedAt: null }),
        }));
        expect(database.createRefreshToken).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ sessionId: 'session-id' }),
        }));
        const [createRefreshTokenCall] = database.createRefreshToken.mock.calls;
        if (!createRefreshTokenCall) throw new Error('Expected refresh token creation call.');
        expect(createRefreshTokenCall[0].data.tokenHash)
            .not.toEqual(result.status === 'rotated' ? result.refreshToken : '');
    });

    it('revokes every active user session when a consumed refresh token is reused', async () => {
        database.findRefreshToken.mockResolvedValue({
            id: 'used-refresh-id',
            sessionId: 'session-id',
            consumedAt: new Date(),
            session: { userId: 'user-id' },
        });

        const result = await rotateRefreshToken('replayed-token');

        expect(result).toEqual({ status: 'reuse' });
        expect(database.updateSession).toHaveBeenCalledWith({
            where: { userId: 'user-id', revokedAt: null },
            data: { revokedAt: expect.any(Date) },
        });
        expect(database.createRefreshToken).not.toHaveBeenCalled();
    });

    it('lists only non-expired sessions and revokes sessions by owner', async () => {
        database.findSessions.mockResolvedValue([]);

        await listActiveSessions('user-id');
        expect(database.findSessions).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ userId: 'user-id', revokedAt: null }),
        }));

        await revokeSession('user-id', 'session-id');
        expect(database.updateSession).toHaveBeenCalledWith({
            where: { userId: 'user-id', revokedAt: null, id: 'session-id' },
            data: { revokedAt: expect.any(Date) },
        });
    });

    it('checks that access-token sessions are active and owned by the token subject', async () => {
        database.findActiveSession.mockResolvedValue({ id: 'session-id' });

        await expect(isSessionActive('user-id', 'session-id')).resolves.toBe(true);
        expect(database.findActiveSession).toHaveBeenCalledWith({
            where: {
                id: 'session-id',
                userId: 'user-id',
                revokedAt: null,
                expiresAt: { gt: expect.any(Date) },
            },
            select: { id: true },
        });
    });

    it('revokes the refresh-token session on logout', async () => {
        database.findRefreshToken.mockResolvedValue({ sessionId: 'session-id' });

        await revokeRefreshToken('refresh-token');

        expect(database.updateSession).toHaveBeenCalledWith({
            where: { id: 'session-id', revokedAt: null },
            data: { revokedAt: expect.any(Date) },
        });
    });

    it('revokes other sessions while preserving the active password-change session', async () => {
        await revokeOtherSessions('user-id', 'current-session-id');

        expect(database.updateSession).toHaveBeenCalledWith({
            where: { userId: 'user-id', id: { not: 'current-session-id' }, revokedAt: null },
            data: { revokedAt: expect.any(Date) },
        });
    });

    it('does not classify an expired consumed refresh token as replay', async () => {
        database.findRefreshToken.mockResolvedValue({
            id: 'expired-consumed-token',
            sessionId: 'session-id',
            consumedAt: new Date(Date.now() - 10_000),
            expiresAt: new Date(Date.now() - 1_000),
            session: {
                userId: 'user-id',
                expiresAt: new Date(Date.now() + 60_000),
                revokedAt: null,
            },
        });

        await expect(rotateRefreshToken('expired-token')).resolves.toEqual({ status: 'invalid' });
        expect(database.updateSession).not.toHaveBeenCalled();
    });
});