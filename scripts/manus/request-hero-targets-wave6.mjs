/**
 * Hero-target stockpile wave 6 (pipeline fill, no overlap with 1–5).
 *   node scripts/manus/request-hero-targets-wave6.mjs --fire
 *   node scripts/manus/request-hero-targets-wave6.mjs --poll-only
 */
process.argv.push('--wave=6');
await import('./request-hero-targets-harvest.mjs');
