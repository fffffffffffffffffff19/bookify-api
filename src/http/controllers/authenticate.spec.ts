import { app } from '../../app.js';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';

describe('Authenticate (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should be able to authenticate', async () => {
        const email = `johndoe-${randomUUID()}@example.com`;

        await request(app.server).post('/users').send({
            name: 'John Doe',
            email,
            password: '123456password',
            role: 'CLIENT',
        });

        const response = await request(app.server).post('/sessions').send({
            email,
            password: '123456password',
        });

        expect(response.status).toEqual(200);
        expect(response.body).toEqual(
            expect.objectContaining({
                token: expect.any(String),
            }),
        );
    });
});