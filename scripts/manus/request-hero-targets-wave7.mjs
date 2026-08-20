/**
 * Hero-target stockpile wave 7 (put-in / put-on / sorting / build, no overlap with 1–6).
 *   node scripts/manus/request-hero-targets-wave7.mjs --fire
 *   node scripts/manus/request-hero-targets-wave7.mjs --poll-only
 */
process.argv.push('--wave=7');
await import('./request-hero-targets-harvest.mjs');
