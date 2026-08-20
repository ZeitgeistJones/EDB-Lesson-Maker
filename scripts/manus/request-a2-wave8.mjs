/**
 * A2 stockpile P0.8 — multi-detail listening markers.
 *   node scripts/manus/request-a2-wave8.mjs --fire
 *   node scripts/manus/request-a2-wave8.mjs --poll-only
 */
process.argv.push('--wave=8');
await import('./request-a2-p0-harvest.mjs');
