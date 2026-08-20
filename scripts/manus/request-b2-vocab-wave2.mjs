/**
 * B2 vocab stockpile wave 2 — nouns batch B (~99).
 *   node scripts/manus/request-b2-vocab-wave2.mjs --fire
 *   node scripts/manus/request-b2-vocab-wave2.mjs --poll-only
 */
process.argv.push('--wave=2');
await import('./request-b2-vocab-harvest.mjs');
