/*
 * Property-based tests run from a fixed seed so every run, local or CI, checks the same cases
 * (ADR-0009). To explore new cases, run with a different seed: `FAST_CHECK_SEED=123 npm test`;
 * a failure prints its seed and path, and the fixed seed can be moved when the suite is widened.
 */
import fc from 'fast-check';

const DEFAULT_SEED = 20_260_916;

// An unset or empty FAST_CHECK_SEED means the default seed (an empty string would otherwise be 0).
const requested = process.env.FAST_CHECK_SEED;
fc.configureGlobal({
    seed: requested === undefined || requested.trim() === '' ? DEFAULT_SEED : Number(requested),
});
