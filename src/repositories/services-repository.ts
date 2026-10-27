import type { Service, Prisma } from '@prisma/client';

export interface ServicesRepository {
    create(data: Prisma.ServiceUncheckedCreateInput): Promise<Service>;
    findManyByUserId(userId: string): Promise<Service[]>;
    findById(id: string): Promise<Service | null>;
    save(service: Service): Promise<Service>;
    delete(id: string): Promise<void>;
}