import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';

if (process.env.NODE_ENV === 'production') {
    throw new Error('Database seeding is disabled in production.');
}

const databaseURL = process.env.DATABASE_URL
    ?? 'postgresql://bookify_user:bookify_pass@localhost:5432/bookify_db?schema=public';

const prisma = new PrismaClient({
    adapter: new PrismaPg({
        connectionString: databaseURL,
    }, {
        schema: new URL(databaseURL).searchParams.get('schema') ?? 'public',
    }),
});

const seededUsers = [
    {
        name: 'Local Admin',
        email: process.env.SEED_ADMIN_EMAIL ?? 'admin@bookify.local',
        password: process.env.SEED_ADMIN_PASSWORD ?? 'local-test-password',
        role: 'ADMIN' as const,
    },
    {
        name: 'Local Provider',
        email: process.env.SEED_PROVIDER_EMAIL ?? 'provider@bookify.local',
        password: process.env.SEED_PROVIDER_PASSWORD ?? 'local-test-password',
        role: 'PROVIDER' as const,
    },
    {
        name: 'Local Client',
        email: process.env.SEED_CLIENT_EMAIL ?? 'client@bookify.local',
        password: process.env.SEED_CLIENT_PASSWORD ?? 'local-test-password',
        role: 'CLIENT' as const,
    },
];

try {
    for (const user of seededUsers) {
        const passwordHash = await hash(user.password, 10);

        await prisma.user.upsert({
            where: { email: user.email },
            create: {
                name: user.name,
                email: user.email,
                passwordHash,
                role: user.role,
            },
            update: {
                name: user.name,
                passwordHash,
                role: user.role,
            },
        });
    }

    console.info(`Seeded ${seededUsers.length} local users.`);
} finally {
    await prisma.$disconnect();
}