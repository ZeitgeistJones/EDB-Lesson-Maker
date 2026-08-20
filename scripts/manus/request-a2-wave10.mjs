/**
 * A2 stockpile P1.1 — plans and arrangements states.
 *   node scripts/manus/request-a2-wave10.mjs --fire
 *   node scripts/manus/request-a2-wave10.mjs --poll-only
 */
process.argv.push('--wave=10');
await import('./request-a2-p0-harvest.mjs');
