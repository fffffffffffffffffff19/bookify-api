import { prisma } from '../../lib/prisma.js';
import type { Prisma, Service } from '@prisma/client';
import type { PublicCatalogService, ServicesRepository } from '../services-repository.js';

export class PrismaServicesRepository implements ServicesRepository {
    async create(data: Prisma.ServiceUncheckedCreateInput) {
        const service = await prisma.service.create({
            data,
        });

        return service;
    }

    async findManyByUserId(userId: string) {
        const services = await prisma.service.findMany({
            where: {
                userId,
            },
        });

        return services;
    }

    async findPublicCatalog(): Promise<PublicCatalogService[]> {
        const services = await prisma.service.findMany({
            orderBy: [{ title: 'asc' }, { id: 'asc' }],
            select: {
                id: true,
                title: true,
                description: true,
                price: true,
                durationInMinutes: true,
                user: { select: { id: true, name: true } },
            },
        });

        return services.map(({ user, ...service }) => ({
            ...service,
            provider: user,
        }));
    }

    async findById(id: string) {
        const service = await prisma.service.findUnique({
            where: {
                id,
            },
        });

        return service;
    }

    async save(service: Service) {
        const updatedService = await prisma.service.update({
            where: {
                id: service.id,
            },
            data: service,
        });

        return updatedService;
    }

    async delete(id: string) {
        await prisma.service.delete({
            where: {
                id,
            },
        });
    }
}