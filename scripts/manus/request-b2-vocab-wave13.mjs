/**
 * B2 vocab stockpile wave 13 — visual adjectives batch A.
 *   node scripts/manus/request-b2-vocab-wave13.mjs --fire
 *   node scripts/manus/request-b2-vocab-wave13.mjs --poll-only
 */
process.argv.push('--wave=13');
await import('./request-b2-vocab-harvest.mjs');
