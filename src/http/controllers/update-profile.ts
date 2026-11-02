import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { auditActions } from '../../audit/audit-logger.js';
import { auditRequestContext } from '../../audit/audit-request-context.js';
import { makeAuditLogger } from '../../use-cases/factories/make-audit-logger.js';
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
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.oldPassword !== undefined ? { oldPassword: body.oldPassword } : {}),
        ...(body.newPassword !== undefined ? { newPassword: body.newPassword } : {}),
    });

    if (Object.keys(body).length > 0) {
        await makeAuditLogger().log({
            ...auditRequestContext(request),
            action: auditActions.userProfileUpdated,
            targetEntity: 'USER',
            targetId: user.id,
            payload: {
                changedFields: [
                    ...(body.name !== undefined ? ['name'] : []),
                    ...(body.email !== undefined ? ['email'] : []),
                    ...(body.oldPassword !== undefined || body.newPassword !== undefined ? ['password'] : []),
                ],
            },
        });
    }

    return reply.status(200).send({
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatarUrl: user.avatarUrl,
            createdAt: user.createdAt,
        },
    });
}