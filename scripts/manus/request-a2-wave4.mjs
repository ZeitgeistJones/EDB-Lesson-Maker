/**
 * A2 stockpile P0.4 — comparison and simple reason icons.
 *   node scripts/manus/request-a2-wave4.mjs --fire
 *   node scripts/manus/request-a2-wave4.mjs --poll-only
 */
process.argv.push('--wave=4');
await import('./request-a2-p0-harvest.mjs');
