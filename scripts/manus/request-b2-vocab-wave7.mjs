/**
 * B2 vocab stockpile wave 7 — nouns batch E (slice 4).
 *   node scripts/manus/request-b2-vocab-wave7.mjs --fire
 *   node scripts/manus/request-b2-vocab-wave7.mjs --poll-only
 */
process.argv.push('--wave=7');
await import('./request-b2-vocab-harvest.mjs');
