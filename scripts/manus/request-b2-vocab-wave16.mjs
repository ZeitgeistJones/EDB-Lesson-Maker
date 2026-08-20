/**
 * B2 vocab stockpile wave 16 — visual adjectives batch D.
 *   node scripts/manus/request-b2-vocab-wave16.mjs --fire
 *   node scripts/manus/request-b2-vocab-wave16.mjs --poll-only
 */
process.argv.push('--wave=16');
await import('./request-b2-vocab-harvest.mjs');
