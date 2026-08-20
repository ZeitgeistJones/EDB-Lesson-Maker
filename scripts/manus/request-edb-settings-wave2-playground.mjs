/**
 * EDB setting drop — playground (batch 2).
 *   node scripts/manus/request-edb-settings-wave2-playground.mjs --fire
 *   node scripts/manus/request-edb-settings-wave2-playground.mjs --poll-only
 */
process.argv.push('--setting=playground');
await import('./request-edb-settings-harvest.mjs');
