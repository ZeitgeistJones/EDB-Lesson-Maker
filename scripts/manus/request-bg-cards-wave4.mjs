/**
 * BG lesson-card stockpile wave 4 — airport/sports/pool/weather seasonal.
 *   node scripts/manus/request-bg-cards-wave4.mjs --fire
 *   node scripts/manus/request-bg-cards-wave4.mjs --poll-only
 */
process.argv.push('--wave=4');
await import('./request-bg-cards-harvest.mjs');
