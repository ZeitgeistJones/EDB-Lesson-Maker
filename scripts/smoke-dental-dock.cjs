/**
 * Smoke: dentist lesson with vocab "smile" must still get a dental dock, not face parts.
 * Also: bathroom "toothbrush" must NOT steal the open-mouth dental king.
 *   node scripts/smoke-dental-dock.cjs
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const PORT = 8922 + Math.floor(Math.random() * 80);

function planActivity(page, lesson, meta) {
  return page.evaluate(async ({ lesson, meta }) => {
    await window.PropBank.ready();
    if (window.VocabIcons && window.VocabIcons.ready) await window.VocabIcons.ready();
    const plan = window.EdbActivities.buildBoardPlan(lesson, meta);
    const act = (plan.pages || []).find((p) => p.pageKey === 'activity');
    const pieces = [...((act && act.unlocked) || []), ...((act && act.locked) || [])];
    const keys = pieces
      .map((p) => (p.meta && p.meta.propKey) || '')
      .filter(Boolean);
    const hero = pieces.find((p) => p.role === 'stageHero' || (p.meta && p.meta.stageKing));
    const actAssign = (plan.assignments || []).find((a) => a.pageKey === 'activity');
    return {
      recipeId: actAssign && actAssign.recipeId,
      notes: (act && act.notes) || [],
      hero: hero && hero.meta && hero.meta.propKey,
      keys,
      faceKeys: keys.filter((k) => /^(face-|hair-)/.test(k)).length,
      dentalKeys: keys.filter((k) => /dental|tooth|floss|brush|cavity|toothpaste/.test(k)).length,
    };
  }, { lesson, meta });
}

async function main() {
  const dentist = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'scripts/fixtures/dentist-lesson.json'), 'utf8')
  );
  const bathroom = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'scripts/fixtures/bathroom-routines-lesson.json'), 'utf8')
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

  const r = await planActivity(page, dentist, { level: 'A1', duration: '30', phonics: 'on' });
  console.log('dentist', JSON.stringify(r, null, 2));

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
  const sweets = r.keys.filter((k) => /lollipop|cookie|candy/.test(k));
  if (!sweets.length) {
    console.error('FAIL dental dock missing sweets (lollipop/cookie/candy), got', r.keys);
    process.exit(1);
  }
  console.log('PASS dental dock (smile vocab did not steal face kit; sweets:', sweets.join(','), ')');

  const bath = await planActivity(page, bathroom, { level: 'A1', duration: '30' });
  console.log('bathroom', JSON.stringify(bath, null, 2));
  if (bath.hero === 'dental-kid-open-mouth') {
    console.error('FAIL bathroom toothbrush stole dental king stage');
    process.exit(1);
  }
  // Bathroom may ship its own king (bathtub) or fall to sortBins — either is fine.
  // Only the dental open-mouth steal is forbidden.
  if (bath.recipeId !== 'sortBins' && bath.recipeId !== 'heroProp') {
    console.error('FAIL bathroom activity expected sortBins or heroProp, got', bath.recipeId);
    process.exit(1);
  }
  if (bath.recipeId === 'heroProp' && bath.hero && !/^bath-/.test(bath.hero)) {
    console.error('FAIL bathroom hero should be bath-* king, got', bath.hero);
    process.exit(1);
  }
  console.log('PASS bathroom →', bath.recipeId, bath.hero || '(no king)', '(not dental steal)');

  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
