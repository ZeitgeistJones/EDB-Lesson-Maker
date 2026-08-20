/**
 * EDB setting drop — zoo (batch 4).
 *   node scripts/manus/request-edb-settings-wave4-zoo.mjs --fire
 *   node scripts/manus/request-edb-settings-wave4-zoo.mjs --poll-only
 */
process.argv.push('--setting=zoo');
await import('./request-edb-settings-harvest.mjs');
