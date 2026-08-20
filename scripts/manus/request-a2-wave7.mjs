/**
 * A2 stockpile P0.7 — reading text-type skins.
 *   node scripts/manus/request-a2-wave7.mjs --fire
 *   node scripts/manus/request-a2-wave7.mjs --poll-only
 */
process.argv.push('--wave=7');
await import('./request-a2-p0-harvest.mjs');
