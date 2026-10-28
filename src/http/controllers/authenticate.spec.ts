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
                data: { token: expect.any(String) },
            }),
        );
    });

    it('should return a standardized 401 error for invalid credentials', async () => {
        const response = await request(app.server).post('/sessions').send({
            email: 'unknown@example.com',
            password: '123456password',
        });

        expect(response.status).toEqual(401);
        expect(response.body).toEqual({
            message: 'Invalid credentials.',
            errorCode: 'INVALID_CREDENTIALS',
        });
    });

    it('should return a standardized validation error envelope', async () => {
        const response = await request(app.server).post('/sessions').send({ email: 'not-an-email' });

        expect(response.status).toEqual(400);
        expect(response.body).toMatchObject({
            message: 'Validation error.',
            errorCode: 'VALIDATION_ERROR',
        });
        expect(response.body.issues).toEqual(expect.any(Array));
    });

    it('should return a standardized not-found envelope for unknown routes', async () => {
        const response = await request(app.server).get('/no-such-route');

        expect(response.status).toEqual(404);
        expect(response.body).toEqual({
            message: 'Route not found.',
            errorCode: 'ROUTE_NOT_FOUND',
        });
    });
});