/**
 * Hero-target stockpile wave 14 (pipeline fill, no overlap with 1–13).
 *   node scripts/manus/request-hero-targets-wave14.mjs --fire
 *   node scripts/manus/request-hero-targets-wave14.mjs --poll-only
 */
process.argv.push('--wave=14');
await import('./request-hero-targets-harvest.mjs');
