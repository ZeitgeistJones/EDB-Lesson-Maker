/**
 * B2 vocab stockpile wave 3 — picturable verbs batch A (~99).
 *   node scripts/manus/request-b2-vocab-wave3.mjs --fire
 *   node scripts/manus/request-b2-vocab-wave3.mjs --poll-only
 */
process.argv.push('--wave=3');
await import('./request-b2-vocab-harvest.mjs');
