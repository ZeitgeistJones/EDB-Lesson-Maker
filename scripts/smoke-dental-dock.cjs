/**
 * Smoke: dentist lesson with vocab "smile" must still get a dental dock, not face parts.
 *   node scripts/smoke-dental-dock.cjs
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const PORT = 8922 + Math.floor(Math.random() * 80);

async function main() {
  const lesson = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'scripts/fixtures/dentist-lesson.json'), 'utf8')
  );
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
    };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.PropBank && window.EdbActivities);

  const r = await page.evaluate(async (lesson) => {
    await window.PropBank.ready();
    if (window.VocabIcons && window.VocabIcons.ready) await window.VocabIcons.ready();
    const meta = { level: 'A1', duration: '30', phonics: 'on' };
    const plan = window.EdbActivities.buildBoardPlan(lesson, meta);
    const act = (plan.pages || []).find((p) => p.pageKey === 'activity');
    const pieces = [...((act && act.unlocked) || []), ...((act && act.locked) || [])];
    const keys = pieces
      .map((p) => (p.meta && p.meta.propKey) || '')
      .filter(Boolean);
    const hero = pieces.find((p) => p.role === 'stageHero' || (p.meta && p.meta.stageKing));
    return {
      hero: hero && hero.meta && hero.meta.propKey,
      keys,
      faceKeys: keys.filter((k) => /^(face-|hair-)/.test(k)).length,
      dentalKeys: keys.filter((k) => /dental|tooth|floss|brush|cavity|toothpaste/.test(k)).length,
    };
  }, lesson);

  console.log(JSON.stringify(r, null, 2));
  await browser.close();
  server.close();

  if (r.hero !== 'dental-kid-open-mouth') {
    console.error('FAIL expected dental hero, got', r.hero);
    process.exit(1);
  }
  if (r.faceKeys > 0) {
    console.error('FAIL face/hair parts still in dental dock:', r.faceKeys);
    process.exit(1);
  }
  if (r.dentalKeys < 3) {
    console.error('FAIL need dental tools in dock, got', r.dentalKeys, r.keys);
    process.exit(1);
  }
  console.log('PASS dental dock (smile vocab did not steal face kit)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
