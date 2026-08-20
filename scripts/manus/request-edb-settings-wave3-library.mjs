/**
 * EDB setting drop — library (batch 3).
 *   node scripts/manus/request-edb-settings-wave3-library.mjs --fire
 *   node scripts/manus/request-edb-settings-wave3-library.mjs --poll-only
 */
process.argv.push('--setting=library');
await import('./request-edb-settings-harvest.mjs');
