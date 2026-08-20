/**
 * A2 stockpile P1.6 — process and procedure visuals.
 *   node scripts/manus/request-a2-wave15.mjs --fire
 *   node scripts/manus/request-a2-wave15.mjs --poll-only
 */
process.argv.push('--wave=15');
await import('./request-a2-p0-harvest.mjs');
