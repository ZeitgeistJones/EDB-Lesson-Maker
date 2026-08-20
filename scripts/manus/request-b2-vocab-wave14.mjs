/**
 * B2 vocab stockpile wave 14 — visual adjectives batch B.
 *   node scripts/manus/request-b2-vocab-wave14.mjs --fire
 *   node scripts/manus/request-b2-vocab-wave14.mjs --poll-only
 */
process.argv.push('--wave=14');
await import('./request-b2-vocab-harvest.mjs');
