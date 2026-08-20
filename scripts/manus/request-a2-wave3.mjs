/**
 * A2 stockpile P0.3 — information-gap private-info kit.
 *   node scripts/manus/request-a2-wave3.mjs --fire
 *   node scripts/manus/request-a2-wave3.mjs --poll-only
 */
process.argv.push('--wave=3');
await import('./request-a2-p0-harvest.mjs');
