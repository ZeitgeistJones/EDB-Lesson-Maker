/**
 * One-shot story-art loop: generate lesson → illustrate → save thumbs → report.
 * Usage: node scripts/loop-story-art.mjs [topic]
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const envPath = resolve(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
}

const BASE = process.env.LOOP_BASE || 'http://localhost:3001';
const topic = process.argv[2] || 'I live in a castle';
const outDir = resolve(root, 'tmp', 'story-art-loop');
mkdirSync(outDir, { recursive: true });

async function post(path, body) {
  const t0 = Date.now();
  const resp = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 400) }; }
  return { ok: resp.ok, status: resp.status, ms: Date.now() - t0, data };
}

console.log(`Loop base=${BASE} topic="${topic}"`);
const gen = await post('/api/generate-lesson', { topic, level: 'A1', duration: '30', phonics: 'on' });
if (!gen.ok) {
  console.error('generate-lesson FAIL', gen.status, gen.data.error || gen.data);
  process.exit(1);
}
const lesson = gen.data.lesson;
const pages = (lesson.story?.pages || []).slice(0, 3).map((p, i) => ({
  index: i,
  heading: p.heading || '',
  text: p.text || '',
  visualCaption: p.visualCaption || p.visualTheme || '',
}));
console.log(`lesson OK ${gen.ms}ms — "${lesson.title}" — ${pages.length} story page(s)`);
writeFileSync(resolve(outDir, 'lesson.json'), JSON.stringify({ topic, lesson, pages }, null, 2));

const art = await post('/api/generate-story-art', {
  title: lesson.title,
  level: gen.data.level || 'A1',
  pages,
});
console.log(`story-art HTTP ${art.status} in ${art.ms}ms`);
if (!art.ok) {
  console.error('story-art FAIL', art.data.error || art.data);
  writeFileSync(resolve(outDir, 'story-art-error.json'), JSON.stringify(art.data, null, 2));
  process.exit(1);
}

const results = art.data.pages || [];
let hits = 0;
for (const p of results) {
  if (p.dataUrl && p.dataUrl.startsWith('data:')) {
    hits += 1;
    const m = p.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (m) {
      const ext = m[1].includes('jpeg') || m[1].includes('jpg') ? 'jpg' : 'png';
      writeFileSync(resolve(outDir, `page-${p.index}.${ext}`), Buffer.from(m[2], 'base64'));
    }
  } else {
    console.log(`  page ${p.index}: NULL (${p.reason || 'no reason'})`);
  }
}
if (art.data.styleRef) {
  const m = art.data.styleRef.match(/^data:([^;]+);base64,(.+)$/);
  if (m) {
    const ext = m[1].includes('jpeg') || m[1].includes('jpg') ? 'jpg' : 'png';
    writeFileSync(resolve(outDir, `style-ref.${ext}`), Buffer.from(m[2], 'base64'));
  }
}

const report = {
  topic,
  title: lesson.title,
  generateMs: gen.ms,
  artMs: art.ms,
  model: art.data.model,
  hits,
  total: results.length,
  pages: results.map((p) => ({ index: p.index, ok: !!p.dataUrl, reason: p.reason || null })),
  outDir,
};
writeFileSync(resolve(outDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(hits ? 0 : 1);
