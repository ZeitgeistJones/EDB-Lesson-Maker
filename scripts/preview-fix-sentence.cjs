/**
 * Preview fixSentence activity page (soccer coach — sentences → fix before odd).
 *   node scripts/preview-fix-sentence.cjs
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'tmp', 'fix-sentence-preview.jpg');
const PORT = 8765 + Math.floor(Math.random() * 1000);

async function main() {
  const lesson = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'scripts/fixtures/soccer-coach-lesson.json'), 'utf8')
  );
  const meta = { level: 'A2', duration: '30' };

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
  const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() =>
    window.LessonPages && window.EdbActivities && window.BoardPreview && window.PropBank
  );

  const dataUrl = await page.evaluate(async ({ lesson, meta }) => {
    await window.PropBank.ready();
    if (window.VocabIcons && window.VocabIcons.ready) await window.VocabIcons.ready();
    const boardPlan = window.EdbActivities.buildBoardPlan(lesson, meta);
    const act = (boardPlan.assignments || []).find((a) => a.pageKey === 'activity');
    if (!act || act.recipeId !== 'fixSentence') {
      throw new Error('expected fixSentence, got ' + (act && act.recipeId));
    }
    await window.LessonPages.attachBgPicks(lesson, meta, boardPlan);
    const canvases = await window.BoardPreview.renderCanvases(lesson, meta, boardPlan);
    const actIdx = boardPlan.pages.findIndex((p) => p.pageKey === 'activity');
    return {
      dataUrl: canvases[actIdx].toDataURL('image/jpeg', 0.92),
      sentence: act.ctx && act.ctx.sentence,
      wrong: act.ctx && act.ctx.wrong,
      correct: act.ctx && act.ctx.correct,
      distractors: act.ctx && act.ctx.distractors,
      source: act.ctx && act.ctx.source,
    };
  }, { lesson, meta });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(dataUrl.dataUrl.split(',')[1], 'base64'));
  console.log('Wrote', path.relative(ROOT, OUT), {
    sentence: dataUrl.sentence,
    wrong: dataUrl.wrong,
    correct: dataUrl.correct,
    distractors: dataUrl.distractors,
    source: dataUrl.source,
  });

  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
