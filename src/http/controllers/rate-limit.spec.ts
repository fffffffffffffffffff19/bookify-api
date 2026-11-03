import { randomUUID } from 'node:crypto';
import { app, buildApp } from '../../app.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('Sensitive endpoint rate limiting (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('returns the standard 429 envelope after five authentication requests', async () => {
        const responses = await Promise.all(
            Array.from({ length: 6 }, () => request(app.server)
                .post('/sessions')
                .send({ email: 'rate-limit@example.com', password: 'wrong-password' })),
        );

        expect(responses.slice(0, 5).every((response) => response.status !== 429)).toBe(true);
        const limitedResponse = responses.find((response) => response.status === 429);

        expect(limitedResponse, JSON.stringify(responses.map((response) => ({ status: response.status, body: response.body }))))
            .toBeDefined();
        expect(limitedResponse?.body).toEqual({
            error: {
                code: 'TOO_MANY_REQUESTS',
                message: expect.stringContaining('Rate limit exceeded.'),
            },
        });
    });

    it('limits authentication attempts for an account across different source IPs', async () => {
        const distributedApp = buildApp({ trustProxy: true });
        await distributedApp.ready();

        try {
            const email = `distributed-${randomUUID()}@example.com`;
            const responses = await Promise.all(
                Array.from({ length: 6 }, (_, index) => request(distributedApp.server)
                    .post('/sessions')
                    .set('X-Forwarded-For', `192.0.2.${index + 1}`)
                    .send({ email, password: 'wrong-password' })),
            );

            expect(
                responses.filter((response) => response.status === 429),
                JSON.stringify(responses.map((response) => ({ status: response.status, body: response.body }))),
            ).toHaveLength(1);
        } finally {
            await distributedApp.close();
        }
    });
});