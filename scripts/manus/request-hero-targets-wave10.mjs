/**
 * Hero-target stockpile wave 10 (pipeline fill, no overlap with 1–9).
 *   node scripts/manus/request-hero-targets-wave10.mjs --fire
 *   node scripts/manus/request-hero-targets-wave10.mjs --poll-only
 */
process.argv.push('--wave=10');
await import('./request-hero-targets-harvest.mjs');
