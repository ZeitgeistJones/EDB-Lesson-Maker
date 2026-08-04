/**
 * Print last board quality report for humans / agents.
 *   npm run quality:status
 */
const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, '..', 'tmp', 'board-bg-verify', 'report.json');
if (!fs.existsSync(reportPath)) {
  console.error('No report yet. Run: npm run quality');
  process.exit(1);
}
const r = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
console.log('generatedAt:', r.generatedAt);
console.log('hardFailures:', (r.hardFailures || []).length);
(r.hardFailures || []).forEach((f) => console.log(' •', f));
console.log('softHints:', (r.softHints || []).length);
console.log('cases:', (r.cases || []).map((c) => c.id).join(', '));
if (r.uxVerdict) {
  console.log('uxVerdict:', JSON.stringify(r.uxVerdict, null, 2));
} else {
  console.log('uxVerdict: (none — agent should review strips)');
}
const wishPath = path.join(__dirname, '..', 'docs', 'asset-wishlist.md');
if (fs.existsSync(wishPath)) {
  const wish = fs.readFileSync(wishPath, 'utf8');
  const openRows = (wish.match(/\|\s*open\s*\|/gi) || []).length;
  console.log('assetWishlist:', wishPath, `(open rows ≈ ${openRows})`);
} else {
  console.log('assetWishlist: (missing docs/asset-wishlist.md)');
}
