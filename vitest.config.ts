import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'
import { defineConfig } from 'vitest/config'

if (existsSync('.env')) {
    loadEnvFile()
}

export default defineConfig({
    resolve: {
        tsconfigPaths: true,
    },
    test: {
        globals: true,
        setupFiles: ['./src/test/setup.ts'],
        projects: [
            {
                test: {
                    name: 'unit',
                    include: ['src/use-cases/**/*.spec.ts', 'src/storage/**/*.spec.ts', 'src/cache/**/*.spec.ts'],
                },
            },
            {
                test: {
                    name: 'e2e',
                    include: ['src/http/controllers/**/*.spec.ts'],
                    environment: 'prisma',
                },
            },
        ],
    },
})