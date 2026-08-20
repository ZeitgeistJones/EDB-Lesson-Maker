/**
 * B2 vocab stockpile wave 10 — nouns batch H (slice 7).
 *   node scripts/manus/request-b2-vocab-wave10.mjs --fire
 *   node scripts/manus/request-b2-vocab-wave10.mjs --poll-only
 */
process.argv.push('--wave=10');
await import('./request-b2-vocab-harvest.mjs');
