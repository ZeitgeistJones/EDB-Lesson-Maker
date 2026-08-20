/**
 * BG lesson-card stockpile wave 1 — classroom/home/kitchen/bathroom.
 *   node scripts/manus/request-bg-cards-wave1.mjs --fire
 *   node scripts/manus/request-bg-cards-wave1.mjs --poll-only
 */
process.argv.push('--wave=1');
await import('./request-bg-cards-harvest.mjs');
