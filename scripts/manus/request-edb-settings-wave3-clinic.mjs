/**
 * EDB setting drop — clinic (batch 3).
 *   node scripts/manus/request-edb-settings-wave3-clinic.mjs --fire
 *   node scripts/manus/request-edb-settings-wave3-clinic.mjs --poll-only
 */
process.argv.push('--setting=clinic');
await import('./request-edb-settings-harvest.mjs');
