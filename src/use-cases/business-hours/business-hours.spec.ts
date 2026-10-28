import { beforeEach, describe, expect, it } from 'vitest';
import { businessHoursConfig } from '../../config/business-hours.js';
import { InMemoryBusinessHoursRepository } from '../../repositories/in-memory/in-memory-business-hours-repository.js';
import { FetchBusinessHoursUseCase } from './fetch-business-hours.js';
import { UpdateBusinessHoursUseCase } from './update-business-hours.js';

let repository: InMemoryBusinessHoursRepository;
let fetchUseCase: FetchBusinessHoursUseCase;
let updateUseCase: UpdateBusinessHoursUseCase;

describe('Business Hours Use Cases', () => {
    beforeEach(() => {
        repository = new InMemoryBusinessHoursRepository();
        fetchUseCase = new FetchBusinessHoursUseCase(repository);
        updateUseCase = new UpdateBusinessHoursUseCase(repository);
    });

    it('should return default settings when no changes have been saved', async () => {
        await expect(fetchUseCase.execute()).resolves.toEqual(businessHoursConfig);
    });

    it('should persist and return updated settings', async () => {
        const settings = { allowedDays: [0, 2, 4], openHour: 9, closeHour: 17 };

        await expect(updateUseCase.execute(settings)).resolves.toEqual(settings);
        await expect(fetchUseCase.execute()).resolves.toEqual(settings);
    });
});