import { PrismaUsersRepository } from '../../repositories/prisma/prisma-users-repository.js';
import { GetUserProfileUseCase } from '../users/get-user-profile.js';

export function makeGetUserProfileUseCase() {
    const prismaUsersRepository = new PrismaUsersRepository();
    const useCase = new GetUserProfileUseCase(prismaUsersRepository);

    return useCase;
}