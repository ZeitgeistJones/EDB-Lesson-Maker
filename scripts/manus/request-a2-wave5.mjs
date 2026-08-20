/**
 * A2 stockpile P0.5 — route and map components.
 *   node scripts/manus/request-a2-wave5.mjs --fire
 *   node scripts/manus/request-a2-wave5.mjs --poll-only
 */
process.argv.push('--wave=5');
await import('./request-a2-p0-harvest.mjs');
