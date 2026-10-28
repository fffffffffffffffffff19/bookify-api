import type { UsersRepository } from '../../repositories/users-repository.js';
import type { User } from '@prisma/client';
import { ResourceNotFoundError } from '../../errors/application-error.js';

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
            throw new ResourceNotFoundError('User not found.');
        }

        return {
            user,
        };
    }
}