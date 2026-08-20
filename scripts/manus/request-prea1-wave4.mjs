/**
 * Pre-A1 stockpile wave 4 — phonological-awareness toolkit.
 *   node scripts/manus/request-prea1-wave4.mjs --fire
 *   node scripts/manus/request-prea1-wave4.mjs --poll-only
 */
process.argv.push('--wave=4');
await import('./request-prea1-harvest.mjs');
