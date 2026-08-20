/**
 * A2 stockpile P0.2 — event and state-change visuals.
 *   node scripts/manus/request-a2-wave2.mjs --fire
 *   node scripts/manus/request-a2-wave2.mjs --poll-only
 */
process.argv.push('--wave=2');
await import('./request-a2-p0-harvest.mjs');
