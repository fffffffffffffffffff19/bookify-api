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
    REDIS_URL: z.string().url().refine(
        (value) => ['redis:', 'rediss:'].includes(new URL(value).protocol),
        'REDIS_URL must use the redis or rediss protocol.',
    ).default('redis://localhost:6379'),
    UPLOAD_DIR: z.string().min(1).default('uploads'),
    JWT_SECRET: z.string().min(1),
    PAYMENT_PROVIDER: z.enum(['mock', 'stripe']).default('mock'),
    PAYMENT_CURRENCY: z.string().length(3).transform((value) => value.toLowerCase()).default('usd'),
    PAYMENT_SUCCESS_URL: z.string().url().default('http://localhost:3000/payment/success?session_id={CHECKOUT_SESSION_ID}'),
    PAYMENT_CANCEL_URL: z.string().url().default('http://localhost:3000/payment/cancel'),
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
}).superRefine((values, context) => {
    if (values.NODE_ENV === 'production' && values.JWT_SECRET.length < 32) {
        context.addIssue({
            code: 'custom',
            path: ['JWT_SECRET'],
            message: 'JWT_SECRET must be at least 32 characters in production.',
        });
    }
    if (values.NODE_ENV === 'production' && values.PAYMENT_PROVIDER !== 'stripe') {
        context.addIssue({
            code: 'custom',
            path: ['PAYMENT_PROVIDER'],
            message: 'PAYMENT_PROVIDER must be stripe in production.',
        });
    }
    if (values.NODE_ENV === 'production' && values.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
        context.addIssue({
            code: 'custom',
            path: ['STRIPE_SECRET_KEY'],
            message: 'A live Stripe secret key is required in production.',
        });
    }
    if (values.NODE_ENV === 'production' && [values.PAYMENT_SUCCESS_URL, values.PAYMENT_CANCEL_URL].some(
        (value) => ['localhost', '127.0.0.1'].includes(new URL(value).hostname),
    )) {
        context.addIssue({
            code: 'custom',
            path: ['PAYMENT_SUCCESS_URL'],
            message: 'Payment redirect URLs must use a public host in production.',
        });
    }
    if (values.PAYMENT_PROVIDER === 'stripe' && !values.STRIPE_SECRET_KEY) {
        context.addIssue({
            code: 'custom',
            path: ['STRIPE_SECRET_KEY'],
            message: 'STRIPE_SECRET_KEY is required when PAYMENT_PROVIDER is stripe.',
        });
    }
    if (values.PAYMENT_PROVIDER === 'stripe' && !values.STRIPE_WEBHOOK_SECRET) {
        context.addIssue({
            code: 'custom',
            path: ['STRIPE_WEBHOOK_SECRET'],
            message: 'STRIPE_WEBHOOK_SECRET is required when PAYMENT_PROVIDER is stripe.',
        });
    }
});

export const env = envSchema.parse(process.env);