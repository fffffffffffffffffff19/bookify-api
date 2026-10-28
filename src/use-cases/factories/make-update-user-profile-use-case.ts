import { PrismaUsersRepository } from '../../repositories/prisma/prisma-users-repository.js';
import { UpdateUserProfileUseCase } from '../users/update-user-profile.js';

export function makeUpdateUserProfileUseCase() {
    return new UpdateUserProfileUseCase(new PrismaUsersRepository());
}