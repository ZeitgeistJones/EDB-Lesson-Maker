/**
 * B2 vocab stockpile wave 11 — nouns batch I (slice 8 remainder).
 *   node scripts/manus/request-b2-vocab-wave11.mjs --fire
 *   node scripts/manus/request-b2-vocab-wave11.mjs --poll-only
 */
process.argv.push('--wave=11');
await import('./request-b2-vocab-harvest.mjs');
