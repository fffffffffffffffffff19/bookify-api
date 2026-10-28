import type { User } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import {
    InvalidCredentialsError,
    ResourceConflictError,
    ResourceNotFoundError,
} from '../../errors/application-error.js';
import type { UsersRepository } from '../../repositories/users-repository.js';

export interface UpdateUserProfileUseCaseRequest {
    userId: string;
    name?: string;
    email?: string;
    oldPassword?: string;
    newPassword?: string;
}

interface UpdateUserProfileUseCaseResponse {
    user: User;
}

export class UpdateUserProfileUseCase {
    constructor(private usersRepository: UsersRepository) { }

    async execute({
        userId,
        name,
        email,
        oldPassword,
        newPassword,
    }: UpdateUserProfileUseCaseRequest): Promise<UpdateUserProfileUseCaseResponse> {
        const user = await this.usersRepository.findById(userId);
        if (!user) {
            throw new ResourceNotFoundError('User not found.');
        }

        if (email && email !== user.email) {
            const userWithEmail = await this.usersRepository.findByEmail(email);
            if (userWithEmail && userWithEmail.id !== userId) {
                throw new ResourceConflictError('E-mail already exists.', 'EMAIL_ALREADY_EXISTS');
            }
        }

        const updateData: { name?: string; email?: string; passwordHash?: string } = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;

        if (newPassword !== undefined) {
            if (oldPassword === undefined || !(await compare(oldPassword, user.passwordHash))) {
                throw new InvalidCredentialsError();
            }
            updateData.passwordHash = await hash(newPassword, 6);
        }

        const updatedUser = await this.usersRepository.update(userId, updateData);
        return { user: updatedUser };
    }
}