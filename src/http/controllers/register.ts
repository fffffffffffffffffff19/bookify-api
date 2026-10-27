import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { makeRegisterUseCase } from '../../use-cases/factories/make-register-use-case.js';

export async function register(request: FastifyRequest, reply: FastifyReply) {
    const registerBodySchema = z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string().min(6),
        phone: z.string().optional(),
        role: z.enum(['CLIENT', 'PROVIDER', 'ADMIN']).optional(),
    });

    const { name, email, password, phone, role } = registerBodySchema.parse(request.body);

    try {
        const registerUseCase = makeRegisterUseCase();

        await registerUseCase.execute({
            name,
            email,
            password,
            ...(phone ? { phone } : {}),
            ...(role ? { role } : {}),
        });
    } catch (err: any) {
        if (err.message === 'E-mail already exists.') {
            return reply.status(409).send({ message: err.message });
        }

        throw err;
    }

    return reply.status(201).send();
}