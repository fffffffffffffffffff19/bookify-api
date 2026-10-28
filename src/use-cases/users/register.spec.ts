import { describe, beforeEach, it, expect } from 'vitest';
import { RegisterUseCase } from './register.js';
import { InMemoryUsersRepository } from '../../repositories/in-memory/in-memory-users-repository.js';
import { compare } from 'bcryptjs';

let usersRepository: InMemoryUsersRepository;
let sut: RegisterUseCase;

describe('Register Use Case', () => {
    beforeEach(() => {
        usersRepository = new InMemoryUsersRepository();
        sut = new RegisterUseCase(usersRepository);
    });

    it('should be able to register a new user', async () => {
        const { user } = await sut.execute({
            name: 'John Doe',
            email: 'johndoe@example.com',
            password: 'password-123',
        });

        expect(user.id).toEqual(expect.any(String));
        expect(user.name).toEqual('John Doe');
        expect(user.role).toEqual('CLIENT');
    });

    it('should always register public signups as clients despite extra runtime role data', async () => {
        const request = {
            name: 'Admin Attempt',
            email: 'admin-attempt@example.com',
            password: 'password-123',
            role: 'ADMIN',
        };

        const { user } = await sut.execute(request);

        expect(user.role).toEqual('CLIENT');
    });

    it('should hash user password upon registration', async () => {
        const { user } = await sut.execute({
            name: 'John Doe',
            email: 'johndoe@example.com',
            password: 'password-123',
        });

        const isPasswordSuccessfullyHashed = await compare(
            'password-123',
            user.passwordHash
        );

        expect(isPasswordSuccessfullyHashed).toBe(true);
    });

    it('should not be able to register with an existing email', async () => {
        const email = 'johndoe@example.com';

        await sut.execute({
            name: 'John Doe',
            email,
            password: 'password-123',
        });

        await expect(() =>
            sut.execute({
                name: 'Jane Doe',
                email,
                password: 'password-456',
            })
        ).rejects.toThrow('E-mail already exists.');
    });
});