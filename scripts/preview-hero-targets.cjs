/**
 * Bake a few medium-hero activity pages (chest / backpack / pizza / hippo).
 *   node scripts/preview-hero-targets.cjs
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'tmp', 'hero-targets-preview');
const PORT = 8765 + Math.floor(Math.random() * 1000);

const CASES = [
  { file: 'chest.jpg', title: 'Pirate Treasure Chest', vocab: ['treasure', 'chest', 'gold', 'map'], hero: 'hero-chest-open' },
  { file: 'backpack.jpg', title: 'Pack Your Backpack', vocab: ['backpack', 'book', 'pencil', 'lunch'], hero: 'hero-backpack-open' },
  { file: 'pizza.jpg', title: 'Make a Pizza', vocab: ['pizza', 'crust', 'topping', 'slice'], hero: 'hero-pizza-base' },
  { file: 'hippo.jpg', title: 'Feed the Hippo', vocab: ['hippo', 'apple', 'hungry', 'mouth'], hero: 'hero-animal-mouth' },
];

async function main() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent((req.url || '/').split('?')[0].replace(/^\//, '') || 'index.html');
    const file = path.join(ROOT, 'public', rel);
    if (!file.startsWith(path.join(ROOT, 'public')) || !fs.existsSync(file)) {
      res.writeHead(404);
      res.end();
      return;
    }
    const ext = path.extname(file);
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
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

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const meta = { level: 'A1', duration: '30', phonics: 'off' };

  for (const c of CASES) {
    const lesson = {
      title: c.title,
      vocabulary: c.vocab.map((word) => ({ word })),
      activity: { title: c.title },
    };
    const dataUrl = await page.evaluate(async ({ lesson, meta }) => {
      await window.PropBank.ready();
      if (window.VocabIcons && window.VocabIcons.ready) await window.VocabIcons.ready();
      const boardPlan = window.EdbActivities.buildBoardPlan(lesson, meta);
      await window.LessonPages.attachBgPicks(lesson, meta, boardPlan);
      const canvases = await window.BoardPreview.renderCanvases(lesson, meta, boardPlan);
      const actIdx = boardPlan.pages.findIndex((p) => p.pageKey === 'activity');
      const act = (boardPlan.assignments || []).find((a) => a.pageKey === 'activity');
      return {
        jpeg: canvases[actIdx].toDataURL('image/jpeg', 0.9),
        recipe: act && act.recipeId,
        hero: act && act.ctx && act.ctx.hero && act.ctx.hero.key,
      };
    }, { lesson, meta });
    const dest = path.join(OUT_DIR, c.file);
    fs.writeFileSync(dest, Buffer.from(dataUrl.jpeg.split(',')[1], 'base64'));
    console.log('Wrote', path.relative(ROOT, dest), dataUrl.recipe, dataUrl.hero || '');
  }

  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
