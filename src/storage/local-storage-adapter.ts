import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { StorageAdapter, StoreObjectInput } from './storage-adapter.js';

export class LocalStorageAdapter implements StorageAdapter {
    private readonly rootDirectory: string;

    constructor(rootDirectory: string, private readonly publicPrefix = '/uploads') {
        this.rootDirectory = path.resolve(rootDirectory);
    }

    async store({ key, body }: StoreObjectInput): Promise<{ key: string; url: string }> {
        const destination = this.resolveKey(key);
        await mkdir(path.dirname(destination), { recursive: true });
        await writeFile(destination, body, { flag: 'wx' });

        return {
            key,
            url: `${this.publicPrefix}/${key.split(path.sep).map(encodeURIComponent).join('/')}`,
        };
    }

    async delete(key: string): Promise<void> {
        await unlink(this.resolveKey(key));
    }

    private resolveKey(key: string): string {
        const destination = path.resolve(this.rootDirectory, key);
        if (!destination.startsWith(`${this.rootDirectory}${path.sep}`)) {
            throw new Error('Storage key must remain inside the configured root directory.');
        }
        return destination;
    }
}