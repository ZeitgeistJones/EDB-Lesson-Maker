/**
 * B2 vocab stockpile wave 4 — nouns batch C (~99).
 *   node scripts/manus/request-b2-vocab-wave4.mjs --fire
 *   node scripts/manus/request-b2-vocab-wave4.mjs --poll-only
 */
process.argv.push('--wave=4');
await import('./request-b2-vocab-harvest.mjs');
