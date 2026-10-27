import type { UsersRepository } from '../../repositories/users-repository.js';
import type { User } from '@prisma/client';
import { compare } from 'bcryptjs';

interface AuthenticateUseCaseRequest {
    email: string;
    password: string;
}

interface AuthenticateUseCaseResponse {
    user: User;
}

export class AuthenticateUseCase {
    constructor(private usersRepository: UsersRepository) { }

    async execute({
        email,
        password,
    }: AuthenticateUseCaseRequest): Promise<AuthenticateUseCaseResponse> {
        const user = await this.usersRepository.findByEmail(email);

        if (!user) {
            throw new Error('Invalid credentials.');
        }

        const doesPasswordMatches = await compare(password, user.passwordHash);

        if (!doesPasswordMatches) {
            throw new Error('Invalid credentials.');
        }

        return {
            user,
        };
    }
}