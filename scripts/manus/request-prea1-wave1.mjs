/**
 * Pre-A1 stockpile wave 1 — universal instruction + feedback visuals.
 *   node scripts/manus/request-prea1-wave1.mjs --fire
 *   node scripts/manus/request-prea1-wave1.mjs --poll-only
 */
process.argv.push('--wave=1');
await import('./request-prea1-harvest.mjs');
