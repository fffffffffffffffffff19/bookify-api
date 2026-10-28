import type { UsersRepository } from '../../repositories/users-repository.js';
import type { User } from '@prisma/client';
import { hash } from 'bcryptjs';
import { ResourceConflictError } from '../../errors/application-error.js';

interface RegisterUseCaseRequest {
    name: string;
    email: string;
    password: string;
    phone?: string;
}

interface RegisterUseCaseResponse {
    user: User;
}

export class RegisterUseCase {
    constructor(private usersRepository: UsersRepository) { }

    async execute({
        name,
        email,
        password,
        phone,
    }: RegisterUseCaseRequest): Promise<RegisterUseCaseResponse> {
        const passwordHash = await hash(password, 6);

        const userWithSameEmail = await this.usersRepository.findByEmail(email);

        if (userWithSameEmail) {
            throw new ResourceConflictError('E-mail already exists.', 'EMAIL_ALREADY_EXISTS');
        }

        const user = await this.usersRepository.create({
            name,
            email,
            passwordHash,
            ...(phone !== undefined && { phone }),
            role: 'CLIENT',
        });

        return { user };
    }
}