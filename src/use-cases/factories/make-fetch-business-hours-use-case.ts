import { PrismaBusinessHoursRepository } from '../../repositories/prisma/prisma-business-hours-repository.js';
import { FetchBusinessHoursUseCase } from '../business-hours/fetch-business-hours.js';

export function makeFetchBusinessHoursUseCase() {
    return new FetchBusinessHoursUseCase(new PrismaBusinessHoursRepository());
}