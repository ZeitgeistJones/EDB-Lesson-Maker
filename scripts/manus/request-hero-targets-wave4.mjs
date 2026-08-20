/**
 * Hero-target stockpile wave 4 (put-in / put-on, no overlap with 1–3).
 *   node scripts/manus/request-hero-targets-wave4.mjs --fire
 *   node scripts/manus/request-hero-targets-wave4.mjs --poll-only
 */
process.argv.push('--wave=4');
await import('./request-hero-targets-harvest.mjs');
