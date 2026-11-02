import { randomUUID } from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { makeAuthenticateUseCase } from '../../use-cases/factories/make-authenticate-use-case.js';
import { ACCESS_TOKEN_TTL, createSession, REFRESH_TOKEN_TTL_SECONDS } from '../../lib/sessions.js';
import { setRefreshTokenCookie } from './auth-session.js';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
    const authenticateBodySchema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
    });

    const { email, password } = authenticateBodySchema.parse(request.body);

    const authenticateUseCase = makeAuthenticateUseCase();

    const { user } = await authenticateUseCase.execute({
        email,
        password,
    });

    const token = await reply.jwtSign(
        {
            role: user.role,
            jti: randomUUID(),
        },
        {
            sign: {
                sub: user.id,
                expiresIn: ACCESS_TOKEN_TTL,
            },
        }
    );

    const session = await createSession(user.id);
    setRefreshTokenCookie(reply, session.refreshToken);

    return reply.status(200).send({
        token,
        expiresIn: 15 * 60,
        sessionId: session.sessionId,
        refreshTokenExpiresIn: REFRESH_TOKEN_TTL_SECONDS,
    });
}