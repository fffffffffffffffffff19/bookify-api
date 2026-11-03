export interface RedisCacheClient {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, expiry: 'EX', ttlSeconds: number): Promise<unknown>;
    del(...keys: string[]): Promise<number>;
    scan(cursor: string, match: 'MATCH', pattern: string, count: 'COUNT', countValue: number): Promise<[string, string[]]>;
}

export class CacheService {
    constructor(
        private readonly client: RedisCacheClient,
        private readonly keyPrefix: string,
    ) { }

    async get<T>(key: string): Promise<T | null> {
        try {
            const value = await this.client.get(this.namespace(key));
            return value === null ? null : JSON.parse(value) as T;
        } catch {
            return null;
        }
    }

    async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
        try {
            await this.client.set(this.namespace(key), JSON.stringify(value), 'EX', ttlSeconds);
        } catch {
            // A cache write must never fail the underlying read request.
        }
    }

    async del(key: string): Promise<void> {
        try {
            await this.client.del(this.namespace(key));
        } catch {
            // Cache invalidation is best-effort; TTL remains the safety net.
        }
    }

    async delPattern(pattern: string): Promise<void> {
        try {
            let cursor = '0';
            const matchingKeys = new Set<string>();
            do {
                const [nextCursor, keys] = await this.client.scan(
                    cursor,
                    'MATCH',
                    this.namespace(pattern),
                    'COUNT',
                    100,
                );
                cursor = nextCursor;
                for (const key of keys) matchingKeys.add(key);
            } while (cursor !== '0');

            const keys = [...matchingKeys];
            for (let offset = 0; offset < keys.length; offset += 500) {
                await this.client.del(...keys.slice(offset, offset + 500));
            }
        } catch {
            // Cache invalidation is best-effort; TTL remains the safety net.
        }
    }

    async remember<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== null) return cached;

        const value = await load();
        await this.set(key, value, ttlSeconds);
        return value;
    }

    private namespace(key: string) {
        return `${this.keyPrefix}:${key}`;
    }
}