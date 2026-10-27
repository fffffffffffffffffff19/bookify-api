import { prisma } from '../../lib/prisma.js';
import type { Prisma } from '@prisma/client';
import type { ServicesRepository } from '../services-repository.js';

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
                userId, // Corrigido de user_id para userId
            },
        });

        return services;
    }
}