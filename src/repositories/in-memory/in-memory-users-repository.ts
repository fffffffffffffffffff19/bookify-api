import type { User, Prisma } from '@prisma/client';
import type { UsersRepository } from '../users-repository.js';
import { randomUUID } from 'node:crypto';

export class InMemoryUsersRepository implements UsersRepository {
    public items: User[] = [];

    async findById(id: string): Promise<User | null> {
        const user = this.items.find((item) => item.id === id);
        return user ?? null;
    }

    async findByEmail(email: string): Promise<User | null> {
        const user = this.items.find((item) => item.email === email);
        return user ?? null;
    }

    async create(data: Prisma.UserCreateInput): Promise<User> {
        const user: User = {
            id: randomUUID(),
            name: data.name,
            email: data.email,
            passwordHash: data.passwordHash,
            phone: data.phone ?? null,
            role: data.role ?? 'CLIENT',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.items.push(user);
        return user;
    }
}