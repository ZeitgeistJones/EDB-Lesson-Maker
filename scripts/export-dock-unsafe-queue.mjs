/**
 * Export high-leverage dockSafe:false props as a Manus replace queue.
 * Skips kenney/decorative scenery; prefers kitchen/sports/space/jobs tags.
 *
 *   node scripts/export-dock-unsafe-queue.mjs
 *   node scripts/export-dock-unsafe-queue.mjs --limit=40
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'public/assets/09_props/manifest.json');
const OUT_DIR = path.join(ROOT, 'tmp', 'dock-unsafe-replace');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : 48;

const PRIORITY_TAG = /kitchen|cook|bakery|sport|soccer|gym|space|astronaut|job|chef|cafe|dental/;
const SKIP_KEY = /kenney-|bgel-|decorative|wallpaper|border|frame-art|scenery/;

const raw = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const unsafe = Object.entries(raw.props || {})
  .filter(([, row]) => row && row.dockSafe === false && row.alpha === true)
  .filter(([key]) => !SKIP_KEY.test(key))
  .map(([key, row]) => {
    const tags = Array.isArray(row.tags) ? row.tags : [];
    const blob = `${key} ${tags.join(' ')}`.toLowerCase();
    let score = 0;
    if (PRIORITY_TAG.test(blob)) score += 10;
    if (/whisk|spatula|blender|apron|timer|soccer|astronaut|chef-hat/.test(key)) score += 20;
    if (row.role === 'dressPart') score += 2;
    if ((row.srcW || 0) < 120 || (row.srcH || 0) < 120) score += 5;
    return { key, file: row.file, role: row.role || null, tags: tags.slice(0, 8), score };
  })
  .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
  .slice(0, LIMIT);

fs.mkdirSync(OUT_DIR, { recursive: true });
const queue = {
  written_at: new Date().toISOString(),
  limit: LIMIT,
  count: unsafe.length,
  manus: 'scripts/manus/request-shift120-dock-unsafe-objects.mjs (extend sheets from this queue after MANUS_API_KEY refresh)',
  keys: unsafe.map((r) => r.key),
  rows: unsafe,
};
fs.writeFileSync(path.join(OUT_DIR, 'queue.json'), JSON.stringify(queue, null, 2));
fs.writeFileSync(
  path.join(OUT_DIR, 'QUEUE.md'),
  [
    '# Dock-unsafe replace queue (high leverage)',
    '',
    `Count: ${unsafe.length} (limit ${LIMIT})`,
    '',
    ...unsafe.map((r) => `- \`${r.key}\` (score ${r.score}) — ${(r.tags || []).join(', ')}`),
    '',
    'After key refresh: extend `request-shift120-dock-unsafe-objects.mjs` sheets from these keys, then `npm run manus:dock-unsafe-objects`.',
    '',
  ].join('\n'),
);
console.log(JSON.stringify({ out: OUT_DIR, count: unsafe.length, top: unsafe.slice(0, 20).map((r) => r.key) }, null, 2));
