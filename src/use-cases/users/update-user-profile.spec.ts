import { beforeEach, describe, expect, it } from 'vitest';
import { compare, hash } from 'bcryptjs';
import { InMemoryUsersRepository } from '../../repositories/in-memory/in-memory-users-repository.js';
import { InvalidCredentialsError, ResourceConflictError } from '../../errors/application-error.js';
import { UpdateUserProfileUseCase } from './update-user-profile.js';

let usersRepository: InMemoryUsersRepository;
let sut: UpdateUserProfileUseCase;
let userId: string;

describe('Update User Profile Use Case', () => {
    beforeEach(async () => {
        usersRepository = new InMemoryUsersRepository();
        sut = new UpdateUserProfileUseCase(usersRepository);
        const user = await usersRepository.create({
            name: 'Current Name',
            email: 'current@example.com',
            passwordHash: await hash('old-password', 6),
        });
        userId = user.id;
    });

    it('updates the name', async () => {
        const { user } = await sut.execute({ userId, name: 'Updated Name' });
        expect(user.name).toBe('Updated Name');
    });

    it('updates the email when it is available', async () => {
        const { user } = await sut.execute({ userId, email: 'new@example.com' });
        expect(user.email).toBe('new@example.com');
    });

    it('rejects an email already used by another user', async () => {
        await usersRepository.create({
            id: 'user-2',
            name: 'Other User',
            email: 'taken@example.com',
            passwordHash: 'hash',
        });

        await expect(sut.execute({ userId, email: 'taken@example.com' }))
            .rejects.toBeInstanceOf(ResourceConflictError);
    });

    it('changes the password after verifying the old password', async () => {
        const { user } = await sut.execute({
            userId,
            oldPassword: 'old-password',
            newPassword: 'new-password',
        });

        expect(await compare('new-password', user.passwordHash)).toBe(true);
        expect(await compare('old-password', user.passwordHash)).toBe(false);
    });

    it('rejects an incorrect old password', async () => {
        await expect(sut.execute({
            userId,
            oldPassword: 'wrong-password',
            newPassword: 'new-password',
        })).rejects.toBeInstanceOf(InvalidCredentialsError);
    });

    it('rejects a password change when the old password is missing', async () => {
        await expect(sut.execute({
            userId,
            newPassword: 'new-password',
        })).rejects.toBeInstanceOf(InvalidCredentialsError);
    });
});