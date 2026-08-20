/**
 * Hero-target stockpile wave 5 (put-in / put-on / sorting, no overlap with 1–4).
 *   node scripts/manus/request-hero-targets-wave5.mjs --fire
 *   node scripts/manus/request-hero-targets-wave5.mjs --poll-only
 */
process.argv.push('--wave=5');
await import('./request-hero-targets-harvest.mjs');
