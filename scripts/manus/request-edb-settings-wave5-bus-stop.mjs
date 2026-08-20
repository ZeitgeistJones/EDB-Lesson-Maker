/**
 * EDB setting drop — bus stop (batch 5).
 *   node scripts/manus/request-edb-settings-wave5-bus-stop.mjs --fire
 *   node scripts/manus/request-edb-settings-wave5-bus-stop.mjs --poll-only
 */
process.argv.push('--setting=bus-stop');
await import('./request-edb-settings-harvest.mjs');
