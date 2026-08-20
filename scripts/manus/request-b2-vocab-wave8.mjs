/**
 * B2 vocab stockpile wave 8 — nouns batch F (slice 5).
 *   node scripts/manus/request-b2-vocab-wave8.mjs --fire
 *   node scripts/manus/request-b2-vocab-wave8.mjs --poll-only
 */
process.argv.push('--wave=8');
await import('./request-b2-vocab-harvest.mjs');
