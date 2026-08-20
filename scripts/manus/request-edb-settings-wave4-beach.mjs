/**
 * EDB setting drop — beach (batch 4).
 *   node scripts/manus/request-edb-settings-wave4-beach.mjs --fire
 *   node scripts/manus/request-edb-settings-wave4-beach.mjs --poll-only
 */
process.argv.push('--setting=beach');
await import('./request-edb-settings-harvest.mjs');
