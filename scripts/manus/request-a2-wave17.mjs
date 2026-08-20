/**
 * A2 stockpile P1.8 — pronunciation and prosody overlays.
 *   node scripts/manus/request-a2-wave17.mjs --fire
 *   node scripts/manus/request-a2-wave17.mjs --poll-only
 */
process.argv.push('--wave=17');
await import('./request-a2-p0-harvest.mjs');
