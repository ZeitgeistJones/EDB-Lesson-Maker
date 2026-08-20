/**
 * Preview mysteryHints activity page (thin pictured — oddOneOut needs ≥4).
 *   node scripts/preview-mystery-hints.cjs
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'tmp', 'mystery-hints-preview.jpg');
const PORT = 8765 + Math.floor(Math.random() * 1000);

async function main() {
  // 1 pictured word, bare (no sentences/frames) → mysteryHints
  // (fixSentence would win if vocab.sentence / review / frames exist)
  const lesson = {
    title: 'One Fruit Card',
    vocabulary: [
      { word: 'apple', emoji: '🍎' },
      { word: 'perseverance' },
      { word: 'gratitude' },
    ],
    activity: {
      title: 'Mystery word',
      prompt: 'Guess the word.',
      templates: ['I see a ____.'],
      mysteryHints: [
        'It is a fruit you can eat.',
        'It is round and often red or green.',
        'It starts with A.',
      ],
    },
    sentenceFrames: [],
    warmUp: { question: 'What fruit do you like?', sampleAnswer: 'I like apples.' },
    story: {
      title: 'Snack Time',
      pages: [{ heading: 'Snack', text: 'I eat an apple.', visualTheme: 'kitchen', visualCaption: 'Kid with apple' }],
      comprehensionQuestions: [{ question: 'What do they eat?', sampleAnswer: 'An apple.' }],
      creativeQuestions: [],
    },
    speakingQuestions: [{ question: 'Do you like apples?', sampleAnswer: 'Yes.' }],
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
    if (window.VocabIcons && window.VocabIcons.ready) await window.VocabIcons.ready();
    const boardPlan = window.EdbActivities.buildBoardPlan(lesson, meta);
    const act = (boardPlan.assignments || []).find((a) => a.pageKey === 'activity');
    if (!act || act.recipeId !== 'mysteryHints') {
      throw new Error('expected mysteryHints, got ' + (act && act.recipeId));
    }
    await window.LessonPages.attachBgPicks(lesson, meta, boardPlan);
    const canvases = await window.BoardPreview.renderCanvases(lesson, meta, boardPlan);
    const actIdx = boardPlan.pages.findIndex((p) => p.pageKey === 'activity');
    return {
      dataUrl: canvases[actIdx].toDataURL('image/jpeg', 0.92),
      targetWord: act.ctx && act.ctx.targetWord,
      hints: act.ctx && act.ctx.hints,
    };
  }, { lesson, meta });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(dataUrl.dataUrl.split(',')[1], 'base64'));
  console.log('Wrote', path.relative(ROOT, OUT), {
    targetWord: dataUrl.targetWord,
    hints: dataUrl.hints,
  });

  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
