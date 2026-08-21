/**
 * Bake one StoryScene board for the story Manus loop.
 * Asserts the intended template / layers before writing, so a 30-minute
 * collapse cannot silently ship story0 of the wrong fixture (R4/R5 miss).
 *
 *   node scripts/bake-story-board.cjs --fixture=story-scene-soccer-give-lesson.json --out=round-06-soccer-ball-give
 *   node scripts/bake-story-board.cjs --fixture=story-scene-picnic-apple-lesson.json --out=round-07-picnic-apple-share
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-board-loops', 'story');

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

async function servePublic() {
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
        '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json',
        '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
      };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, () => resolve(server));
  });
}

async function main() {
  const fixtureName = arg('fixture', 'story-scene-soccer-give-lesson.json');
  const outSlug = arg('out', 'round-story');
  const pageKey = arg('page', 'story0');
  const level = arg('level', 'A1');
  const duration = Number(arg('duration', '30')) || 30;
  const expectTemplate = arg('expect-template', '');
  const lesson = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'scripts', 'fixtures', fixtureName), 'utf8')
  );
  const authored = ((lesson.story && lesson.story.pages) || [])[0] || {};
  const wantTemplate = expectTemplate || (authored.storyScene && authored.storyScene.templateId) || '';

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await servePublic();
  const port = server.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 850 } });
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() =>
    window.LessonPages && window.EdbActivities && window.BoardPreview
    && window.PropBank && window.VocabIcons && window.StoryScene
  );

  const row = await page.evaluate(async ({ lesson, meta, pageKey, wantTemplate }) => {
    await window.PropBank.ready();
    await window.VocabIcons.ready();
    const boardPlan = window.EdbActivities.buildBoardPlan(lesson, meta);
    await window.LessonPages.attachBgPicks(lesson, meta, boardPlan);
    const rendered = await window.LessonPages.render(lesson, meta, boardPlan);
    const idx = rendered.slots.byKey[pageKey];
    if (idx == null) {
      return { ok: false, error: `missing ${pageKey}; keys=${Object.keys(rendered.slots.byKey).join(',')}` };
    }
    const pageEl = rendered.pageEls[idx];
    const art = pageEl && pageEl.querySelector('[data-story-art]');
    const stage = art && art.querySelector('[data-story-scene-stage]');
    const body = pageEl && pageEl.querySelector('[data-story-body]');
    const overlay = pageEl && pageEl.querySelector('[data-story-overlay]');
    const layers = stage
      ? Array.from(stage.querySelectorAll('[data-story-layer]')).map((node) => ({
          slot: node.dataset.storyLayer,
          key: node.dataset.propKey,
        }))
      : [];
    const templateId = art ? art.dataset.storyScene : '';
    const warnings = art ? art.dataset.storySceneWarn || '' : '';
    if (wantTemplate && templateId !== wantTemplate) {
      return {
        ok: false,
        error: `expected template ${wantTemplate}, got ${templateId || 'none'}`,
        templateId,
        layers,
        body: body ? String(body.textContent || '').trim() : '',
      };
    }
    if (!stage) return { ok: false, error: 'StoryScene stage missing' };
    const canvases = await window.BoardPreview.renderCanvases(lesson, meta, boardPlan);
    if (!canvases[idx]) return { ok: false, error: 'missing canvas' };
    return {
      ok: true,
      dataUrl: canvases[idx].toDataURL('image/jpeg', 0.92),
      templateId,
      warnings,
      layers,
      body: body ? String(body.textContent || '').trim() : '',
      hasOverlay: !!overlay,
      storyKeys: Object.keys(rendered.slots.byKey).filter((k) => /^story\d+$/.test(k)),
    };
  }, { lesson, meta: { level, duration, phonics: 'off' }, pageKey, wantTemplate });

  await browser.close();
  server.close();

  if (!row.ok) {
    console.error('FAIL', JSON.stringify(row, null, 2));
    process.exit(1);
  }

  const outPath = path.join(OUT_DIR, `${outSlug}.jpg`);
  const buf = Buffer.from(row.dataUrl.split(',')[1], 'base64');
  if (buf.length < 20000) {
    console.error('FAIL packet too small', buf.length);
    process.exit(1);
  }
  fs.writeFileSync(outPath, buf);
  console.log(JSON.stringify({
    ok: true,
    out: path.relative(ROOT, outPath).replace(/\\/g, '/'),
    bytes: buf.length,
    templateId: row.templateId,
    warnings: row.warnings,
    layers: row.layers,
    body: row.body,
    hasOverlay: row.hasOverlay,
    storyKeys: row.storyKeys,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
