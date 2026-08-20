/**
 * EDB setting drop — train platform (batch 5).
 *   node scripts/manus/request-edb-settings-wave5-train-platform.mjs --fire
 *   node scripts/manus/request-edb-settings-wave5-train-platform.mjs --poll-only
 */
process.argv.push('--setting=train-platform');
await import('./request-edb-settings-harvest.mjs');
