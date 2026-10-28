import { PrismaBusinessHoursRepository } from '../../repositories/prisma/prisma-business-hours-repository.js';
import { UpdateBusinessHoursUseCase } from '../business-hours/update-business-hours.js';

export function makeUpdateBusinessHoursUseCase() {
    return new UpdateBusinessHoursUseCase(new PrismaBusinessHoursRepository());
}