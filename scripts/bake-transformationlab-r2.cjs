/**
 * Standalone single-board bake for the transformationLab Manus loop, Round 2+.
 * Renders ONE transformationLab activity board with a topic that differs
 * materially from Round 1 (lunch-cooling, B1) to stress-test generalization.
 * Does not touch scripts/preview-board-type-baselines.cjs (shared by other
 * board-type loops that may be mid-edit).
 *
 *   node scripts/bake-transformationlab-r2.cjs
 *
 * Writes tmp/manus-board-loops/transformationLab/round-02-<topic>.jpg
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-board-loops', 'transformationLab');

function compactLesson(title, vocabulary) {
  return {
    title,
    warmUp: { question: 'What do you already know?', sampleAnswer: 'A little.' },
    vocabulary: vocabulary.map((word) => ({ word, sentence: `I can use ${word}.` })),
    sentenceFrames: [],
    story: {
      title: 'Mission Story',
      pages: [
        { heading: 'First', text: 'Sam checks the garden.', visualTheme: 'garden', visualCaption: 'Sam checks the garden' },
        { heading: 'Next', text: 'Sam waters the plant.', visualTheme: 'garden', visualCaption: 'Sam waters a plant' },
        { heading: 'Last', text: 'Sam watches it grow.', visualTheme: 'garden', visualCaption: 'Sam watches it grow' },
      ],
      comprehensionQuestions: [
        { question: 'What does Sam check?', sampleAnswer: 'The garden.' },
        { question: 'What does Sam do?', sampleAnswer: 'Water the plant.' },
      ],
      creativeQuestions: [],
    },
    speakingQuestions: [{ question: 'What would you choose?', sampleAnswer: 'I would choose the cool water.' }],
    activity: {
      title: 'Your mission',
      prompt: 'Build the answer on the board.',
      templates: ['I chose ___ because ___.'],
    },
    reviewSentences: ['Sam checks the garden.'],
  };
}

function withActivity(input, boardArchetype, payloadKey, payload, title, prompt) {
  const lesson = JSON.parse(JSON.stringify(input));
  lesson.activity = Object.assign({}, lesson.activity || {}, {
    title: title || 'Your mission',
    prompt: prompt || 'Build the answer on the board.',
    templates: ['I chose ___ because ___.'],
    boardArchetype,
    [payloadKey]: payload,
  });
  lesson.sentenceFrames = [];
  return lesson;
}

// R1 was lunch-cooling (B1, food/heat domain). R2 stress-tests a different
// domain (garden/plant care) at B2 with genuine trade-off reasoning: the
// wrong choices are plausible, not silly, so the learner must reason about
// WHY the cause produces the result, not just recognize a longer label.
const base = compactLesson('Garden Watering Mystery', ['plant', 'leaf', 'water', 'sun', 'root', 'soil']);
const lesson = withActivity(base, 'transformationLab', 'transformationLab', {
  question: 'Which change makes the drooping tomato plant recover?',
  before: 'The tomato plant\u2019s leaves are drooping in the hot afternoon.',
  changes: [
    'Water it now in the cool evening shade',
    'Water it right away under the hot midday sun',
    'Skip water and add extra fertilizer instead',
  ],
  correctChange: 'Water it now in the cool evening shade',
  after: 'By morning the tomato plant stands tall with firm green leaves.',
}, 'Garden Watering Mystery');
const meta = { level: 'B2', duration: 30 };

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
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await servePublic();
  const port = server.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 850 } });
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() =>
    window.LessonPages && window.EdbActivities && window.BoardPreview
    && window.PropBank && window.VocabIcons
  );

  const row = await page.evaluate(async ({ lesson, meta }) => {
    await window.PropBank.ready();
    await window.VocabIcons.ready();
    const boardPlan = window.EdbActivities.buildBoardPlan(lesson, meta);
    const pageKey = 'activity';
    const assignment = (boardPlan.assignments || []).find((a) => a.pageKey === pageKey);
    if (!assignment || assignment.recipeId !== 'transformationLab') {
      return { ok: false, error: `expected transformationLab, got ${assignment && assignment.recipeId}` };
    }
    await window.LessonPages.attachBgPicks(lesson, meta, boardPlan);
    const canvases = await window.BoardPreview.renderCanvases(lesson, meta, boardPlan);
    const idx = boardPlan.pages.findIndex((p) => p.pageKey === pageKey);
    if (idx < 0 || !canvases[idx]) return { ok: false, error: 'missing canvas' };
    const layoutPage = boardPlan.pages[idx];
    return {
      ok: true,
      dataUrl: canvases[idx].toDataURL('image/jpeg', 0.92),
      notes: layoutPage.notes || [],
    };
  }, { lesson, meta });

  await browser.close();
  server.close();

  if (!row.ok) {
    console.error('FAIL', row.error);
    process.exit(1);
  }

  const outPath = path.join(OUT_DIR, 'round-02-garden-watering.jpg');
  fs.writeFileSync(outPath, Buffer.from(row.dataUrl.split(',')[1], 'base64'));
  console.log('OK', path.relative(ROOT, outPath).replace(/\\/g, '/'));
  console.log('notes:', row.notes.join(' | '));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
