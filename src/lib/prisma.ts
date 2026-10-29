import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const databaseURL = process.env.DATABASE_URL!;

export const prisma = new PrismaClient({
    adapter: new PrismaPg({
        connectionString: databaseURL,
    }, {
        schema: new URL(databaseURL).searchParams.get('schema') ?? 'public',
    }),
    log: ['query'],
});