import type { UsersRepository } from '../../repositories/users-repository.js';
import type { User } from '@prisma/client';

interface GetUserProfileUseCaseRequest {
    userId: string;
}

interface GetUserProfileUseCaseResponse {
    user: User;
}

export class GetUserProfileUseCase {
    constructor(private usersRepository: UsersRepository) { }

    async execute({
        userId,
    }: GetUserProfileUseCaseRequest): Promise<GetUserProfileUseCaseResponse> {
        const user = await this.usersRepository.findById(userId);

        if (!user) {
            throw new Error('Resource not found.');
        }

        return {
            user,
        };
    }
}