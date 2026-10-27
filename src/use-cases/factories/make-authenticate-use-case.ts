import { PrismaUsersRepository } from '../../repositories/prisma/prisma-users-repository.js';
import { AuthenticateUseCase } from '../users/authenticate.js';

export function makeAuthenticateUseCase() {
    const prismaUsersRepository = new PrismaUsersRepository();
    const authenticateUseCase = new AuthenticateUseCase(prismaUsersRepository);

    return authenticateUseCase;
}