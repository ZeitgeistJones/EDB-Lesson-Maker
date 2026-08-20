/**
 * EDB setting drop — airport (batch 5).
 *   node scripts/manus/request-edb-settings-wave5-airport.mjs --fire
 *   node scripts/manus/request-edb-settings-wave5-airport.mjs --poll-only
 */
process.argv.push('--setting=airport');
await import('./request-edb-settings-harvest.mjs');
