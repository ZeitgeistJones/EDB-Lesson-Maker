/**
 * B2 vocab stockpile wave 1 — nouns batch A (~99).
 *   node scripts/manus/request-b2-vocab-wave1.mjs --fire
 *   node scripts/manus/request-b2-vocab-wave1.mjs --poll-only
 */
process.argv.push('--wave=1');
await import('./request-b2-vocab-harvest.mjs');
