/**
 * Regenerate one representative baseline for every surviving interactive board
 * grammar. Outputs are review artifacts, not source assets:
 *   tmp/board-type-baselines/<BOARD_TYPE_ID>.jpg
 *   tmp/board-type-baselines/contact.jpg
 *   tmp/board-type-baselines/report.json
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'tmp', 'board-type-baselines');

function fixture(name) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'fixtures', name), 'utf8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function withActivity(input, boardArchetype, payloadKey, payload, title, prompt) {
  const lesson = clone(input);
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

function compactLesson(title, vocabulary) {
  return {
    title,
    warmUp: { question: 'What do you already know?', sampleAnswer: 'A little.' },
    vocabulary: vocabulary.map((word) => ({ word, sentence: `I can use ${word}.` })),
    sentenceFrames: [],
    story: {
      title: 'Mission Story',
      pages: [
        { heading: 'First', text: 'Mia checks the plan.', visualTheme: 'school', visualCaption: 'Mia checks a plan' },
        { heading: 'Next', text: 'Mia packs the bag.', visualTheme: 'school', visualCaption: 'Mia packs a bag' },
        { heading: 'Last', text: 'Mia gets on the bus.', visualTheme: 'city', visualCaption: 'Mia gets on a bus' },
      ],
      comprehensionQuestions: [
        { question: 'What does Mia check?', sampleAnswer: 'The plan.' },
        { question: 'What does Mia pack?', sampleAnswer: 'The bag.' },
      ],
      creativeQuestions: [],
    },
    speakingQuestions: [{ question: 'What would you choose?', sampleAnswer: 'I would choose the book.' }],
    activity: {
      title: 'Your mission',
      prompt: 'Build the answer on the board.',
      templates: ['I chose ___ because ___.'],
    },
    reviewSentences: ['Mia checks the plan.'],
  };
}

const fruit = fixture('fruit-market-lesson.json');
const dentist = fixture('dentist-lesson.json');
const zooPhonics = fixture('zoo-phonics-lesson.json');
const sportsBare = fixture('basketball-bare-lesson.json');
const snackCoat = fixture('snack-coat-day-lesson.json');
const twoPets = fixture('two-pets-choice-lesson.json');
const mysteryApple = fixture('mystery-apple-lesson.json');
const base = compactLesson('School Trip Mission', ['book', 'apple', 'banana', 'milk', 'bus', 'pencil']);

const fixLesson = compactLesson('Daily Routine Grammar', ['school', 'book', 'pencil', 'bus']);
fixLesson.activity = {
  title: 'Fix the sentence',
  prompt: 'Repair one word.',
  templates: [],
  fixSentence: {
    sentence: 'She go to school.',
    wrong: 'go',
    correct: 'goes',
    distractors: ['going', 'went'],
  },
};

const preA1 = compactLesson('Action Time', ['jump', 'sit', 'wave', 'point']);
preA1.activity = { title: 'Listen, Point, Do', prompt: 'Listen and do the action.', templates: [] };

const CASES = [
  // Existing lesson chrome (not activity recipes) — first/last impression for Manus.
  { id: 'title', pageKey: 'title', expected: 'title', pageFormat: true, lesson: fruit, meta: { level: 'A1', duration: 30 } },
  { id: 'wrap', pageKey: 'wrap', expected: 'wrap', pageFormat: true, lesson: fruit, meta: { level: 'A1', duration: 30 } },
  { id: 'matchDock', pageKey: 'newWords', expected: 'matchDock', lesson: fruit, meta: { level: 'A1', duration: 30 } },
  { id: 'frameTiles', pageKey: 'frames', expected: 'frameTiles', lesson: fruit, meta: { level: 'A1', duration: 30 } },
  { id: 'phonicsSoundBoxes', pageKey: 'phonics', expected: 'phonicsSoundBoxes', lesson: zooPhonics, meta: { level: 'A1', duration: 30, phonics: 'on' }, force: true },
  { id: 'coverAnswer', pageKey: 'speaking:0', expected: 'coverAnswer', lesson: fruit, meta: { level: 'A1', duration: 30 } },
  { id: 'preA1TprChoice', pageKey: 'activity', expected: 'preA1TprChoice', lesson: preA1, meta: { level: 'Pre-A1', duration: 30, phonics: 'off' } },
  { id: 'heroProp', pageKey: 'activity', expected: 'heroProp', lesson: dentist, meta: { level: 'A1', duration: 30 } },
  {
    id: 'silhouetteGate',
    pageKey: 'activity',
    expected: 'silhouetteGate',
    lesson: withActivity(fruit, 'silhouetteGate', 'mysteryHints', [
      'It is something you can eat.',
      'It is often round and red or green.',
      'It starts with A.',
    ], 'Mystery shape', 'Guess, peel, and say.'),
    meta: { level: 'A1', duration: 30 },
  },
  {
    id: 'halfTruthBoard',
    pageKey: 'activity',
    expected: 'halfTruthBoard',
    lesson: withActivity(fruit, 'halfTruth', 'halfTruth', {
      claim: 'All of these belong in a fruit basket.',
      verdict: 'half',
      why: 'Carrot is a vegetable.',
      evidence: ['apple', 'banana', 'carrot', 'grape'],
    }, 'Half-truth check'),
    meta: { level: 'A2', duration: 30 },
  },
  {
    id: 'sceneRepair',
    pageKey: 'activity',
    expected: 'sceneRepair',
    lesson: withActivity(fruit, 'sceneRepair', 'sceneRepair', {
      slotLabel: 'Fruit basket',
      wrongWord: 'carrot',
      correctWord: 'apple',
      distractors: ['banana', 'grape'],
    }, 'Find the mistake'),
    meta: { level: 'A1', duration: 30 },
  },
  { id: 'oddOneOut', pageKey: 'activity', expected: 'oddOneOut', lesson: sportsBare, meta: { level: 'A2', duration: 30 }, force: true },
  { id: 'yesNoSort', pageKey: 'activity', expected: 'yesNoSort', lesson: snackCoat, meta: { level: 'A2', duration: 30 }, force: true },
  { id: 'thisOrThat', pageKey: 'activity', expected: 'thisOrThat', lesson: twoPets, meta: { level: 'A1', duration: 30 }, force: true },
  { id: 'fixSentence', pageKey: 'activity', expected: 'fixSentence', lesson: fixLesson, meta: { level: 'A2', duration: 30 } },
  { id: 'mysteryHints', pageKey: 'activity', expected: 'mysteryHints', lesson: mysteryApple, meta: { level: 'A2', duration: 30 }, force: true },
  {
    id: 'sortBins',
    pageKey: 'activity',
    expected: 'sortBins',
    lesson: compactLesson('Things and Ideas', ['ball', 'book', 'effort', 'practice', 'teamwork', 'hope']),
    meta: { level: 'B1', duration: 30 },
    force: true,
  },
  {
    id: 'capacityPack',
    pageKey: 'activity',
    expected: 'capacityPack',
    lesson: withActivity(base, 'capacityPack', 'capacityPack', {
      mission: 'Pack exactly three useful things for the school trip.',
      limit: 3,
      options: ['book', 'apple', 'banana', 'milk', 'pencil'],
      mustInclude: ['book'],
    }, 'Pack the mission'),
    meta: { level: 'A2', duration: 30 },
  },
  {
    id: 'routeMission',
    pageKey: 'activity',
    expected: 'routeMission',
    lesson: withActivity(base, 'routeMission', 'routeMission', {
      mission: 'Help Mia reach the bus on time.',
      steps: ['Check the plan', 'Pack the bag', 'Walk to the stop', 'Get on the bus'],
      answerOrder: ['Check the plan', 'Pack the bag', 'Walk to the stop', 'Get on the bus'],
    }, 'Route mission'),
    meta: { level: 'A2', duration: 30 },
  },
  {
    id: 'transformationLab',
    pageKey: 'activity',
    expected: 'transformationLab',
    lesson: withActivity(base, 'transformationLab', 'transformationLab', {
      question: 'Which change keeps the lunch fresh?',
      before: 'The lunch is warm in an open bag.',
      changes: ['Add a cool pack', 'Leave it in the sun', 'Pour in hot water'],
      correctChange: 'Add a cool pack',
      after: 'The lunch stays cool and fresh.',
    }, 'Transformation lab'),
    meta: { level: 'B1', duration: 30 },
  },
  {
    id: 'evidenceBoard',
    pageKey: 'activity',
    expected: 'evidenceBoard',
    lesson: withActivity(base, 'evidenceBoard', 'evidenceBoard', {
      claim: 'The bus is the best way to reach school today.',
      evidence: [
        { text: 'The bus stops beside the school.', strength: 3 },
        { text: 'It is raining hard.', strength: 2 },
        { text: 'The road is open.', strength: 1 },
      ],
      conclusion: 'The bus is practical because it stops beside the school.',
    }, 'Evidence board'),
    meta: { level: 'B2', duration: 30 },
  },
];

function servePublic() {
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
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.css': 'text/css',
        '.woff2': 'font/woff2',
      };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
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

  const results = [];
  const contactRows = [];
  for (const c of CASES) {
    const row = await page.evaluate(async ({ lesson, meta, pageKey, expected, force, id, pageFormat }) => {
      await window.PropBank.ready();
      await window.VocabIcons.ready();
      const boardPlan = window.EdbActivities.buildBoardPlan(lesson, meta);

      // Title / wrap are existing page formats, not interaction recipes.
      if (pageFormat) {
        await window.LessonPages.attachBgPicks(lesson, meta, boardPlan);
        const canvases = await window.BoardPreview.renderCanvases(lesson, meta, boardPlan);
        const idx = boardPlan.pages.findIndex((p) => p.pageKey === pageKey);
        if (idx < 0 || !canvases[idx]) {
          return { ok: false, id, expected, actual: null, error: `missing page-format canvas for ${pageKey}` };
        }
        const layoutPage = boardPlan.pages[idx];
        return {
          ok: true,
          id,
          recipeId: expected,
          pageKey,
          forced: false,
          dataUrl: canvases[idx].toDataURL('image/jpeg', 0.9),
          locked: (layoutPage.locked || []).length,
          unlocked: (layoutPage.unlocked || []).length,
          notes: [`pageFormat:${expected}`],
        };
      }

      let assignment = (boardPlan.assignments || []).find((a) => a.pageKey === pageKey);
      let forced = false;

      if ((!assignment || assignment.recipeId !== expected) && force) {
        let forceCtx = {};
        const art = boardPlan.vocabArt || { matchable: [] };
        if (expected === 'phonicsSoundBoxes') {
          forceCtx = { meta };
        } else if (expected === 'oddOneOut') {
          forceCtx = window.EdbActivities.resolveOddOneOut(lesson, art) || {
            options: ['ball', 'team', 'score', 'court'],
            odd: 'score',
            rows: window.EdbActivities.picturedMatchableRows(art),
            source: 'baseline',
            ruleHint: 'Which one is an idea or result, not a person, place, or thing?',
          };
        } else if (expected === 'yesNoSort') {
          forceCtx = window.EdbActivities.resolveYesNoSort(lesson, art, meta) || {
            options: ['apple', 'banana', 'hat', 'coat'],
            yes: ['apple', 'banana'],
            no: ['hat', 'coat'],
            rows: window.EdbActivities.picturedMatchableRows(art),
            question: 'Can you eat it?',
            ruleHint: 'YES = food · NO = something you wear',
            source: 'baseline',
          };
        } else if (expected === 'thisOrThat') {
          forceCtx = window.EdbActivities.resolveThisOrThat(lesson, art, meta) || {
            options: ['dog', 'cat'],
            rows: window.EdbActivities.picturedMatchableRows(art),
            frame: 'I would choose ____ because ____.',
            source: 'baseline',
          };
        } else if (expected === 'mysteryHints') {
          const target = window.EdbActivities.pickMysteryTarget(art) || {
            word: 'apple',
            glyph: '🍎',
            matchable: true,
          };
          forceCtx = {
            targetWord: target.word,
            artPath: target.artSrc || null,
            vocabArtRow: target,
            hints: window.EdbActivities.resolveMysteryHints(target.word, lesson),
          };
        }
        boardPlan.assignments = (boardPlan.assignments || []).filter((a) => a.pageKey !== pageKey);
        assignment = { pageKey, recipeId: expected, ctx: forceCtx };
        boardPlan.assignments.push(assignment);
        const idx = boardPlan.pages.findIndex((p) => p.pageKey === pageKey);
        if (idx < 0) throw new Error(`cannot force missing page ${pageKey}`);
        const pageType = window.EdbActivities.pageTypeForKey(pageKey);
        const layoutPage = window.EdbLayout.createPage(pageType);
        layoutPage.pageKey = pageKey;
        layoutPage.pageIndex = idx;
        window.EdbActivities.applyToPage(lesson, layoutPage, pageKey, boardPlan);
        boardPlan.pages[idx] = layoutPage;
        forced = true;
      }

      if (!assignment || assignment.recipeId !== expected) {
        return {
          ok: false,
          id,
          expected,
          actual: assignment && assignment.recipeId || null,
          error: `expected ${expected} on ${pageKey}`,
        };
      }

      await window.LessonPages.attachBgPicks(lesson, meta, boardPlan);
      const canvases = await window.BoardPreview.renderCanvases(lesson, meta, boardPlan);
      const idx = boardPlan.pages.findIndex((p) => p.pageKey === pageKey);
      if (idx < 0 || !canvases[idx]) {
        return { ok: false, id, expected, actual: assignment.recipeId, error: `missing canvas for ${pageKey}` };
      }
      const layoutPage = boardPlan.pages[idx];
      return {
        ok: true,
        id,
        recipeId: assignment.recipeId,
        pageKey,
        forced,
        dataUrl: canvases[idx].toDataURL('image/jpeg', 0.9),
        locked: (layoutPage.locked || []).length,
        unlocked: (layoutPage.unlocked || []).length,
        notes: (layoutPage.notes || []).filter((n) => /recipe:|Limit:|Steps:|Count:|Target:/i.test(String(n))),
      };
    }, Object.assign({}, c, { pageFormat: !!c.pageFormat }));

    if (!row.ok) {
      results.push(row);
      console.error('FAIL', c.id, row.actual, row.error);
      continue;
    }
    const outPath = path.join(OUT_DIR, `${c.id}.jpg`);
    fs.writeFileSync(outPath, Buffer.from(row.dataUrl.split(',')[1], 'base64'));
    const result = {
      id: c.id,
      ok: true,
      recipeId: row.recipeId,
      pageKey: row.pageKey,
      forced: row.forced,
      locked: row.locked,
      unlocked: row.unlocked,
      notes: row.notes,
      path: path.relative(ROOT, outPath).replace(/\\/g, '/'),
    };
    results.push(result);
    contactRows.push({ id: c.id, dataUrl: row.dataUrl, forced: row.forced });
    console.log('OK', c.id, result.path, row.forced ? '(forced fallback baseline)' : '');
  }

  const reportPath = path.join(OUT_DIR, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: results.filter((r) => r.ok).length,
    expectedCount: CASES.length,
    results,
  }, null, 2));

  const contactHtml = `<!doctype html><html><head><style>
    body{margin:0;padding:20px;background:#e2e8f0;font-family:Arial,sans-serif}
    h1{font-size:28px;color:#0f172a;margin:0 0 18px}
    .grid{display:grid;grid-template-columns:repeat(2,640px);gap:18px}
    .card{background:#fff;padding:10px;border-radius:12px;box-shadow:0 2px 8px #64748b44}
    .label{font-size:20px;font-weight:800;color:#1e293b;margin:0 0 8px}
    img{display:block;width:620px;height:auto;border:1px solid #cbd5e1}
  </style></head><body><h1>Board Type Baselines — ${contactRows.length}/${CASES.length}</h1>
  <div class="grid">${contactRows.map((row) =>
    `<div class="card"><div class="label">${row.id}${row.forced ? ' · fallback' : ''}</div><img src="${row.dataUrl}"></div>`
  ).join('')}</div></body></html>`;
  await page.setViewportSize({ width: 1330, height: 900 });
  await page.setContent(contactHtml, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(OUT_DIR, 'contact.jpg'), fullPage: true, type: 'jpeg', quality: 88 });

  await browser.close();
  server.close();
  const failed = results.filter((r) => !r.ok);
  console.log('Wrote', path.relative(ROOT, reportPath), `(${results.length - failed.length}/${CASES.length})`);
  console.log('Wrote', path.relative(ROOT, path.join(OUT_DIR, 'contact.jpg')));
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
