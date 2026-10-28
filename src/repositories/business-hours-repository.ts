import type { BusinessHours } from '../config/business-hours.js';

export interface BusinessHoursRepository {
    getCurrent(): Promise<BusinessHours>;
    save(settings: BusinessHours): Promise<BusinessHours>;
}