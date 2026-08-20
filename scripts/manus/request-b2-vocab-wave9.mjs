/**
 * B2 vocab stockpile wave 9 — nouns batch G (slice 6).
 *   node scripts/manus/request-b2-vocab-wave9.mjs --fire
 *   node scripts/manus/request-b2-vocab-wave9.mjs --poll-only
 */
process.argv.push('--wave=9');
await import('./request-b2-vocab-harvest.mjs');
