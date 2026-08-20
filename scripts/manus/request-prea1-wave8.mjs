/**
 * Pre-A1 stockpile wave 8 — interaction surface shells.
 *   node scripts/manus/request-prea1-wave8.mjs --fire
 *   node scripts/manus/request-prea1-wave8.mjs --poll-only
 */
process.argv.push('--wave=8');
await import('./request-prea1-harvest.mjs');
