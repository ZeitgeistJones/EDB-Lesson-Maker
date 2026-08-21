/**
 * Render the `title` and `wrap` page-format boards for one lesson fixture,
 * for use as round-02+ topic-rotation input to
 * scripts/manus/review-single-board.mjs (see docs/manus-board-loops/title.md
 * and wrap.md).
 *
 * Not part of the shared board-type baseline set — kept separate so the
 * title/wrap topic-rotation loop does not need to touch
 * preview-board-type-baselines.cjs (shared across many other board loops).
 *
 *   node scripts/preview-title-wrap-topic.cjs --fixture=dentist-lesson.json --level=A1 --duration=30
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'tmp', 'title-wrap-topic-preview');

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  const hit = process.argv.find((value) => value.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function servePublic() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent((req.url || '/').split('?')[0].replace(/^\//, '') || 'index.html');
      const file = path.join(ROOT, 'public', rel);
      if (!file.startsWith(path.join(ROOT, 'public')) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      const ext = path.extname(file);
      const types = {
        '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml', '.css': 'text/css', '.woff2': 'font/woff2',
      };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const fixtureName = arg('fixture', 'dentist-lesson.json');
  const level = arg('level', 'A1');
  const duration = Number(arg('duration', '30')) || 30;
  const lesson = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'fixtures', fixtureName), 'utf8'));
  const meta = { level, duration };

  const server = await servePublic();
  const port = server.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 850 } });
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() =>
    window.LessonPages && window.EdbActivities && window.BoardPreview
    && window.PropBank && window.VocabIcons
  );

  const out = {};
  for (const pageKey of ['title', 'wrap']) {
    const row = await page.evaluate(async ({ lesson, meta, pageKey }) => {
      await window.PropBank.ready();
      await window.VocabIcons.ready();
      const boardPlan = window.EdbActivities.buildBoardPlan(lesson, meta);
      await window.LessonPages.attachBgPicks(lesson, meta, boardPlan);
      const canvases = await window.BoardPreview.renderCanvases(lesson, meta, boardPlan);
      const idx = boardPlan.pages.findIndex((p) => p.pageKey === pageKey);
      if (idx < 0 || !canvases[idx]) {
        return { ok: false, error: `missing page-format canvas for ${pageKey}` };
      }
      return { ok: true, dataUrl: canvases[idx].toDataURL('image/jpeg', 0.92) };
    }, { lesson, meta, pageKey });

    if (!row.ok) {
      console.error('FAIL', pageKey, row.error);
      out[pageKey] = { ok: false, error: row.error };
      continue;
    }
    const outPath = path.join(OUT_DIR, `${pageKey}-${path.basename(fixtureName, '.json')}.jpg`);
    fs.writeFileSync(outPath, Buffer.from(row.dataUrl.split(',')[1], 'base64'));
    out[pageKey] = { ok: true, path: path.relative(ROOT, outPath).replace(/\\/g, '/') };
    console.log('OK', pageKey, out[pageKey].path);
  }

  await browser.close();
  server.close();
  if (Object.values(out).some((r) => !r.ok)) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
