/**
 * BG lesson-card stockpile wave 2 — playground/park/shop/clinic.
 *   node scripts/manus/request-bg-cards-wave2.mjs --fire
 *   node scripts/manus/request-bg-cards-wave2.mjs --poll-only
 */
process.argv.push('--wave=2');
await import('./request-bg-cards-harvest.mjs');
