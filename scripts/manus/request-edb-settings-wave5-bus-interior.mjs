/**
 * EDB setting drop — bus interior (batch 5).
 *   node scripts/manus/request-edb-settings-wave5-bus-interior.mjs --fire
 *   node scripts/manus/request-edb-settings-wave5-bus-interior.mjs --poll-only
 */
process.argv.push('--setting=bus-interior');
await import('./request-edb-settings-harvest.mjs');
