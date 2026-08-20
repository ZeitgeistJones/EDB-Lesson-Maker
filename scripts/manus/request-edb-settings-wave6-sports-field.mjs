/**
 * EDB setting drop — sports field (batch 6).
 *   node scripts/manus/request-edb-settings-wave6-sports-field.mjs --fire
 *   node scripts/manus/request-edb-settings-wave6-sports-field.mjs --poll-only
 */
process.argv.push('--setting=sports-field');
await import('./request-edb-settings-harvest.mjs');
