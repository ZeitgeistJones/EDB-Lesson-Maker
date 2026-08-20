/**
 * EDB setting drop — bedroom (batch 1 interior).
 *   node scripts/manus/request-edb-settings-wave1-bedroom.mjs --fire
 *   node scripts/manus/request-edb-settings-wave1-bedroom.mjs --poll-only
 */
process.argv.push('--setting=bedroom');
await import('./request-edb-settings-harvest.mjs');
