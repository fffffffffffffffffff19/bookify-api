import { app } from '../../app.js';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';

describe('Register (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should be able to register a new user', async () => {
        const email = `johndoe-${randomUUID()}@example.com`;

        const response = await request(app.server)
            .post('/users')
            .send({
                name: 'John Doe',
                email,
                password: '123456password',
                role: 'CLIENT',
            });

        expect(response.status).toEqual(201);
    });
});