/**
 * A1 stockpile P0.2 — question to answer visual system.
 *   node scripts/manus/request-a1-p0-wave2.mjs --fire
 *   node scripts/manus/request-a1-p0-wave2.mjs --poll-only
 */
process.argv.push('--wave=2');
await import('./request-a1-p0-harvest.mjs');

