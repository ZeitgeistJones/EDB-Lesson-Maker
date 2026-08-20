/**
 * Hero-target stockpile wave 12 (pipeline fill, no overlap with 1–11).
 *   node scripts/manus/request-hero-targets-wave12.mjs --fire
 *   node scripts/manus/request-hero-targets-wave12.mjs --poll-only
 */
process.argv.push('--wave=12');
await import('./request-hero-targets-harvest.mjs');
