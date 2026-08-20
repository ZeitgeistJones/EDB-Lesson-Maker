/**
 * Preview oddOneOut activity page (bare basketball — ≥4 pictured, no sentences
 * so fixSentence does not steal the slot).
 *   node scripts/preview-odd-one-out.cjs
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'tmp', 'odd-one-out-preview.jpg');
const PORT = 8765 + Math.floor(Math.random() * 1000);

async function main() {
  const lesson = {
    title: 'Playing Basketball with Friends',
    vocabulary: ['ball', 'team', 'score', 'court'].map((word) => ({ word })),
    activity: {
      title: 'Odd one out',
      prompt: 'Find the odd one.',
      templates: ['This is a ____.'],
    },
    warmUp: { question: 'Do you play sports?', sampleAnswer: 'Yes, I do.' },
    story: {
      title: 'Game Day',
      pages: [{ heading: 'Court', text: 'We play on the court.', visualTheme: 'sports', visualCaption: 'Kids on a court' }],
      comprehensionQuestions: [{ question: 'Where do they play?', sampleAnswer: 'On the court.' }],
      creativeQuestions: [],
    },
    speakingQuestions: [{ question: 'Do you like basketball?', sampleAnswer: 'Yes, I do.' }],
    sentenceFrames: [],
    reviewSentences: [],
  };
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
    if (!act || act.recipeId !== 'oddOneOut') {
      throw new Error('expected oddOneOut, got ' + (act && act.recipeId));
    }
    await window.LessonPages.attachBgPicks(lesson, meta, boardPlan);
    const canvases = await window.BoardPreview.renderCanvases(lesson, meta, boardPlan);
    const actIdx = boardPlan.pages.findIndex((p) => p.pageKey === 'activity');
    return {
      dataUrl: canvases[actIdx].toDataURL('image/jpeg', 0.92),
      options: act.ctx && act.ctx.options,
      odd: act.ctx && act.ctx.odd,
      source: act.ctx && act.ctx.source,
      themeCue: act.ctx && act.ctx.themeCue,
    };
  }, { lesson, meta });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(dataUrl.dataUrl.split(',')[1], 'base64'));
  console.log('Wrote', path.relative(ROOT, OUT), {
    options: dataUrl.options,
    odd: dataUrl.odd,
    source: dataUrl.source,
    themeCue: dataUrl.themeCue,
  });

  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
