/**
 * EDB setting drop — living room (batch 2).
 *   node scripts/manus/request-edb-settings-wave2-living-room.mjs --fire
 *   node scripts/manus/request-edb-settings-wave2-living-room.mjs --poll-only
 */
process.argv.push('--setting=living-room');
await import('./request-edb-settings-harvest.mjs');
