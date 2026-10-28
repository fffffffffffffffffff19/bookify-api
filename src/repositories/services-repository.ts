import type { Service, Prisma } from '@prisma/client';

export interface ServicesRepository {
    create(data: Prisma.ServiceUncheckedCreateInput): Promise<Service>;
    findManyByUserId(userId: string): Promise<Service[]>;
    findPublicCatalog(): Promise<PublicCatalogService[]>;
    findById(id: string): Promise<Service | null>;
    save(service: Service): Promise<Service>;
    delete(id: string): Promise<void>;
}

export interface PublicCatalogService {
    id: string;
    title: string;
    description: string | null;
    price: Service['price'];
    durationInMinutes: number;
    provider: {
        id: string;
        name: string | null;
    };
}