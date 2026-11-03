import { describe, expect, it, vi } from 'vitest';
import { CacheService, type RedisCacheClient } from './cache-service.js';

function createClient(): RedisCacheClient & { values: Map<string, string> } {
    const values = new Map<string, string>();
    return {
        values,
        get: vi.fn(async (key) => values.get(key) ?? null),
        set: vi.fn(async (key, value) => {
            values.set(key, value);
            return 'OK';
        }),
        del: vi.fn(async (...keys) => keys.reduce((deleted, key) => deleted + Number(values.delete(key)), 0)),
        scan: vi.fn(async (cursor: string, _match: 'MATCH', pattern: string, _count: 'COUNT', countValue: number) => {
            const matching = [...values.keys()].filter((key) => {
                const regex = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*')}$`);
                return regex.test(key);
            });
            const offset = Number(cursor);
            const selected = matching.slice(offset, offset + countValue);
            const nextCursor = offset + countValue < matching.length ? String(offset + countValue) : '0';
            return [nextCursor, selected] as [string, string[]];
        }),
    };
}

describe('CacheService', () => {
    it('namespaces keys and applies the configured TTL', async () => {
        const client = createClient();
        const cache = new CacheService(client, 'bookify-test');

        await cache.set('catalog', { items: ['one'] }, 45);
        const value = await cache.get<{ items: string[] }>('catalog');

        expect(client.set).toHaveBeenCalledWith('bookify-test:catalog', '{"items":["one"]}', 'EX', 45);
        expect(value).toEqual({ items: ['one'] });
    });

    it('falls back to the loader when Redis reads fail and ignores write failures', async () => {
        const client = createClient();
        vi.mocked(client.get).mockRejectedValueOnce(new Error('Redis unavailable'));
        vi.mocked(client.set).mockRejectedValueOnce(new Error('Redis unavailable'));
        const load = vi.fn(async () => ({ services: ['from-db'] }));
        const cache = new CacheService(client, 'bookify-test');

        await expect(cache.remember('catalog', 30, load)).resolves.toEqual({ services: ['from-db'] });
        expect(load).toHaveBeenCalledOnce();
    });

    it('invalidates matching namespaced keys with SCAN rather than blocking key lookup', async () => {
        const client = createClient();
        const cache = new CacheService(client, 'bookify-test');
        await cache.set('availability:service-a:2026-11-02', ['10:00'], 30);
        await cache.set('availability:service-a:2026-11-03', ['10:00'], 30);
        await cache.set('availability:service-b:2026-11-02', ['11:00'], 30);

        await cache.delPattern('availability:service-a:*');

        expect(client.values.has('bookify-test:availability:service-a:2026-11-02')).toBe(false);
        expect(client.values.has('bookify-test:availability:service-a:2026-11-03')).toBe(false);
        expect(client.values.has('bookify-test:availability:service-b:2026-11-02')).toBe(true);
    });
});