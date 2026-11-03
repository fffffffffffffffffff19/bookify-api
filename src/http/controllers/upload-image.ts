import { randomUUID } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Service } from '@prisma/client';
import { invalidateServiceCaches } from '../../lib/cache.js';
import { storage } from '../../storage/index.js';
import { validateImageUpload } from '../../storage/image-upload.js';
import { makeUpdateServiceUseCase } from '../../use-cases/factories/make-update-service-use-case.js';
import { BusinessRuleError } from '../../errors/application-error.js';
import { makeUpdateUserProfileUseCase } from '../../use-cases/factories/make-update-user-profile-use-case.js';

async function storeRequestImage(request: FastifyRequest, keyPrefix: string) {
    const file = await request.file();
    if (!file) {
        throw new BusinessRuleError('An image file is required.', 'IMAGE_REQUIRED');
    }

    const body = await file.toBuffer();
    const extension = validateImageUpload(file.mimetype, body);
    return storage.store({
        key: `${keyPrefix}/${randomUUID()}.${extension}`,
        contentType: file.mimetype,
        body,
    });
}

export async function uploadAvatar(request: FastifyRequest, reply: FastifyReply) {
    const stored = await storeRequestImage(request, `avatars/${request.user.sub}`);
    const useCase = makeUpdateUserProfileUseCase();
    let user;
    try {
        ({ user } = await useCase.execute({
            userId: request.user.sub,
            avatarUrl: stored.url,
        }));
    } catch (error) {
        await storage.delete(stored.key);
        throw error;
    }

    return reply.status(200).send({
        user: { id: user.id, avatarUrl: user.avatarUrl },
    });
}

export async function uploadServiceImage(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const stored = await storeRequestImage(request, `services/${id}`);
    const useCase = makeUpdateServiceUseCase();
    let service: Service;
    try {
        ({ service } = await useCase.execute({
            serviceId: id,
            userId: request.user.sub,
            imageUrl: stored.url,
        }));
    } catch (error) {
        await storage.delete(stored.key);
        throw error;
    }
    await invalidateServiceCaches(service.id);

    return reply.status(200).send({ service });
}