import { prisma } from '../../lib/prisma.js';
import type { Prisma, User } from '@prisma/client';
import type { UsersRepository } from '../users-repository.js';

export class PrismaUsersRepository implements UsersRepository {
    async findById(id: string): Promise<User | null> {
        const user = await prisma.user.findUnique({
            where: {
                id,
            },
        });

        return user;
    }

    async findByEmail(email: string): Promise<User | null> {
        const user = await prisma.user.findUnique({
            where: {
                email,
            },
        });

        return user;
    }

    async create(data: Prisma.UserCreateInput): Promise<User> {
        const user = await prisma.user.create({
            data,
        });

        return user;
    }

    async update(userId: string, data: Prisma.UserUpdateInput): Promise<User> {
        return prisma.user.update({
            where: { id: userId },
            data,
        });
    }

    async updateAndRevokeOtherSessions(
        userId: string,
        activeSessionId: string | undefined,
        data: Prisma.UserUpdateInput,
    ): Promise<User> {
        return prisma.$transaction(async (transaction) => {
            const user = await transaction.user.update({ where: { id: userId }, data });
            await transaction.session.updateMany({
                where: {
                    userId,
                    revokedAt: null,
                    ...(activeSessionId ? { id: { not: activeSessionId } } : {}),
                },
                data: { revokedAt: new Date() },
            });
            return user;
        });
    }
}