/**
 * EDB setting drop — restaurant/cafe (batch 3).
 *   node scripts/manus/request-edb-settings-wave3-restaurant.mjs --fire
 *   node scripts/manus/request-edb-settings-wave3-restaurant.mjs --poll-only
 */
process.argv.push('--setting=restaurant');
await import('./request-edb-settings-harvest.mjs');
