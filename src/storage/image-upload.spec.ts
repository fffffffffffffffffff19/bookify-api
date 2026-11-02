import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalStorageAdapter } from './local-storage-adapter.js';
import { MAX_IMAGE_SIZE_BYTES, validateImageUpload } from './image-upload.js';

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);

describe('image upload validation', () => {
    it('accepts supported image signatures and returns safe extensions', () => {
        expect(validateImageUpload('image/png', png)).toBe('png');
        expect(validateImageUpload('image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toBe('jpg');
        expect(validateImageUpload('image/webp', Buffer.from('RIFF0000WEBP', 'ascii'))).toBe('webp');
    });

    it('rejects unsupported MIME types and mismatched file contents', () => {
        expect(() => validateImageUpload('text/plain', png)).toThrow();
        expect(() => validateImageUpload('image/jpeg', png)).toThrow(/contents do not match/);
    });

    it('rejects files larger than the configured maximum', () => {
        expect(() => validateImageUpload('image/png', Buffer.alloc(MAX_IMAGE_SIZE_BYTES + 1))).toThrow();
    });
});

describe('LocalStorageAdapter', () => {
    let rootDirectory: string;

    afterEach(async () => {
        if (rootDirectory) {
            await rm(rootDirectory, { recursive: true, force: true });
        }
    });

    it('stores and deletes an object under its root and returns its public URL', async () => {
        rootDirectory = await mkdtemp(path.join(tmpdir(), 'bookify-storage-'));
        const storage = new LocalStorageAdapter(rootDirectory);
        const stored = await storage.store({
            key: 'avatars/user-1/avatar.png',
            contentType: 'image/png',
            body: png,
        });

        expect(stored.url).toBe('/uploads/avatars/user-1/avatar.png');
        expect(await readFile(path.join(rootDirectory, stored.key))).toEqual(png);

        await storage.delete(stored.key);
        await expect(readFile(path.join(rootDirectory, stored.key))).rejects.toThrow();
    });

    it('rejects keys that escape the storage root', async () => {
        rootDirectory = await mkdtemp(path.join(tmpdir(), 'bookify-storage-'));
        const storage = new LocalStorageAdapter(rootDirectory);
        await expect(storage.store({ key: '../outside.png', contentType: 'image/png', body: png })).rejects.toThrow();
    });
});