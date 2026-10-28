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

    async update(userId: string, data: Prisma.UserUpdateInput): Promise<User> {
        const index = this.items.findIndex((item) => item.id === userId);
        if (index < 0) {
            throw new Error('User not found.');
        }

        const existingUser = this.items[index] as User;
        const updatedUser: User = {
            ...existingUser,
            name: typeof data.name === 'string' ? data.name : existingUser.name,
            email: typeof data.email === 'string' ? data.email : existingUser.email,
            passwordHash:
                typeof data.passwordHash === 'string' ? data.passwordHash : existingUser.passwordHash,
            updatedAt: new Date(),
        };

        this.items[index] = updatedUser;
        return updatedUser;
    }
}