import type { Service, Prisma } from '@prisma/client';

export interface ServiceUpdateData {
    title?: string;
    description?: string | null;
    price?: number;
    durationInMinutes?: number;
    imageUrl?: string | null;
}

export interface ServicesRepository {
    create(data: Prisma.ServiceUncheckedCreateInput): Promise<Service>;
    update(id: string, data: ServiceUpdateData): Promise<Service>;
    findManyByUserId(userId: string): Promise<Service[]>;
    findPublicCatalog(): Promise<PublicCatalogService[]>;
    findPublicCatalogPage(skip: number, take: number): Promise<{ services: PublicCatalogService[]; total: number }>;
    findById(id: string): Promise<Service | null>;
    delete(id: string): Promise<void>;
}

export interface PublicCatalogService {
    id: string;
    title: string;
    description: string | null;
    price: Service['price'];
    durationInMinutes: number;
    imageUrl: string | null;
    provider: {
        id: string;
        name: string | null;
    };
}