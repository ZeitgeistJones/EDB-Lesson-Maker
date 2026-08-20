/**
 * A2 stockpile P1.4 — multi-attribute evidence pins.
 *   node scripts/manus/request-a2-wave13.mjs --fire
 *   node scripts/manus/request-a2-wave13.mjs --poll-only
 */
process.argv.push('--wave=13');
await import('./request-a2-p0-harvest.mjs');
