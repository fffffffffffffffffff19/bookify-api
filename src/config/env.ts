import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { z } from 'zod';

if (existsSync('.env')) {
    loadEnvFile();
}

const envSchema = z.object({
    NODE_ENV: z.enum(['dev', 'development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3333),
    DATABASE_URL: z.string().url().refine(
        (value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol),
        'DATABASE_URL must use the postgres or postgresql protocol.',
    ),
    JWT_SECRET: z.string().min(1),
}).superRefine((values, context) => {
    if (values.NODE_ENV === 'production' && values.JWT_SECRET.length < 32) {
        context.addIssue({
            code: 'custom',
            path: ['JWT_SECRET'],
            message: 'JWT_SECRET must be at least 32 characters in production.',
        });
    }
});

export const env = envSchema.parse(process.env);