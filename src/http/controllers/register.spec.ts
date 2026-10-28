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

    it('should ignore a requested privileged role during public registration', async () => {
        const email = `admin-attempt-${randomUUID()}@example.com`;
        const registration = await request(app.server)
            .post('/users')
            .send({
                name: 'Admin Attempt',
                email,
                password: '123456password',
                role: 'ADMIN',
            });
        const authentication = await request(app.server)
            .post('/sessions')
            .send({ email, password: '123456password' });
        const profile = await request(app.server)
            .get('/me')
            .set('Authorization', `Bearer ${authentication.body.data.token}`);

        expect(registration.status).toEqual(201);
        expect(profile.status).toEqual(200);
        expect(profile.body.data.user.role).toEqual('CLIENT');
    });
});