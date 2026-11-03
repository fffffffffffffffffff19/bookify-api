export interface ApiKeyRecord {
    id: string;
    scopes: string[];
    expiresAt: Date | null;
    revokedAt: Date | null;
}

export interface ApiKeysRepository {
    create(input: {
        name: string;
        keyHash: string;
        scopes: string[];
        createdBy: string;
        expiresAt?: Date;
    }): Promise<Omit<ApiKeyRecord, 'revokedAt'> & { name: string; createdAt: Date }>;
    findActiveByHash(keyHash: string, now: Date): Promise<ApiKeyRecord | null>;
    touch(id: string, now: Date): Promise<void>;
    revoke(id: string): Promise<boolean>;
}