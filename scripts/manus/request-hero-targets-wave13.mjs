/**
 * Hero-target stockpile wave 13 (pipeline fill, no overlap with 1–12).
 *   node scripts/manus/request-hero-targets-wave13.mjs --fire
 *   node scripts/manus/request-hero-targets-wave13.mjs --poll-only
 */
process.argv.push('--wave=13');
await import('./request-hero-targets-harvest.mjs');
