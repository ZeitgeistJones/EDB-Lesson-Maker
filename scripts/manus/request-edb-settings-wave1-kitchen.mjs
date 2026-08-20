/**
 * EDB setting drop — kitchen (batch 1 interior).
 *   node scripts/manus/request-edb-settings-wave1-kitchen.mjs --fire
 *   node scripts/manus/request-edb-settings-wave1-kitchen.mjs --poll-only
 */
process.argv.push('--setting=kitchen');
await import('./request-edb-settings-harvest.mjs');
