import type { FastifyRequest, FastifyReply } from 'fastify';
import { makeGetUserProfileUseCase } from '../../use-cases/factories/make-get-user-profile-use-case.js';

export async function profile(request: FastifyRequest, reply: FastifyReply) {
    const getUserProfile = makeGetUserProfileUseCase();

    const { user } = await getUserProfile.execute({
        userId: request.user.sub,
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