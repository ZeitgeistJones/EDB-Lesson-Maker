/**
 * B2 vocab stockpile wave 15 — visual adjectives batch C.
 *   node scripts/manus/request-b2-vocab-wave15.mjs --fire
 *   node scripts/manus/request-b2-vocab-wave15.mjs --poll-only
 */
process.argv.push('--wave=15');
await import('./request-b2-vocab-harvest.mjs');
