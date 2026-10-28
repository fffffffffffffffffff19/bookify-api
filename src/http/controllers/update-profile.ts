import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { makeUpdateUserProfileUseCase } from '../../use-cases/factories/make-update-user-profile-use-case.js';

const updateProfileBodySchema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    oldPassword: z.string().min(6).optional(),
    newPassword: z.string().min(8).optional(),
}).refine((body) => body.newPassword === undefined || body.oldPassword !== undefined, {
    message: 'oldPassword is required when changing the password.',
    path: ['oldPassword'],
});

export async function updateProfile(request: FastifyRequest, reply: FastifyReply) {
    const body = updateProfileBodySchema.parse(request.body);
    const useCase = makeUpdateUserProfileUseCase();
    const { user } = await useCase.execute({
        userId: request.user.sub,
        ...body,
    });

    return reply.status(200).send({
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
        },
    });
}