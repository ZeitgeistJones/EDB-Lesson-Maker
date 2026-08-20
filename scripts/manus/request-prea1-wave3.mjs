/**
 * Pre-A1 stockpile wave 3 — concept / relationship systems.
 *   node scripts/manus/request-prea1-wave3.mjs --fire
 *   node scripts/manus/request-prea1-wave3.mjs --poll-only
 */
process.argv.push('--wave=3');
await import('./request-prea1-harvest.mjs');
