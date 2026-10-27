import { prisma } from '../../lib/prisma.js';
import type { UsersRepository } from '../users-repository.js';
import type { Prisma, User } from '@prisma/client';

export class PrismaUsersRepository implements UsersRepository {
    async findByEmail(email: string): Promise<User | null> {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        return user;
    }

    async create(data: Prisma.UserCreateInput): Promise<User> {
        const user = await prisma.user.create({
            data,
        });

        return user;
    }
}