/**
 * EDB setting drop — shop (batch 3).
 *   node scripts/manus/request-edb-settings-wave3-shop.mjs --fire
 *   node scripts/manus/request-edb-settings-wave3-shop.mjs --poll-only
 */
process.argv.push('--setting=shop');
await import('./request-edb-settings-harvest.mjs');
