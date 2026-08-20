/**
 * One-shot debug probe for classical-compose board issues.
 * Writes NDJSON to .cursor/debug-3c9697.log
 */
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG = path.join(ROOT, '.cursor', 'debug-3c9697.log');
const lesson = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/fixtures/classical-compose-lesson.json'), 'utf8')
);
const meta = { level: 'B1', duration: '60', phonics: 'off' };

fs.mkdirSync(path.dirname(LOG), { recursive: true });

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent((req.url || '/').split('?')[0].replace(/^\//, '') || 'index.html');
  const file = path.join(ROOT, 'public', rel);
  if (!file.startsWith(path.join(ROOT, 'public')) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
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
    '.jpg': 'image/jpeg',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
  };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle' });
await page.waitForFunction(
  () =>
    window.LessonPages &&
    window.EdbActivities &&
    window.PropBank &&
    window.VocabIcons &&
    window.SceneBackgrounds
);

const data = await page.evaluate(async ({ lesson, meta }) => {
  await window.PropBank.ready();
  await window.VocabIcons.ready();
  const boardPlan = window.EdbActivities.buildBoardPlan(lesson, meta);
  await window.LessonPages.attachBgPicks(lesson, meta, boardPlan);
  const sections = window.LessonPages.buildSectionList(lesson, meta);
  const picks = boardPlan.bgPicks || [];
  const act = sections.findIndex((s) => (s.tags || []).includes('activity'));
  const title = sections.findIndex((s) => (s.tags || []).includes('title'));
  const hero = (boardPlan.assignments || []).find((a) => a.pageKey === 'activity');
  const words = (lesson.vocabulary || []).map((v) => v.word);
  const vocab = [];
  for (const w of words) {
    const family = window.PropBank.familyFor(lesson);
    const prop = window.PropBank.resolve({ word: w, seed: lesson.title, family, minScore: 3 });
    const curated = window.VocabIcons.isCurated(w);
    const packPath = await window.VocabIcons.pathFor(w);
    vocab.push({
      w,
      prop: prop && prop.key,
      curated,
      pack: packPath && packPath.split('/').pop(),
    });
  }
  const stories = (lesson.story && lesson.story.pages) || [];
  const storyEmojis = stories.map((sp, i) => {
    const cue = [lesson.title, lesson.story && lesson.story.title, sp.visualCaption, sp.heading, sp.text]
      .filter(Boolean)
      .join(' ');
    return { i, cue: cue.slice(0, 140), caption: sp.visualCaption };
  });
  const frames = (lesson.sentenceFrames || []).slice(0, 3);
  const artWinners = [];
  for (const w of words.slice(0, 6)) {
    const family = window.PropBank.familyFor(lesson);
    const prop = window.PropBank.resolve({ word: w, seed: lesson.title, family });
    const pack = await window.VocabIcons.pathFor(w);
    const curated = window.VocabIcons.isCurated(w);
    let winner = 'none';
    if (curated && pack) winner = 'pack:' + pack.split('/').pop();
    else if (prop) winner = 'prop:' + prop.key;
    else if (pack) winner = 'pack:' + pack.split('/').pop();
    artWinners.push({ w, winner, curated });
  }
  const actAssign = (boardPlan.assignments || []).find((a) => a.pageKey === 'activity');
  return {
    titlePick: picks[title] && { type: picks[title].type, name: picks[title].name },
    activityPick: picks[act] && {
      type: picks[act].type,
      name: picks[act].name,
      reused: !!picks[act].reused,
    },
    actPreferFlat: sections[act] && sections[act].preferFlat,
    skipKing: !!(actAssign && actAssign.ctx && actAssign.ctx.skipKing),
    allFlats: picks.map((p, i) => ({ i, type: p.type, name: p.name, set: p.set || null })),
    hero: hero && { recipe: hero.recipeId, heroKey: hero.ctx && hero.ctx.hero && hero.ctx.hero.key },
    kit: boardPlan.kit,
    frames: frames.map((f) => ({ len: String(f).length, text: String(f).slice(0, 90) })),
    storyEmojis,
    vocab,
    artWinners,
  };
}, { lesson, meta });

const lines = [
  { hypothesisId: 'A', message: 'bg+hero', data: { title: data.titlePick, activity: data.activityPick, actPreferFlat: data.actPreferFlat, hero: data.hero } },
  { hypothesisId: 'A2', message: 'all bg picks', data: { picks: data.allFlats } },
  { hypothesisId: 'B', message: 'frames', data: { frames: data.frames } },
  { hypothesisId: 'C', message: 'story cues', data: { storyEmojis: data.storyEmojis } },
  { hypothesisId: 'E', message: 'vocab resolve', data: { vocab: data.vocab, artWinners: data.artWinners } },
].map((o) => JSON.stringify({ sessionId: '3c9697', runId: 'pre-fix', timestamp: Date.now(), ...o }));

fs.writeFileSync(LOG, lines.join('\n') + '\n');
console.log(JSON.stringify(data, null, 2));
console.log('WROTE', LOG);

await browser.close();
server.close();
