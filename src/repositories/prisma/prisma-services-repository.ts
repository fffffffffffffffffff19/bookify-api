import { prisma } from '../../lib/prisma.js';
import type { Prisma, Service } from '@prisma/client';
import type { ServicesRepository } from '../services-repository.js';

export class PrismaServicesRepository implements ServicesRepository {
    async create(data: Prisma.ServiceUncheckedCreateInput): Promise<Service> {
        const service = await prisma.service.create({
            data,
        });

        return service;
    }
}