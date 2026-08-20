/**
 * EDB setting drop — basketball court (batch 6).
 *   node scripts/manus/request-edb-settings-wave6-basketball-court.mjs --fire
 *   node scripts/manus/request-edb-settings-wave6-basketball-court.mjs --poll-only
 */
process.argv.push('--setting=basketball-court');
await import('./request-edb-settings-harvest.mjs');
