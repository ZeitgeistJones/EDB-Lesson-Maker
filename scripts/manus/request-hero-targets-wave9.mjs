/**
 * Hero-target stockpile wave 9 (pipeline fill, no overlap with 1–8).
 *   node scripts/manus/request-hero-targets-wave9.mjs --fire
 *   node scripts/manus/request-hero-targets-wave9.mjs --poll-only
 */
process.argv.push('--wave=9');
await import('./request-hero-targets-harvest.mjs');
