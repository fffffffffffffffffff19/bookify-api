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

    it('should update profile fields and return only the safe profile DTO', async () => {
        const email = `profile-update-${randomUUID()}@example.com`;
        await request(app.server).post('/users').send({
            name: 'Before Update',
            email,
            password: '123456password',
        });
        const authResponse = await request(app.server).post('/sessions').send({
            email,
            password: '123456password',
        });

        const response = await request(app.server)
            .patch('/me')
            .set('Authorization', `Bearer ${authResponse.body.data.token}`)
            .send({ name: 'After Update', email: `updated-${email}` });

        expect(response.status).toEqual(200);
        expect(response.body.data.user).toEqual({
            id: expect.any(String),
            name: 'After Update',
            email: `updated-${email}`,
            role: 'CLIENT',
            createdAt: expect.any(String),
        });
        expect(response.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('should require authentication to update a profile', async () => {
        const response = await request(app.server)
            .patch('/me')
            .send({ name: 'No Token' });

        expect(response.status).toEqual(401);
        expect(response.body).toEqual({
            message: 'Authentication required or token is invalid.',
            errorCode: 'UNAUTHORIZED',
        });
    });

    it('should reject a password update without the old password', async () => {
        const email = `password-update-${randomUUID()}@example.com`;
        await request(app.server).post('/users').send({
            name: 'Password User',
            email,
            password: '123456password',
        });
        const authResponse = await request(app.server).post('/sessions').send({
            email,
            password: '123456password',
        });

        const response = await request(app.server)
            .patch('/me')
            .set('Authorization', `Bearer ${authResponse.body.data.token}`)
            .send({ newPassword: 'new-password' });

        expect(response.status).toEqual(400);
        expect(response.body).toMatchObject({
            message: 'Validation error.',
            errorCode: 'VALIDATION_ERROR',
        });
    });
});