/**
 * Hero-target stockpile wave 3 (crew — concurrent with other waves).
 *   node scripts/manus/request-hero-targets-wave3.mjs --fire
 *   node scripts/manus/request-hero-targets-wave3.mjs --poll-only
 */
process.argv.push('--wave=3');
await import('./request-hero-targets-harvest.mjs');
