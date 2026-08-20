/**
 * B2 vocab stockpile wave 18 — visual adjectives batch F (remainder).
 *   node scripts/manus/request-b2-vocab-wave18.mjs --fire
 *   node scripts/manus/request-b2-vocab-wave18.mjs --poll-only
 */
process.argv.push('--wave=18');
await import('./request-b2-vocab-harvest.mjs');
