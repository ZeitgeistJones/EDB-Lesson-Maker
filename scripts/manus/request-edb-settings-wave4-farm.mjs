/**
 * EDB setting drop — farm (batch 4).
 *   node scripts/manus/request-edb-settings-wave4-farm.mjs --fire
 *   node scripts/manus/request-edb-settings-wave4-farm.mjs --poll-only
 */
process.argv.push('--setting=farm');
await import('./request-edb-settings-harvest.mjs');
