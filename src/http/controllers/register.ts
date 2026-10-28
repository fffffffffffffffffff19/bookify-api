import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { makeRegisterUseCase } from '../../use-cases/factories/make-register-use-case.js';

export async function register(request: FastifyRequest, reply: FastifyReply) {
    const registerBodySchema = z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string().min(6),
        phone: z.string().optional(),
    });

    const { name, email, password, phone } = registerBodySchema.parse(request.body);

    const registerUseCase = makeRegisterUseCase();

    await registerUseCase.execute({
        name,
        email,
        password,
        ...(phone ? { phone } : {}),
    });

    return reply.status(201).send({ user: { email } });
}