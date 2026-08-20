/**
 * BG lesson-card stockpile wave 3 — library/farm/zoo/beach/forest.
 *   node scripts/manus/request-bg-cards-wave3.mjs --fire
 *   node scripts/manus/request-bg-cards-wave3.mjs --poll-only
 */
process.argv.push('--wave=3');
await import('./request-bg-cards-harvest.mjs');
