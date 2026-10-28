import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { makeAuthenticateUseCase } from '../../use-cases/factories/make-authenticate-use-case.js';

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
        },
        {
            sign: {
                sub: user.id,
                expiresIn: '7d',
            },
        }
    );

    return reply.status(200).send({ token });
}