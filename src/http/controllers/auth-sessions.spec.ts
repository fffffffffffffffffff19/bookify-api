import { app } from '../../app.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

function cookieFrom(response: { headers: { 'set-cookie'?: string[] | string } }) {
    const header = response.headers['set-cookie'];
    const cookie = (Array.isArray(header) ? header[0] : header)?.split(';')[0];
    if (!cookie) {
        throw new Error('Expected the response to set the refresh-token cookie.');
    }
    return cookie;
}

async function authenticate(email: string, password: string) {
    const response = await request(app.server).post('/sessions').send({ email, password });
    expect(response.status).toEqual(200);
    return {
        email,
        password,
        token: response.body.data.token as string,
        sessionId: response.body.data.sessionId as string,
        cookie: cookieFrom(response),
    };
}

async function login() {
    const email = `session-${randomUUID()}@example.com`;
    const password = '123456password';
    const registration = await request(app.server).post('/users').send({
        name: 'Session Test User',
        email,
        password,
    });
    expect(registration.status).toEqual(201);
    return authenticate(email, password);
}

describe('Refresh tokens and sessions (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('rotates both tokens and rejects the consumed refresh token', async () => {
        const firstLogin = await login();

        const refresh = await request(app.server)
            .post('/auth/refresh')
            .set('Cookie', firstLogin.cookie);

        expect(refresh.status).toEqual(200);
        expect(refresh.body.data.token).not.toEqual(firstLogin.token);
        expect(refresh.body.data.sessionId).toEqual(firstLogin.sessionId);
        const rotatedCookie = cookieFrom(refresh);
        expect(rotatedCookie).not.toEqual(firstLogin.cookie);

        const replay = await request(app.server)
            .post('/auth/refresh')
            .set('Cookie', firstLogin.cookie);
        expect(replay.status).toEqual(401);

        const refreshedAgain = await request(app.server)
            .post('/auth/refresh')
            .set('Cookie', rotatedCookie);
        expect(refreshedAgain.status).toEqual(401);
    });

    it('lists active sessions and revokes one session or all sessions', async () => {
        const first = await login();
        const second = await authenticate(first.email, first.password);

        const listed = await request(app.server)
            .get('/auth/sessions')
            .set('Authorization', `Bearer ${first.token}`);
        expect(listed.status).toEqual(200);
        expect(listed.body.data.sessions).toHaveLength(2);
        expect(listed.body.data.sessions.map((session: { id: string }) => session.id))
            .toContain(first.sessionId);
        expect(JSON.stringify(listed.body)).not.toContain('tokenHash');

        const revokedOne = await request(app.server)
            .delete(`/auth/sessions/${first.sessionId}`)
            .set('Authorization', `Bearer ${first.token}`);
        expect(revokedOne.status).toEqual(204);

        const afterOne = await request(app.server)
            .get('/auth/sessions')
            .set('Authorization', `Bearer ${second.token}`);
        expect(afterOne.body.data.sessions).toHaveLength(1);

        const revokedAll = await request(app.server)
            .delete('/auth/sessions/all')
            .set('Authorization', `Bearer ${second.token}`);
        expect(revokedAll.status).toEqual(204);

        const afterAllRevoked = await request(app.server)
            .get('/auth/sessions')
            .set('Authorization', `Bearer ${second.token}`);
        expect(afterAllRevoked.body.data.sessions).toHaveLength(0);
    });

    it('logout revokes the current refresh session and clears its cookie', async () => {
        const authentication = await login();

        const response = await request(app.server)
            .post('/auth/logout')
            .set('Cookie', authentication.cookie);

        expect(response.status).toEqual(204);
        expect(response.headers['set-cookie']?.[0]).toContain('Max-Age=0');

        const refresh = await request(app.server)
            .post('/auth/refresh')
            .set('Cookie', authentication.cookie);
        expect(refresh.status).toEqual(401);
    });

    it('revokes all of the user sessions when a consumed token is reused', async () => {
        const first = await login();
        const second = await authenticate(first.email, first.password);
        const rotated = await request(app.server)
            .post('/auth/refresh')
            .set('Cookie', first.cookie);
        const rotatedCookie = cookieFrom(rotated);

        const replay = await request(app.server)
            .post('/auth/refresh')
            .set('Cookie', first.cookie);
        expect(replay.status).toEqual(401);

        const activeSessions = await request(app.server)
            .get('/auth/sessions')
            .set('Authorization', `Bearer ${second.token}`);
        expect(activeSessions.body.data.sessions).toHaveLength(0);

        const otherSessionRefresh = await request(app.server)
            .post('/auth/refresh')
            .set('Cookie', second.cookie);
        const rotatedSessionRefresh = await request(app.server)
            .post('/auth/refresh')
            .set('Cookie', rotatedCookie);
        expect(otherSessionRefresh.status).toEqual(401);
        expect(rotatedSessionRefresh.status).toEqual(401);
    });
});