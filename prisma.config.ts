import { defineConfig } from 'prisma/config'

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
    },
    datasource: {
        url: process.env.DATABASE_URL ?? 'postgresql://bookify_user:bookify_pass@localhost:5432/bookify_db?schema=public',
    },
})