import { defineConfig } from 'vitest/config'

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
                    include: ['src/use-cases/**/*.spec.ts'],
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