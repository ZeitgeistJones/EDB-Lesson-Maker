/**
 * B2 vocab stockpile wave 5 — picturable verbs batch B (verbs 100–198).
 *   node scripts/manus/request-b2-vocab-wave5.mjs --fire
 *   node scripts/manus/request-b2-vocab-wave5.mjs --poll-only
 */
process.argv.push('--wave=5');
await import('./request-b2-vocab-harvest.mjs');
