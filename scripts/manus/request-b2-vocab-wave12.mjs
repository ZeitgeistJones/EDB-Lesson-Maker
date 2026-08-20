/**
 * B2 vocab stockpile wave 12 — picturable verbs batch C (slice 2 remainder).
 *   node scripts/manus/request-b2-vocab-wave12.mjs --fire
 *   node scripts/manus/request-b2-vocab-wave12.mjs --poll-only
 */
process.argv.push('--wave=12');
await import('./request-b2-vocab-harvest.mjs');
