/**
 * EDB setting drop — swimming pool (batch 6).
 *   node scripts/manus/request-edb-settings-wave6-swimming-pool.mjs --fire
 *   node scripts/manus/request-edb-settings-wave6-swimming-pool.mjs --poll-only
 */
process.argv.push('--setting=swimming-pool');
await import('./request-edb-settings-harvest.mjs');
