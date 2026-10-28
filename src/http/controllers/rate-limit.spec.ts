import { app } from '../../app.js';
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

        expect(limitedResponse).toBeDefined();
        expect(limitedResponse?.body).toEqual({
            error: {
                code: 'TOO_MANY_REQUESTS',
                message: expect.stringContaining('Rate limit exceeded.'),
            },
        });
    });
});