import { PrismaUsersRepository } from '../../repositories/prisma/prisma-users-repository.js';
import { RegisterUseCase } from '../users/register.js';

export function makeRegisterUseCase() {
    const usersRepository = new PrismaUsersRepository();
    const registerUseCase = new RegisterUseCase(usersRepository);

    return registerUseCase;
}