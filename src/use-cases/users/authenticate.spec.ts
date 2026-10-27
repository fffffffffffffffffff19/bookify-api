import { describe, beforeEach, it, expect } from 'vitest';
import { AuthenticateUseCase } from './authenticate.js';
import { InMemoryUsersRepository } from '../../repositories/in-memory/in-memory-users-repository.js';
import { hash } from 'bcryptjs';

let usersRepository: InMemoryUsersRepository;
let sut: AuthenticateUseCase;

describe('Authenticate Use Case', () => {
    beforeEach(() => {
        usersRepository = new InMemoryUsersRepository();
        sut = new AuthenticateUseCase(usersRepository);
    });

    it('should be able to authenticate', async () => {
        const passwordHash = await hash('123456', 6);

        await usersRepository.create({
            name: 'John Doe',
            email: 'johndoe@example.com',
            passwordHash,
        });

        const { user } = await sut.execute({
            email: 'johndoe@example.com',
            password: '123456',
        });

        expect(user.id).toEqual(expect.any(String));
    });

    it('should not be able to authenticate with wrong email', async () => {
        await expect(() =>
            sut.execute({
                email: 'wrong-email@example.com',
                password: '123456',
            })
        ).rejects.toThrow('Invalid credentials.');
    });

    it('should not be able to authenticate with wrong password', async () => {
        const passwordHash = await hash('123456', 6);

        await usersRepository.create({
            name: 'John Doe',
            email: 'johndoe@example.com',
            passwordHash,
        });

        await expect(() =>
            sut.execute({
                email: 'johndoe@example.com',
                password: 'wrong-password',
            })
        ).rejects.toThrow('Invalid credentials.');
    });
});