/**
 * A2 stockpile P0.1 — connector linked-meaning metaphors.
 *   node scripts/manus/request-a2-wave1.mjs --fire
 *   node scripts/manus/request-a2-wave1.mjs --poll-only
 */
process.argv.push('--wave=1');
await import('./request-a2-p0-harvest.mjs');
