/**
 * B2 vocab stockpile wave 17 — visual adjectives batch E.
 *   node scripts/manus/request-b2-vocab-wave17.mjs --fire
 *   node scripts/manus/request-b2-vocab-wave17.mjs --poll-only
 */
process.argv.push('--wave=17');
await import('./request-b2-vocab-harvest.mjs');
