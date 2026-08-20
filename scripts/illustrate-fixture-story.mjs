/**
 * Illustrate a fixture's story pages via generate-story-art (disk-cached).
 *
 *   node scripts/illustrate-fixture-story.mjs feelings-compass-lesson.json
 *   node scripts/illustrate-fixture-story.mjs classical-compose-lesson.json --title="..." --force
 *
 * Needs STORY_ART=1 + GEMINI_API_KEY. Writes tmp/story-art-cache/<hash>/ and
 * prints cacheKey so verify --story-art=auto can hydrate boards.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const envPath = resolve(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
}

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const fixtureArg = process.argv.slice(2).find((a) => !a.startsWith('-')) || 'feelings-compass-lesson.json';
const fixturePath = fixtureArg.includes('/') || fixtureArg.includes('\\')
  ? resolve(fixtureArg)
  : resolve(root, 'scripts/fixtures', fixtureArg);
const force = process.argv.includes('--force') || arg('force', '') === '1';
const level = arg('level', 'B1');

if (!existsSync(fixturePath)) {
  console.error('fixture missing:', fixturePath);
  process.exit(1);
}

const lesson = JSON.parse(readFileSync(fixturePath, 'utf8'));
const titleOverride = arg('title', '');
if (titleOverride) lesson.title = titleOverride;

const pages = ((lesson.story && lesson.story.pages) || []).slice(0, 3).map((p, i) => ({
  index: i,
  heading: p.heading || '',
  text: p.text || '',
  visualCaption: p.visualCaption || p.visualTheme || '',
}));

if (!pages.length) {
  console.error('no story.pages in fixture');
  process.exit(1);
}

const handler = require('../api/generate-story-art.js');

function mockRes() {
  const out = { statusCode: 200, body: null };
  return {
    out,
    setHeader() {},
    status(code) { out.statusCode = code; return this; },
    json(payload) { out.body = payload; return this; },
  };
}

const cacheKey = handler.cacheKeyFor(lesson.title || 'Story', level, pages);
const existing = !force ? handler.loadCachedResult(cacheKey) : null;
if (existing) {
  const hits = existing.pages.filter((p) => p.dataUrl).length;
  const total = existing.pages.length || pages.length;
  if (hits >= total && hits > 0) {
    console.log(JSON.stringify({
      ok: true,
      cacheHit: true,
      complete: true,
      cacheKey,
      hits,
      total,
      title: lesson.title,
      fixture: fixturePath,
    }, null, 2));
    process.exit(0);
  }
  // Partial cache: fall through so the API fills only missing pages.
  console.log(JSON.stringify({
    ok: true,
    cacheHit: true,
    complete: false,
    fillingMissing: true,
    cacheKey,
    hits,
    total,
    title: lesson.title,
  }, null, 2));
}

const res = mockRes();
await handler(
  {
    method: 'POST',
    body: {
      title: lesson.title || 'Story',
      level,
      pages,
      force,
      fillMissing: true,
    },
  },
  res
);

const data = res.out.body || {};
const hits = (data.pages || []).filter((p) => p && p.dataUrl).length;
const reportDir = resolve(root, 'tmp', 'story-art-loop');
mkdirSync(reportDir, { recursive: true });
const report = {
  fixture: fixturePath,
  title: lesson.title,
  level,
  status: res.out.statusCode,
  cacheKey: data.cacheKey || cacheKey,
  cacheHit: !!data.cacheHit,
  hits,
  total: (data.pages || []).length,
  pages: (data.pages || []).map((p) => ({
    index: p.index,
    ok: !!p.dataUrl,
    reason: p.reason || null,
  })),
  error: data.error || null,
};
writeFileSync(join(reportDir, 'illustrate-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(res.out.statusCode < 400 && hits ? 0 : 1);
