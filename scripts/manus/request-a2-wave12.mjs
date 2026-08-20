/**
 * A2 stockpile P1.3 — social conversation-management cues.
 *   node scripts/manus/request-a2-wave12.mjs --fire
 *   node scripts/manus/request-a2-wave12.mjs --poll-only
 */
process.argv.push('--wave=12');
await import('./request-a2-p0-harvest.mjs');
