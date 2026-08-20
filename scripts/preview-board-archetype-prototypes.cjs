/**
 * Bake the three board-archetype prototypes across a small CEFR matrix.
 * Previews land in tmp/board-archetype-prototypes/ (gitignored).
 *
 *   node scripts/preview-board-archetype-prototypes.cjs
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'tmp', 'board-archetype-prototypes');
const PORT = 8900 + Math.floor(Math.random() * 600);

function loadFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'fixtures', name), 'utf8'));
}

function withArchetype(lesson, archetype, extras) {
  const out = JSON.parse(JSON.stringify(lesson));
  if (!out.activity || typeof out.activity !== 'object') out.activity = {};
  out.activity.boardArchetype = archetype;
  if (extras) Object.assign(out.activity, extras);
  // Avoid frames twining fixSentence when we need pictured activity recipes.
  if (archetype === 'silhouetteGate' || archetype === 'halfTruth' || archetype === 'sceneRepair') {
    out.sentenceFrames = out.sentenceFrames || [];
  }
  return out;
}

const CASES = [
  {
    slug: 'a1-fruit-silhouetteGate',
    meta: { level: 'A1', duration: '30' },
    expected: 'silhouetteGate',
    lesson: withArchetype(loadFixture('fruit-market-lesson.json'), 'silhouetteGate', {
      title: 'Mystery shape',
      prompt: 'Guess the shape. Peel hints if you need help.',
      mysteryHints: [
        'It is something you can eat.',
        'It is round and often red or green.',
        'It starts with A.',
      ],
    }),
  },
  {
    slug: 'a2-fruit-halfTruth',
    meta: { level: 'A2', duration: '30' },
    expected: 'halfTruthBoard',
    lesson: withArchetype(loadFixture('fruit-market-lesson.json'), 'halfTruth', {
      title: 'Half-truth check',
      prompt: 'Is the claim true, half true, or false?',
      halfTruth: {
        claim: 'All of these are fruit.',
        verdict: 'half',
        why: 'Carrot is a vegetable, not a fruit.',
        evidence: ['apple', 'banana', 'carrot', 'grape'],
      },
    }),
  },
  {
    slug: 'b1-sports-sceneRepair',
    meta: { level: 'B1', duration: '30' },
    expected: 'sceneRepair',
    lesson: withArchetype(loadFixture('sports-and-games-lesson.json'), 'sceneRepair', {
      title: 'Find the mistake',
      prompt: 'The board put one wrong piece on purpose. Fix it.',
      sceneRepair: {
        slotLabel: 'Sports kit',
        wrongWord: 'apple',
        correctWord: 'ball',
        distractors: ['whistle', 'racket'],
      },
    }),
  },
  {
    slug: 'b2-abstract-halfTruth',
    meta: { level: 'B2', duration: '30' },
    expected: 'halfTruthBoard',
    lesson: withArchetype(loadFixture('abstract-words-lesson.json'), 'halfTruth', {
      title: 'Claim check',
      prompt: 'Judge the claim with the evidence you can see.',
      halfTruth: {
        claim: 'Every word here describes a tidy home.',
        verdict: 'half',
        why: 'Cramped and cluttered are not tidy.',
        evidence: ['tidy', 'spacious', 'cramped', 'cluttered'],
      },
    }),
  },
  {
    slug: 'prea1-fruit-silhouetteGate',
    meta: { level: 'A1', duration: '30' },
    expected: 'silhouetteGate',
    note: 'Pre-A1 live path forces TPR; use A1 familiar topic for silhouette prototype',
    lesson: withArchetype({
      title: 'Fruit Shapes',
      warmUp: { question: 'What fruit do you see?', sampleAnswer: 'An apple.' },
      vocabulary: [
        { word: 'apple', emoji: '🍎', sentence: 'I see an apple.' },
        { word: 'banana', emoji: '🍌', sentence: 'I see a banana.' },
        { word: 'grape', emoji: '🍇', sentence: 'I see a grape.' },
      ],
      sentenceFrames: [],
      story: {
        title: 'Fruit',
        pages: [{ heading: 'Look', text: 'I see an apple.', visualTheme: 'kitchen', visualCaption: 'Apple' }],
        comprehensionQuestions: [{ question: 'What do you see?', sampleAnswer: 'An apple.' }],
        creativeQuestions: [],
      },
      speakingQuestions: [{ question: 'What fruit is it?', sampleAnswer: 'It is an apple.' }],
      activity: {
        boardArchetype: 'silhouetteGate',
        title: 'Mystery shape',
        prompt: 'Guess. Peel. Say.',
        mysteryHints: [
          'You can eat it.',
          'It is round.',
          'It starts with A.',
        ],
        templates: ['It is a ____.'],
      },
      reviewSentences: ['I see an apple.'],
    }, 'silhouetteGate'),
  },
];

function servePublic() {
  return new Promise((resolve) => {
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
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
      };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await servePublic();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() =>
    window.LessonPages && window.EdbActivities && window.BoardPreview && window.PropBank
  );

  const results = [];
  for (const c of CASES) {
    const row = await page.evaluate(async ({ lesson, meta, expected, slug }) => {
      await window.PropBank.ready();
      if (window.VocabIcons && window.VocabIcons.ready) await window.VocabIcons.ready();
      const boardPlan = window.EdbActivities.buildBoardPlan(lesson, meta);
      const act = (boardPlan.assignments || []).find((a) => a.pageKey === 'activity');
      const recipeId = act && act.recipeId;
      if (recipeId !== expected) {
        return {
          ok: false,
          slug,
          recipeId: recipeId || null,
          expected,
          error: `expected ${expected}, got ${recipeId}`,
        };
      }
      await window.LessonPages.attachBgPicks(lesson, meta, boardPlan);
      const canvases = await window.BoardPreview.renderCanvases(lesson, meta, boardPlan);
      const actIdx = boardPlan.pages.findIndex((p) => p.pageKey === 'activity');
      if (actIdx < 0 || !canvases[actIdx]) {
        return { ok: false, slug, recipeId, expected, error: 'no activity canvas' };
      }
      return {
        ok: true,
        slug,
        recipeId,
        expected,
        dataUrl: canvases[actIdx].toDataURL('image/jpeg', 0.92),
        ctxKeys: act.ctx ? Object.keys(act.ctx) : [],
        notes: (boardPlan.pages[actIdx] && boardPlan.pages[actIdx].notes) || [],
      };
    }, c);

    if (!row.ok) {
      results.push({ slug: c.slug, ok: false, recipeId: row.recipeId, error: row.error });
      console.error('FAIL', c.slug, row.error);
      continue;
    }
    const outName = `${c.slug}.jpg`;
    const outPath = path.join(OUT_DIR, outName);
    fs.writeFileSync(outPath, Buffer.from(row.dataUrl.split(',')[1], 'base64'));
    results.push({
      slug: c.slug,
      ok: true,
      recipeId: row.recipeId,
      path: path.relative(ROOT, outPath).replace(/\\/g, '/'),
      notes: row.notes.filter((n) => /recipe:|authored|intentional|halfTruth|mysteryTarget/i.test(String(n))),
    });
    console.log('OK', outName, row.recipeId);
  }

  const reportPath = path.join(OUT_DIR, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  console.log('Wrote', path.relative(ROOT, reportPath));

  const failed = results.filter((r) => !r.ok);
  await browser.close();
  server.close();
  if (failed.length) {
    console.error(`${failed.length} case(s) failed`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
