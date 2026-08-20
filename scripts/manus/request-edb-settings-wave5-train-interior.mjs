/**
 * EDB setting drop — train interior (batch 5).
 *   node scripts/manus/request-edb-settings-wave5-train-interior.mjs --fire
 *   node scripts/manus/request-edb-settings-wave5-train-interior.mjs --poll-only
 */
process.argv.push('--setting=train-interior');
await import('./request-edb-settings-harvest.mjs');
