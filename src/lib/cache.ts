import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { CacheService } from '../cache/cache-service.js';

export function createRedisClient() {
    return new Redis(env.REDIS_URL, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 750,
        commandTimeout: 750,
        retryStrategy: (attempt: number) => Math.min(attempt * 250, 1000),
    });
}

const redisClient = createRedisClient();

redisClient.on('error', () => { });

export const cache = new CacheService(redisClient, env.CACHE_KEY_PREFIX);

export const serviceCatalogCacheKey = 'service-catalog:v1';

export function serviceAvailabilityCacheKey(serviceId: string, date: string) {
    return `service-availability:v1:${serviceId}:${date}`;
}

function localDateKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export async function invalidateServiceCatalog() {
    await cache.del(serviceCatalogCacheKey);
}

export async function invalidateServiceAvailability(serviceId: string, date?: string) {
    if (date) {
        await cache.del(serviceAvailabilityCacheKey(serviceId, date));
        return;
    }
    await cache.delPattern(`service-availability:v1:${serviceId}:*`);
}

export async function invalidateAllServiceAvailability() {
    await cache.delPattern('service-availability:v1:*');
}

export async function invalidateServiceCaches(serviceId: string) {
    await Promise.all([
        invalidateServiceCatalog(),
        invalidateServiceAvailability(serviceId),
    ]);
}

export async function invalidateAppointmentAvailability(serviceId: string, startTime: Date) {
    await invalidateServiceAvailability(serviceId, localDateKey(startTime));
}

export function closeCacheConnection() {
    redisClient.disconnect();
}