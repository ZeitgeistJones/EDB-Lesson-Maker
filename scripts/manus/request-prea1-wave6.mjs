/**
 * Pre-A1 stockpile wave 6 — mnemonic A–Z (locked mapping in prea1-mnemonic-az-map.json).
 *   node scripts/manus/request-prea1-wave6.mjs --fire
 *   node scripts/manus/request-prea1-wave6.mjs --poll-only
 */
process.argv.push('--wave=6');
await import('./request-prea1-harvest.mjs');
