import { app } from '../../app.js';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';

describe('Profile (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should be able to get user profile', async () => {
        const email = `johndoe-${randomUUID()}@example.com`;

        await request(app.server).post('/users').send({
            name: 'John Doe',
            email,
            password: '123456password',
            role: 'CLIENT',
        });

        const authResponse = await request(app.server).post('/sessions').send({
            email,
            password: '123456password',
        });

        const { token } = authResponse.body.data;

        const profileResponse = await request(app.server)
            .get('/me')
            .set('Authorization', `Bearer ${token}`);

        expect(profileResponse.status).toEqual(200);
        expect(profileResponse.body).toEqual({
            data: {
                user: expect.objectContaining({
                    id: expect.any(String),
                    name: 'John Doe',
                    email,
                    role: 'CLIENT',
                    createdAt: expect.any(String),
                }),
            },
        });
        expect(profileResponse.body.data.user).not.toHaveProperty('passwordHash');
        expect(profileResponse.body.data.user).not.toHaveProperty('phone');
    });
});