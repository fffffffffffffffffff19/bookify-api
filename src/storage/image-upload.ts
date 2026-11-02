import { z } from 'zod';
import { BusinessRuleError } from '../errors/application-error.js';

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const imageMetadataSchema = z.object({
    mimetype: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    size: z.number().int().positive().max(MAX_IMAGE_SIZE_BYTES),
});

const extensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
} as const;

function detectImageMimeType(body: Buffer): string | undefined {
    if (body.length >= 8 && body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
        return 'image/png';
    }
    if (body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) {
        return 'image/jpeg';
    }
    if (
        body.length >= 12 &&
        body.toString('ascii', 0, 4) === 'RIFF' &&
        body.toString('ascii', 8, 12) === 'WEBP'
    ) {
        return 'image/webp';
    }
    return undefined;
}

export function validateImageUpload(mimetype: string, body: Buffer): string {
    const metadata = imageMetadataSchema.parse({ mimetype, size: body.length });
    if (detectImageMimeType(body) !== metadata.mimetype) {
        throw new BusinessRuleError('The file contents do not match an allowed image type.', 'INVALID_FILE_TYPE');
    }
    return extensions[metadata.mimetype];
}