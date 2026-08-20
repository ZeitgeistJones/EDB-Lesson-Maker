/**
 * EDB setting drop — street/town (batch 2).
 *   node scripts/manus/request-edb-settings-wave2-street-town.mjs --fire
 *   node scripts/manus/request-edb-settings-wave2-street-town.mjs --poll-only
 */
process.argv.push('--setting=street-town');
await import('./request-edb-settings-harvest.mjs');
