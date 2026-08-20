/**
 * EDB setting drop — forest (batch 4).
 *   node scripts/manus/request-edb-settings-wave4-forest.mjs --fire
 *   node scripts/manus/request-edb-settings-wave4-forest.mjs --poll-only
 */
process.argv.push('--setting=forest');
await import('./request-edb-settings-harvest.mjs');
