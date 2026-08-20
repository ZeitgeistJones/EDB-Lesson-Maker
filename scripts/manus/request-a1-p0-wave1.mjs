/**
 * A1 stockpile P0.1 — sentence architecture kit.
 *   node scripts/manus/request-a1-p0-wave1.mjs --fire
 *   node scripts/manus/request-a1-p0-wave1.mjs --poll-only
 */
process.argv.push('--wave=1');
await import('./request-a1-p0-harvest.mjs');

