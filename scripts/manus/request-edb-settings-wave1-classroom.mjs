/**
 * EDB setting drop — classroom (batch 1 interior).
 *   node scripts/manus/request-edb-settings-wave1-classroom.mjs --fire
 *   node scripts/manus/request-edb-settings-wave1-classroom.mjs --poll-only
 */
process.argv.push('--setting=classroom');
await import('./request-edb-settings-harvest.mjs');
