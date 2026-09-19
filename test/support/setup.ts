/*
 * Property-based tests run from a fixed seed so every run, local or CI, checks the same cases
 * (ADR-0009). To explore new cases, run with a different seed: `FAST_CHECK_SEED=123 npm test`;
 * a failure prints its seed and path, and the fixed seed can be moved when the suite is widened.
 */
import fc from 'fast-check';

const DEFAULT_SEED = 20_260_916;

fc.configureGlobal({ seed: Number(process.env.FAST_CHECK_SEED ?? DEFAULT_SEED) });
