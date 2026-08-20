/**
 * Hero-target stockpile wave 8 (pipeline fill, no overlap with 1–7).
 *   node scripts/manus/request-hero-targets-wave8.mjs --fire
 *   node scripts/manus/request-hero-targets-wave8.mjs --poll-only
 */
process.argv.push('--wave=8');
await import('./request-hero-targets-harvest.mjs');
