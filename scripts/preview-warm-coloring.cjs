/**
 * Bake Warm Up pages for castle + face (topic coloring check).
 *   node scripts/preview-warm-coloring.cjs
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUTDIR = path.join(ROOT, 'tmp', 'coloring-preview');
const PORT = 8900 + Math.floor(Math.random() * 200);

async function main() {
  fs.mkdirSync(OUTDIR, { recursive: true });

  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent((req.url || '/').split('?')[0].replace(/^\//, '') || 'index.html');
    const file = path.join(ROOT, 'public', rel);
    if (!file.startsWith(path.join(ROOT, 'public')) || !fs.existsSync(file)) {
      res.writeHead(404);
      res.end();
      return;
    }
    const ext = path.extname(file);
    const types = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.css': 'text/css',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
    };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() =>
    window.LessonPages && window.EdbActivities && window.BoardPreview
      && window.PropBank && window.ColoringOutlines
  );

  const jobs = [
    { id: 'castle', fixture: 'scripts/fixtures/castle-lesson.json' },
    { id: 'face', fixture: 'scripts/fixtures/face-lesson.json' },
    {
      id: 'beach',
      lesson: {
        title: 'At the Beach',
        warmUp: { question: 'Do you like sand?' },
        vocabulary: [{ word: 'shell' }, { word: 'pail' }],
        activity: { title: 'Build a sandcastle' },
        sentenceFrames: ['I see a ___.'],
        phonics: { targetWords: [] },
        story: { title: 'Beach', pages: [{ text: 'We go to the beach.' }] },
        comprehension: { questions: [] },
        speaking: { questions: [] },
        reviewSentences: [],
      },
    },
  ];

  for (const job of jobs) {
    const lesson = job.fixture
      ? JSON.parse(fs.readFileSync(path.join(ROOT, job.fixture), 'utf8'))
      : job.lesson;
    const meta = { level: 'A1', duration: '30', phonics: 'on' };
    const result = await page.evaluate(async ({ lesson, meta }) => {
      await window.PropBank.ready();
      const boardPlan = window.EdbActivities.buildBoardPlan(lesson, meta);
      await window.LessonPages.attachBgPicks(lesson, meta, boardPlan);
      const canvases = await window.BoardPreview.renderCanvases(lesson, meta, boardPlan);
      const warmIdx = (boardPlan.pages || []).findIndex((p) => p.pageKey === 'warm');
      const idx = warmIdx >= 0 ? warmIdx : 1;
      const outline = window.ColoringOutlines.forLesson(lesson, meta);
      return {
        dataUrl: canvases[idx].toDataURL('image/jpeg', 0.92),
        outlineId: outline && outline.id,
        label: outline && outline.label,
        idx,
      };
    }, { lesson, meta });

    const out = path.join(OUTDIR, `warm-${job.id}.jpg`);
    fs.writeFileSync(out, Buffer.from(result.dataUrl.split(',')[1], 'base64'));
    console.log(`${job.id}: outline=${result.outlineId} (${result.label}) pageIdx=${result.idx} -> ${path.relative(ROOT, out)}`);
  }

  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
