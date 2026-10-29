import { randomUUID } from 'node:crypto'
import { execSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function generateDatabaseURL(schema: string) {
    if (!process.env.DATABASE_URL) {
        throw new Error('Please provide a DATABASE_URL environment variable.')
    }

    const url = new URL(process.env.DATABASE_URL)

    url.searchParams.set('schema', schema)

    return url.toString()
}

export default {
    name: 'prisma',
    viteEnvironment: 'ssr' as const,
    async setup() {
        const schema = `test_${randomUUID()}`
        const databaseURL = generateDatabaseURL(schema)

        process.env.DATABASE_URL = databaseURL

        const prisma = new PrismaClient({
            adapter: new PrismaPg({ connectionString: databaseURL }, { schema }),
        })

        execSync('yarn prisma migrate deploy')

        return {
            async teardown() {
                await prisma.$executeRawUnsafe(
                    `DROP SCHEMA IF EXISTS "${schema}" CASCADE`,
                )

                await prisma.$disconnect()
            },
        }
    },
}