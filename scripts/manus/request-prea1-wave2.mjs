/**
 * Pre-A1 stockpile wave 2 — TPR command action atoms.
 *   node scripts/manus/request-prea1-wave2.mjs --fire
 *   node scripts/manus/request-prea1-wave2.mjs --poll-only
 */
process.argv.push('--wave=2');
await import('./request-prea1-harvest.mjs');
