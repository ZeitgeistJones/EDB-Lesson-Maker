/**
 * Hero-target stockpile wave 11 (pipeline fill, no overlap with 1–10).
 *   node scripts/manus/request-hero-targets-wave11.mjs --fire
 *   node scripts/manus/request-hero-targets-wave11.mjs --poll-only
 */
process.argv.push('--wave=11');
await import('./request-hero-targets-harvest.mjs');
