import type { BusinessHours } from '../../config/business-hours.js';
import type { BusinessHoursRepository } from '../../repositories/business-hours-repository.js';

export class FetchBusinessHoursUseCase {
    constructor(private businessHoursRepository: BusinessHoursRepository) { }

    async execute(): Promise<BusinessHours> {
        return this.businessHoursRepository.getCurrent();
    }
}