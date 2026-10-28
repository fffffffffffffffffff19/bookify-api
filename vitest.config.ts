import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        globals: true,
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