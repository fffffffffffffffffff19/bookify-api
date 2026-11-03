import { app } from '../../app.js';
import { cache, serviceAvailabilityCacheKey } from '../../lib/cache.js';
import { PrismaAppointmentsRepository } from '../../repositories/prisma/prisma-appointments-repository.js';
import { PrismaServicesRepository } from '../../repositories/prisma/prisma-services-repository.js';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { provisionAndAuthenticate } from '../../test/e2e/provision-user.js';

const cacheEntries = new Map<string, unknown>();

function mockCacheBackend() {
    cacheEntries.clear();
    vi.spyOn(cache, 'get').mockImplementation(async <T>(key: string) => {
        return (cacheEntries.get(key) as T | undefined) ?? null;
    });
    vi.spyOn(cache, 'set').mockImplementation(async (key, value) => {
        cacheEntries.set(key, value);
    });
    vi.spyOn(cache, 'del').mockImplementation(async (key) => {
        cacheEntries.delete(key);
    });
    vi.spyOn(cache, 'delPattern').mockImplementation(async (pattern) => {
        const expression = new RegExp(`^${pattern.replaceAll('*', '.*')}$`);
        for (const key of cacheEntries.keys()) {
            if (expression.test(key)) cacheEntries.delete(key);
        }
    });
}

function nextWeekdayAtEight() {
    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 2);
    while (startTime.getDay() === 0 || startTime.getDay() === 6) {
        startTime.setDate(startTime.getDate() + 1);
    }
    startTime.setHours(8, 0, 0, 0);
    return startTime;
}

function dateKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

describe('Redis caching (E2E)', () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        mockCacheBackend();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        cacheEntries.clear();
    });

    it('caches the public catalog and invalidates it after service create, update, and delete', async () => {
        const provider = await provisionAndAuthenticate(app, 'PROVIDER');
        const catalogReads = vi.spyOn(PrismaServicesRepository.prototype, 'findPublicCatalog');

        await request(app.server).get('/services/public');
        await request(app.server).get('/services/public');
        expect(catalogReads).toHaveBeenCalledTimes(1);

        const created = await request(app.server)
            .post('/services')
            .set('Authorization', `Bearer ${provider.token}`)
            .send({ title: 'Cached Service', price: 20, durationInMinutes: 30 });
        const serviceId = created.body.data.service.id as string;

        const afterCreate = await request(app.server).get('/services/public');
        expect(afterCreate.body.data.services.some((service: { id: string }) => service.id === serviceId)).toBe(true);
        expect(catalogReads).toHaveBeenCalledTimes(2);

        await request(app.server)
            .put(`/services/${serviceId}`)
            .set('Authorization', `Bearer ${provider.token}`)
            .send({ title: 'Updated Cached Service' });
        const afterUpdate = await request(app.server).get('/services/public');
        expect(afterUpdate.body.data.services.some((service: { title: string }) => service.title === 'Updated Cached Service')).toBe(true);
        expect(catalogReads).toHaveBeenCalledTimes(3);

        const deleted = await request(app.server)
            .delete(`/services/${serviceId}`)
            .set('Authorization', `Bearer ${provider.token}`);
        expect(deleted.status).toEqual(204);
        const afterDelete = await request(app.server).get('/services/public');
        expect(afterDelete.body.data.services.some((service: { id: string }) => service.id === serviceId)).toBe(false);
        expect(catalogReads).toHaveBeenCalledTimes(4);
    });

    it('caches availability and evicts the affected date after an appointment is booked', async () => {
        const provider = await provisionAndAuthenticate(app, 'PROVIDER');
        const client = await provisionAndAuthenticate(app, 'CLIENT');
        const serviceResponse = await request(app.server)
            .post('/services')
            .set('Authorization', `Bearer ${provider.token}`)
            .send({ title: 'Availability Cache Service', price: 25, durationInMinutes: 30 });
        const serviceId = serviceResponse.body.data.service.id as string;
        const startTime = nextWeekdayAtEight();
        const date = dateKey(startTime);
        const key = serviceAvailabilityCacheKey(serviceId, date);
        const availabilityReads = vi.spyOn(
            PrismaAppointmentsRepository.prototype,
            'findManyByProviderIdAndDateRange',
        );

        const firstRead = await request(app.server).get(`/services/${serviceId}/availability`).query({ date });
        const cachedRead = await request(app.server).get(`/services/${serviceId}/availability`).query({ date });
        expect(firstRead.body.data.availableSlots).toContain('08:00');
        expect(cachedRead.body.data).toEqual(firstRead.body.data);
        expect(availabilityReads).toHaveBeenCalledOnce();
        expect(cacheEntries.has(key)).toBe(true);

        const booking = await request(app.server)
            .post('/appointments')
            .set('Authorization', `Bearer ${client.token}`)
            .send({ serviceId, startTime: startTime.toISOString() });
        expect(booking.status).toEqual(201);
        expect(cacheEntries.has(key)).toBe(false);

        const afterBooking = await request(app.server).get(`/services/${serviceId}/availability`).query({ date });
        expect(afterBooking.body.data.availableSlots).not.toContain('08:00');
        expect(availabilityReads).toHaveBeenCalledTimes(2);
    });
});