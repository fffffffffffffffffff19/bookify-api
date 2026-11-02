import { beforeEach, describe, expect, it, vi } from 'vitest';

const database = vi.hoisted(() => ({
    createSession: vi.fn(),
    updateSession: vi.fn(),
    findSessions: vi.fn(),
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
    revokeRefreshToken,
    revokeSession,
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
    });

    it('creates a session with only a SHA-256 refresh-token hash stored', async () => {
        const result = await createSession('user-id');
        const refreshTokenData = database.createSession.mock.calls[0][0].data.refreshTokens.create;

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
        expect(database.createRefreshToken.mock.calls[0][0].data.tokenHash)
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

    it('revokes the refresh-token session on logout', async () => {
        database.findRefreshToken.mockResolvedValue({ sessionId: 'session-id' });

        await revokeRefreshToken('refresh-token');

        expect(database.updateSession).toHaveBeenCalledWith({
            where: { id: 'session-id', revokedAt: null },
            data: { revokedAt: expect.any(Date) },
        });
    });
});