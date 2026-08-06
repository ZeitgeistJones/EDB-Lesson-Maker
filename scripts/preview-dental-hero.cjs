/**
 * One-off: render dentist activity page with dental-kid-open-mouth as hero.
 *   node scripts/preview-dental-hero.cjs
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'tmp', 'dental-hero-preview.jpg');
const PORT = 8765 + Math.floor(Math.random() * 1000);

async function main() {
  const lesson = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'scripts/fixtures/dentist-lesson.json'), 'utf8')
  );
  const meta = { level: 'A1', duration: '30', phonics: 'on' };

  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent((req.url || '/').split('?')[0].replace(/^\//, '') || 'index.html');
    const file = path.join(ROOT, 'public', rel);
    if (!file.startsWith(path.join(ROOT, 'public')) || !fs.existsSync(file)) {
      res.writeHead(404);
      res.end();
      return;
    }
    const ext = path.extname(file);
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css' };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() =>
    window.LessonPages && window.EdbActivities && window.BoardPreview && window.PropBank
  );

  const dataUrl = await page.evaluate(async ({ lesson, meta }) => {
    await window.PropBank.ready();
    const boardPlan = window.EdbActivities.buildBoardPlan(lesson, meta);
    // Force open-mouth kid as the activity hero
    const hero = window.PropBank.resolve({ word: 'dental-kid-open-mouth', family: 'matte' })
      || window.PropBank.all().find((p) => p.key === 'dental-kid-open-mouth');
    boardPlan.assignments = (boardPlan.assignments || []).filter((a) => a.pageKey !== 'activity');
    boardPlan.assignments.push({
      pageKey: 'activity',
      recipeId: 'heroProp',
      ctx: { hero },
    });
    // Rebuild activity page on heroStage zones (king layout)
    const idx = boardPlan.pages.findIndex((p) => p.pageKey === 'activity');
    if (idx >= 0) {
      const page = window.EdbLayout.createPage('heroStage');
      page.pageKey = 'activity';
      page.pageIndex = idx;
      boardPlan.pages[idx] = page;
      if (boardPlan.indexByKey) boardPlan.indexByKey.activity = idx;
      window.EdbActivities.applyToPage(lesson, page, 'activity', boardPlan);
    }
    await window.LessonPages.attachBgPicks(lesson, meta, boardPlan);
    // Quiet clinic flat on every page for a clean hero read
    const bgm = await (await fetch('assets/08_backgrounds/manifest.json')).json();
    const flat = bgm.flats['clinic-c'];
    const pick = {
      type: 'flat',
      name: 'clinic-c',
      file: flat.file,
      path: 'assets/08_backgrounds/img/' + flat.file,
      textInk: flat.textInk || 'dark',
    };
    boardPlan.bgPicks = (boardPlan.bgPicks || []).map(() => Object.assign({}, pick));

    const canvases = await window.BoardPreview.renderCanvases(lesson, meta, boardPlan);
    const actIdx = boardPlan.pages.findIndex((p) => p.pageKey === 'activity');
    return canvases[actIdx].toDataURL('image/jpeg', 0.92);
  }, { lesson, meta });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('Wrote', path.relative(ROOT, OUT));

  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
