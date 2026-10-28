export interface BusinessHours {
    allowedDays: number[];
    openHour: number;
    closeHour: number;
}

export const businessHoursConfig: BusinessHours = {
    // Allowed days of the week (0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday)
    allowedDays: [1, 2, 3, 4, 5], // Monday to Friday

    // Business hours (24-hour format)
    openHour: 8,  // 08:00
    closeHour: 18, // 18:00
};