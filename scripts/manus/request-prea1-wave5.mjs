/**
 * Pre-A1 stockpile wave 5 — pre-writing / motor system (no A–Z letters).
 *   node scripts/manus/request-prea1-wave5.mjs --fire
 *   node scripts/manus/request-prea1-wave5.mjs --poll-only
 */
process.argv.push('--wave=5');
await import('./request-prea1-harvest.mjs');
