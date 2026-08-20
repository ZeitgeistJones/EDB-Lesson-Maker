/**
 * Hero-target stockpile wave 15 (ocean/marina/aquarium — no overlap with 1–14).
 *   node scripts/manus/request-hero-targets-wave15.mjs --fire
 *   node scripts/manus/request-hero-targets-wave15.mjs --poll-only
 */
process.argv.push('--wave=15');
await import('./request-hero-targets-harvest.mjs');
