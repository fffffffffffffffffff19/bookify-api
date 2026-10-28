import type { BusinessHours } from '../../config/business-hours.js';
import type { BusinessHoursRepository } from '../../repositories/business-hours-repository.js';

export class UpdateBusinessHoursUseCase {
    constructor(private businessHoursRepository: BusinessHoursRepository) { }

    async execute(settings: BusinessHours): Promise<BusinessHours> {
        return this.businessHoursRepository.save(settings);
    }
}