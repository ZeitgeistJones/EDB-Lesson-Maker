/**
 * B2 vocab stockpile wave 6 — nouns batch D (slice 3, ~99).
 *   node scripts/manus/request-b2-vocab-wave6.mjs --fire
 *   node scripts/manus/request-b2-vocab-wave6.mjs --poll-only
 */
process.argv.push('--wave=6');
await import('./request-b2-vocab-harvest.mjs');
