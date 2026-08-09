/**
 * Regression gate (S71): an OFF-TOPIC lesson must not surface decorative/character
 * filler props (3D feeling-* faces, gashapon toy blobs) on the activity dock or as
 * story-beat art. Bakes a soccer lesson whose captions name emotions + toys (the
 * exact bait that leaked a 3D "worried" face and a gashapon cyclops), then fails if
 * any docked or story-art prop belongs to a decorative pack the topic does not invite.
 *
 *   node scripts/verify-offtopic-props.mjs
 */
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const rubric = require('./ux-board-rubric.cjs');

// Off-topic soccer lesson. Captions deliberately name an emotion ("felt worried")
// and a toy-ish word ("sunglasses") so a pre-fix bake leaks feeling-*/gashapon art.
const lesson = {
  title: 'A Day with Manchester United',
  topic: 'soccer',
  warmUp: { question: 'What do you like about soccer?', sampleAnswer: 'I like scoring goals.' },
  vocabulary: [
    { word: 'teammate', emoji: '\uD83E\uDDD1\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1', sentence: 'My teammate passed the ball.' },
    { word: 'stadium', emoji: '\uD83C\uDFDF\uFE0F', sentence: 'The stadium was full.' },
    { word: 'practice', emoji: '\u26BD', sentence: 'We practice every day.' },
    { word: 'coach', emoji: '\uD83D\uDCCB', sentence: 'The coach gave advice.' },
    { word: 'effort', emoji: '\uD83D\uDCAA', sentence: 'She made a big effort.' },
  ],
  sentenceFrames: ['My ____ helped me.', 'We went to the ____.', 'It takes ____ to win.'],
  story: {
    title: 'The Big Match',
    pages: [
      { heading: 'At the Stadium', text: 'The team walked into the stadium. Everyone was surprised how big it was.', visualCaption: 'A teammate felt worried before the big game' },
      { heading: 'Hard Practice', text: 'They ran a hard practice. Every teammate gave effort.', visualCaption: 'Cool sunglasses sat on the bench at practice' },
      { heading: 'The Whistle', text: 'The coach blew the whistle. The match began.', visualCaption: 'The coach starts the match' },
    ],
    comprehensionQuestions: [{ question: 'Why did the team win?', sampleAnswer: 'They worked hard.' }],
    creativeQuestions: [],
  },
  speakingQuestions: [{ question: 'Do you play soccer?', sampleAnswer: 'Yes, I do.' }],
  activity: { title: 'Team Talk', prompt: 'Say a sentence about your team.', templates: ['My ____ is great.'] },
  reviewSentences: ['The team gave great effort.'],
};
const meta = { level: 'B1', duration: '60', phonics: 'off' };

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent((req.url || '/').split('?')[0].replace(/^\//, '') || 'index.html');
  const file = path.join(ROOT, 'public', rel);
  if (!file.startsWith(path.join(ROOT, 'public')) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end(); return;
  }
  const ext = path.extname(file);
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.svg': 'image/svg+xml' };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.LessonPages && window.EdbActivities && window.PropBank && window.VocabIcons && window.SceneBackgrounds && window.BoardPreview);

const result = await page.evaluate(async ({ lesson, meta }) => {
  await window.PropBank.ready();
  await window.VocabIcons.ready();
  const PB = window.PropBank;
  // Classification is producer-owned; the gate reuses it as the single source of truth.
  const allowed = PB.decorativePacksFor ? PB.decorativePacksFor(lesson) : new Set();
  const keyPack = (key) => {
    const p = key && PB.all ? PB.all().find((x) => x.key === key) : null;
    return p ? p.pack : null;
  };
  const decoLeak = (key) => {
    if (!key) return null;
    const p = PB.all ? PB.all().find((x) => x.key === key) : null;
    if (!p || !(PB.isDecorativeProp && PB.isDecorativeProp(p))) return null;
    if (allowed.has(p.pack)) return null;
    return { key: p.key, pack: p.pack, role: p.role, tags: p.tags };
  };

  const boardPlan = window.EdbActivities.buildBoardPlan(lesson, meta);
  const actAssign = (boardPlan.assignments || []).find((a) => a.pageKey === 'activity');
  const actPage = (boardPlan.pages || []).find((p) => p.pageKey === 'activity');
  const dockKeys = ((actPage && actPage.unlocked) || [])
    .filter((p) => p.role === 'dockPiece')
    .map((p) => (p.meta && p.meta.propKey) || null)
    .filter(Boolean);

  const rendered = await window.LessonPages.render(lesson, meta, boardPlan);
  const byKey = (rendered.slots && rendered.slots.byKey) || {};
  const storyKeys = [];
  Object.keys(byKey).filter((k) => /^story\d+$/.test(k)).forEach((k) => {
    const el = rendered.pageEls[byKey[k]];
    const slot = el && el.querySelector && el.querySelector('[data-story-art]');
    const key = slot ? (slot.dataset.storyProp || null) : null;
    if (key) storyKeys.push({ page: k, key });
  });
  if (window.LessonPages.cleanup) window.LessonPages.cleanup(rendered.host);

  const dockLeaks = dockKeys.map((k) => decoLeak(k)).filter(Boolean);
  const storyLeaks = storyKeys.map((s) => { const l = decoLeak(s.key); return l ? { ...l, page: s.page } : null; }).filter(Boolean);
  return {
    recipe: actAssign && actAssign.recipeId,
    allowedDecorativePacks: [...allowed],
    dockKeys: dockKeys.map((k) => ({ key: k, pack: keyPack(k) })),
    storyKeys: storyKeys.map((s) => ({ ...s, pack: keyPack(s.key) })),
    dockLeaks,
    storyLeaks,
  };
}, { lesson, meta });

const fails = [];
for (const l of result.dockLeaks) {
  fails.push(`S71: decorative prop "${l.key}" (pack=${l.pack}) docked on activity of an off-topic lesson [${rubric.describe('S71')}]`);
}
for (const l of result.storyLeaks) {
  fails.push(`S71: decorative prop "${l.key}" (pack=${l.pack}) used as story art on ${l.page} of an off-topic lesson [${rubric.describe('S71')}]`);
}

console.log(JSON.stringify({
  title: lesson.title,
  recipe: result.recipe,
  allowedDecorativePacks: result.allowedDecorativePacks,
  dockKeys: result.dockKeys,
  storyKeys: result.storyKeys,
  dockLeaks: result.dockLeaks,
  storyLeaks: result.storyLeaks,
  fails,
  ok: fails.length === 0,
}, null, 2));

await browser.close();
server.close();
process.exit(fails.length ? 1 : 0);
