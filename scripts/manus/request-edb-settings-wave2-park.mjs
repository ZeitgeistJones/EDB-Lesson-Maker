/**
 * EDB setting drop — park (batch 2).
 *   node scripts/manus/request-edb-settings-wave2-park.mjs --fire
 *   node scripts/manus/request-edb-settings-wave2-park.mjs --poll-only
 */
process.argv.push('--setting=park');
await import('./request-edb-settings-harvest.mjs');
