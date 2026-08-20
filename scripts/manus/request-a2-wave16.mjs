/**
 * A2 stockpile P1.7 — transit and travel status.
 *   node scripts/manus/request-a2-wave16.mjs --fire
 *   node scripts/manus/request-a2-wave16.mjs --poll-only
 */
process.argv.push('--wave=16');
await import('./request-a2-p0-harvest.mjs');
