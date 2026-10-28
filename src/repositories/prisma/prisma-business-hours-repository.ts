import { businessHoursConfig, type BusinessHours } from '../../config/business-hours.js';
import { prisma } from '../../lib/prisma.js';
import type { BusinessHoursRepository } from '../business-hours-repository.js';

const SETTINGS_ID = 'global';

export class PrismaBusinessHoursRepository implements BusinessHoursRepository {
    async getCurrent(): Promise<BusinessHours> {
        const settings = await prisma.businessHoursSettings.findUnique({
            where: { id: SETTINGS_ID },
        });

        if (!settings) {
            return {
                ...businessHoursConfig,
                allowedDays: [...businessHoursConfig.allowedDays],
            };
        }

        return {
            allowedDays: settings.allowedDays,
            openHour: settings.openHour,
            closeHour: settings.closeHour,
        };
    }

    async save(settings: BusinessHours): Promise<BusinessHours> {
        const savedSettings = await prisma.businessHoursSettings.upsert({
            where: { id: SETTINGS_ID },
            create: { id: SETTINGS_ID, ...settings },
            update: settings,
        });

        return {
            allowedDays: savedSettings.allowedDays,
            openHour: savedSettings.openHour,
            closeHour: savedSettings.closeHour,
        };
    }
}