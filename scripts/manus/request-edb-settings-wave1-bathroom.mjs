/**
 * EDB setting drop — bathroom (batch 1 interior).
 *   node scripts/manus/request-edb-settings-wave1-bathroom.mjs --fire
 *   node scripts/manus/request-edb-settings-wave1-bathroom.mjs --poll-only
 */
process.argv.push('--setting=bathroom');
await import('./request-edb-settings-harvest.mjs');
