/**
 * A2 stockpile P0.9 — linked writing and revision kit.
 *   node scripts/manus/request-a2-wave9.mjs --fire
 *   node scripts/manus/request-a2-wave9.mjs --poll-only
 */
process.argv.push('--wave=9');
await import('./request-a2-p0-harvest.mjs');
