export interface StoreObjectInput {
    key: string;
    contentType: string;
    body: Buffer;
}

export interface StorageAdapter {
    store(input: StoreObjectInput): Promise<{ key: string; url: string }>;
    delete(key: string): Promise<void>;
}