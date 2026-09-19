import { defineConfig } from 'vitest/config';

// Vitest changes behavior when it detects CI. Both switches are pinned here so a run gives the
// same result locally and in CI (ADR-0009): a missing snapshot is a failure everywhere (write
// snapshots deliberately with `vitest -u`), and `.only` is refused everywhere.
process.env.UPDATE_SNAPSHOT ??= 'none';

export default defineConfig({
    test: {
        include: ['test/**/*.test.ts'],
        allowOnly: false,
        setupFiles: ['test/support/setup.ts'],
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
