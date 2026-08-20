/**
 * SOURCE_CORRUPT stockpile replacements from closed visual QA.
 *   node scripts/manus/request-source-corrupt-replacements.mjs --fire
 *   node scripts/manus/request-source-corrupt-replacements.mjs --poll-only
 */
process.argv.push('--source-corrupt');
await import('./request-art-redo-harvest.mjs');

