import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['test/**/*.test.ts'],
        typecheck: {
            enabled: true,
            include: ['test/**/*.test-d.ts'],
        },
        coverage: {
            provider: 'v8',
            include: ['src/**'],
            reporter: ['text', 'lcov'],
            thresholds: {
                statements: 95,
                branches: 95,
                functions: 95,
                lines: 95,
            },
        },
    },
});
