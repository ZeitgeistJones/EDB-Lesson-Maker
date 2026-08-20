/**
 * Pre-A1 stockpile wave 7 — compact articulation kit.
 *   node scripts/manus/request-prea1-wave7.mjs --fire
 *   node scripts/manus/request-prea1-wave7.mjs --poll-only
 */
process.argv.push('--wave=7');
await import('./request-prea1-harvest.mjs');
