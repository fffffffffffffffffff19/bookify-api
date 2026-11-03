import { Prisma, type Service } from '@prisma/client';
import type { PublicCatalogService, ServiceUpdateData, ServicesRepository } from '../services-repository.js';
import { randomUUID } from 'node:crypto';

export class InMemoryServicesRepository implements ServicesRepository {
    public items: Service[] = [];

    async findById(id: string): Promise<Service | null> {
        const service = this.items.find((item) => item.id === id);
        return service ?? null;
    }

    async findManyByUserId(userId: string): Promise<Service[]> {
        return this.items.filter((item) => item.userId === userId);
    }

    async findPublicCatalog(): Promise<PublicCatalogService[]> {
        return this.items
            .slice()
            .sort((left, right) => left.title.localeCompare(right.title) || left.id.localeCompare(right.id))
            .map((service) => ({
                id: service.id,
                title: service.title,
                description: service.description,
                price: service.price,
                durationInMinutes: service.durationInMinutes,
                imageUrl: service.imageUrl,
                provider: { id: service.userId, name: null },
            }));
    }

    async findPublicCatalogPage(skip: number, take: number) {
        const services = await this.findPublicCatalog();
        return { services: services.slice(skip, skip + take), total: services.length };
    }

    async create(data: Prisma.ServiceUncheckedCreateInput): Promise<Service> {
        const service: Service = {
            id: data.id ?? randomUUID(),
            title: data.title,
            description: data.description ?? null,
            imageUrl: data.imageUrl ?? null,
            price: new Prisma.Decimal(data.price.toString()),
            durationInMinutes: data.durationInMinutes,
            userId: data.userId,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        this.items.push(service);
        return service;
    }

    async update(id: string, data: ServiceUpdateData): Promise<Service> {
        const serviceIndex = this.items.findIndex((item) => item.id === id);

        if (serviceIndex === -1) {
            throw new Error('Service not found.');
        }

        const existingService = this.items[serviceIndex] as Service;

        const updatedService: Service = {
            id: existingService.id,
            userId: existingService.userId,
            createdAt: existingService.createdAt,
            title: typeof data.title === 'string' ? data.title : existingService.title,
            description: data.description !== undefined ? data.description : existingService.description,
            imageUrl: data.imageUrl !== undefined ? data.imageUrl : existingService.imageUrl,
            price: data.price !== undefined ? new Prisma.Decimal(data.price.toString()) : existingService.price,
            durationInMinutes:
                typeof data.durationInMinutes === 'number'
                    ? data.durationInMinutes
                    : existingService.durationInMinutes,
            updatedAt: new Date(),
        };

        this.items[serviceIndex] = updatedService;
        return updatedService;
    }

    async delete(id: string): Promise<void> {
        this.items = this.items.filter((item) => item.id !== id);
    }
}