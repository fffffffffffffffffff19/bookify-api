import { hash } from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { prisma } from '../../lib/prisma.js';

export async function provisionAndAuthenticate(
    app: FastifyInstance,
    role: 'CLIENT' | 'PROVIDER' | 'ADMIN',
) {
    const email = `e2e-${role.toLowerCase()}-${randomUUID()}@example.com`;
    const password = '123456password';

    await prisma.user.create({
        data: {
            name: `E2E ${role}`,
            email,
            passwordHash: await hash(password, 6),
            role,
        },
    });

    const authentication = await request(app.server)
        .post('/sessions')
        .send({ email, password });

    return {
        email,
        password,
        token: authentication.body.data.token as string,
    };
}
