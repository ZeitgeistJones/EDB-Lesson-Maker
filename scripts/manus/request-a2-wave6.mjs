/**
 * A2 stockpile P0.6 — transaction role and state kit.
 *   node scripts/manus/request-a2-wave6.mjs --fire
 *   node scripts/manus/request-a2-wave6.mjs --poll-only
 */
process.argv.push('--wave=6');
await import('./request-a2-p0-harvest.mjs');
