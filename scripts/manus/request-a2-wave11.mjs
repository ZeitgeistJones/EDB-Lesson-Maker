/**
 * A2 stockpile P1.2 — routine and frequency visuals.
 *   node scripts/manus/request-a2-wave11.mjs --fire
 *   node scripts/manus/request-a2-wave11.mjs --poll-only
 */
process.argv.push('--wave=11');
await import('./request-a2-p0-harvest.mjs');
