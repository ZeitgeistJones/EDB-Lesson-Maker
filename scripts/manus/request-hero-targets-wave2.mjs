/**
 * Hero-target stockpile wave 2. Delegates to the generic harvest runner.
 *   node scripts/manus/request-hero-targets-wave2.mjs --fire
 *   node scripts/manus/request-hero-targets-wave2.mjs --poll-only
 */
process.argv.push('--wave=2');
await import('./request-hero-targets-harvest.mjs');
