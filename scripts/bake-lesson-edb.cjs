/**
 * Headless bake: fixture lesson → ClassIn .edb on disk.
 *   node scripts/bake-lesson-edb.cjs classical-compose-lesson.json
 *   node scripts/bake-lesson-edb.cjs classical-compose-lesson.json --out=tmp/Classical-Masterpiece.edb
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');

function parseArgs(argv) {
  const out = { fixture: null, out: null, level: 'B1', duration: '60' };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--out=')) out.out = a.slice(6);
    else if (a.startsWith('--level=')) out.level = a.slice(8);
    else if (a.startsWith('--duration=')) out.duration = a.slice(11);
    else if (!a.startsWith('-')) out.fixture = a;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.fixture) {
    console.error('Usage: node scripts/bake-lesson-edb.cjs <fixture.json> [--out=path.edb]');
    process.exit(1);
  }
  const fixturePath = path.isAbsolute(args.fixture)
    ? args.fixture
    : path.join(ROOT, 'scripts/fixtures', args.fixture);
  const lesson = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  const meta = { level: args.level, duration: args.duration, phonics: 'off' };
  const safeTitle = (lesson.title || 'lesson').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-');
  const outPath = path.resolve(
    ROOT,
    args.out || path.join('tmp', 'edb', `${safeTitle}.edb`)
  );

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
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.css': 'text/css',
      '.woff2': 'font/woff2',
    };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () =>
      window.LessonPages &&
      window.EdbKit &&
      window.EdbLayout &&
      window.EdbActivities &&
      window.PropBank &&
      window.VocabIcons
  );

  const result = await page.evaluate(async ({ lesson, meta }) => {
    if (window.PropBank) await window.PropBank.ready();
    if (window.VocabIcons) await window.VocabIcons.ready();
    const boardPlan = window.EdbActivities.buildBoardPlan(lesson, meta);
    await window.LessonPages.attachBgPicks(lesson, meta, boardPlan);
    const rendered = await window.LessonPages.render(lesson, meta, boardPlan);
    const host = rendered.host;
    await Promise.all(
      [...host.querySelectorAll('img')].map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 2000);
        });
      })
    );
    await new Promise((r) => setTimeout(r, 100));
    const blob = await window.EdbKit.buildLessonEdb(lesson, meta, rendered.pageEls, boardPlan);
    const buf = new Uint8Array(await blob.arrayBuffer());
    const readiness = boardPlan.readiness || null;
    const kit = boardPlan.kit || null;
    const act = (boardPlan.assignments || []).find((a) => a.pageKey === 'activity');
    window.LessonPages.cleanup(host);
    return {
      bytes: Array.from(buf),
      readiness,
      kit,
      activityRecipe: act ? act.recipeId : null,
      pageCount: (rendered.pageEls && rendered.pageEls.length) || 0,
    };
  }, { lesson, meta });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, Buffer.from(result.bytes));
  console.log(JSON.stringify({
    out: path.relative(ROOT, outPath),
    bytes: result.bytes.length,
    pageCount: result.pageCount,
    activityRecipe: result.activityRecipe,
    kit: result.kit,
    readiness: result.readiness && {
      status: result.readiness.status,
      reasons: result.readiness.reasons,
      vocabArt: result.readiness.vocabArt && {
        hits: result.readiness.vocabArt.hits,
        total: result.readiness.vocabArt.total,
      },
    },
  }, null, 2));

  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
