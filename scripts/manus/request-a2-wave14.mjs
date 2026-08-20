/**
 * A2 stockpile P1.5 — short experience narrative relations.
 *   node scripts/manus/request-a2-wave14.mjs --fire
 *   node scripts/manus/request-a2-wave14.mjs --poll-only
 */
process.argv.push('--wave=14');
await import('./request-a2-p0-harvest.mjs');
