import { businessHoursConfig, type BusinessHours } from '../../config/business-hours.js';
import type { BusinessHoursRepository } from '../business-hours-repository.js';

function copy(settings: BusinessHours): BusinessHours {
    return { ...settings, allowedDays: [...settings.allowedDays] };
}

export class InMemoryBusinessHoursRepository implements BusinessHoursRepository {
    private settings = copy(businessHoursConfig);

    async getCurrent(): Promise<BusinessHours> {
        return copy(this.settings);
    }

    async save(settings: BusinessHours): Promise<BusinessHours> {
        this.settings = copy(settings);
        return copy(this.settings);
    }
}