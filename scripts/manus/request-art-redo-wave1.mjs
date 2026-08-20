/**
 * ART_REDO stockpile wave 1 from closed visual QA.
 *   node scripts/manus/request-art-redo-wave1.mjs --fire
 *   node scripts/manus/request-art-redo-wave1.mjs --poll-only
 */
process.argv.push('--wave=1');
await import('./request-art-redo-harvest.mjs');

