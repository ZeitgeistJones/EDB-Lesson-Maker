/**
 * Producer quality gate for classical-compose style lessons.
 * Bakes pages, asserts producer invariants, writes debug NDJSON + page JPGs.
 *
 *   node scripts/verify-classical-compose.mjs
 *   node scripts/verify-classical-compose.mjs --fixture=classical-compose-lesson.json
 */
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG = path.join(ROOT, '.cursor', 'debug-3c9697.log');
const OUT = path.join(ROOT, 'tmp', 'board-bg-verify', 'classical-compose');

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function logLine(hypothesisId, message, data) {
  fs.appendFileSync(
    LOG,
    JSON.stringify({
      sessionId: '3c9697',
      runId: 'producer-verify',
      timestamp: Date.now(),
      hypothesisId,
      message,
      data,
    }) + '\n'
  );
}

const fixtureName = arg('fixture', 'classical-compose-lesson.json');
const lesson = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/fixtures', fixtureName), 'utf8'));
// Similar-but-not-identical title so we aren't fixture-locked.
if (arg('retitle', '1') !== '0') {
  lesson.title = 'Writing a Symphony for the Orchestra';
}

const meta = { level: 'B1', duration: '60', phonics: 'off' };
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.dirname(LOG), { recursive: true });
if (fs.existsSync(LOG)) fs.writeFileSync(LOG, '');

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
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle' });
await page.waitForFunction(
  () =>
    window.LessonPages &&
    window.EdbActivities &&
    window.PropBank &&
    window.VocabIcons &&
    window.SceneBackgrounds &&
    window.BoardPreview
);

const result = await page.evaluate(async ({ lesson, meta }) => {
  await window.PropBank.ready();
  await window.VocabIcons.ready();
  const boardPlan = window.EdbActivities.buildBoardPlan(lesson, meta);
  await window.LessonPages.attachBgPicks(lesson, meta, boardPlan);
  const sections = window.LessonPages.buildSectionList(lesson, meta);
  const picks = boardPlan.bgPicks || [];
  const actAssign = (boardPlan.assignments || []).find((a) => a.pageKey === 'activity');
  const actIdx = sections.findIndex((s) => (s.tags || []).includes('activity'));
  const titleIdx = sections.findIndex((s) => (s.tags || []).includes('title'));
  const framesIdx = sections.findIndex((s) => (s.tags || []).includes('frames'));
  const storyIdxs = sections
    .map((s, i) => ((s.tags || []).includes('story') ? i : -1))
    .filter((i) => i >= 0);
  const words = (lesson.vocabulary || []).map((v) => (typeof v === 'string' ? v : v.word)).filter(Boolean);

  const artWinners = [];
  for (const w of words.slice(0, 6)) {
    const curated = window.VocabIcons.isCurated(w);
    const pack = await window.VocabIcons.pathFor(w);
    const prop = window.PropBank.resolve({
      word: w,
      seed: lesson.title,
      family: window.PropBank.familyFor(lesson),
    });
    let winner = 'none';
    if (curated && pack) winner = 'pack:' + pack.split('/').pop();
    else if (prop) winner = 'prop:' + prop.key;
    else if (pack) winner = 'pack:' + pack.split('/').pop();
    artWinners.push({ w, winner, curated });
  }

  // themeEmoji via story cue (mirror producer)
  function themeEmoji(theme) {
    const t = String(theme || '').toLowerCase();
    if (/\b(volcano|volcanic|crater|lava|eruption|ash|geothermal|magma|seismic)\b/.test(t)) return '🌋';
    if (/\b(music|compose|composer|composition|orchestra|melody|harmony|guitar|piano|violin|concert|classical|symphony|strum|tempo|rhythm|performance)\b/.test(t)) return '🎼';
    if (/\b(living room|home|house|apartment|bedroom)\b/.test(t)) return '🏠';
    return '📖';
  }
  const stories = (lesson.story && lesson.story.pages) || [];
  const storyEmojis = stories.map((sp, i) => {
    const cue = [lesson.title, lesson.story && lesson.story.title, sp.visualCaption, sp.heading, sp.text]
      .filter(Boolean)
      .join(' ');
    return { i, emoji: themeEmoji(cue), caption: sp.visualCaption };
  });

  const frames = (lesson.sentenceFrames || []).slice(0, 3);
  const longest = Math.max(0, ...frames.map((f) => String(f).length));
  const fontPx = longest > 75 ? 26 : longest > 55 ? 30 : 34;

  const canvases = await window.BoardPreview.renderCanvases(lesson, meta, boardPlan);
  const pages = [];
  for (let i = 0; i < canvases.length; i++) {
    pages.push({
      index: i,
      key: (boardPlan.pages && boardPlan.pages[i] && boardPlan.pages[i].pageKey) || String(i),
      dataUrl: canvases[i].toDataURL('image/jpeg', 0.88),
    });
  }

  const actPage = (boardPlan.pages || []).find((p) => p.pageKey === 'activity');
  const kingPieces = ((actPage && actPage.unlocked) || [])
    .concat((actPage && actPage.locked) || [])
    .filter((p) => p.role === 'stageHero' || p.role === 'heroPart' || (p.meta && p.meta.stageKing))
    .map((p) => (p.meta && p.meta.propKey) || p.asset || p.role);

  const dockPieces = ((actPage && actPage.unlocked) || [])
    .filter((p) => p.role === 'dockPiece')
    .map((p) => (p.meta && p.meta.propKey) || p.asset);

  window.LessonPages.normalizeLesson(lesson);
  const compQs = window.LessonPages.comprehensionQuestions(lesson) || [];

  // Pedagogy chrome (Manus S19–S21) — inspect DOM pages from LessonPages.render.
  const rendered = await window.LessonPages.render(lesson, meta, boardPlan);
  const byKey = (rendered.slots && rendered.slots.byKey) || {};
  const actDom = rendered.pageEls[byKey.activity];
  const warmDom = rendered.pageEls[byKey.warm];
  const actText = (actDom && actDom.textContent) || '';
  const warmText = (warmDom && warmDom.textContent) || '';
  const sampleLeak = /Teacher sample/i.test(warmText)
    || (lesson.warmUp && lesson.warmUp.sampleAnswer && warmText.includes(String(lesson.warmUp.sampleAnswer)));
  if (window.LessonPages.cleanup) window.LessonPages.cleanup(rendered.host);

  return {
    title: lesson.title,
    titlePick: picks[titleIdx],
    activityPick: picks[actIdx],
    skipKing: !!(actAssign && actAssign.ctx && actAssign.ctx.skipKing),
    heroKey: actAssign && actAssign.ctx && actAssign.ctx.hero && actAssign.ctx.hero.key,
    recipe: actAssign && actAssign.recipeId,
    kingPieces,
    dockCount: dockPieces.length,
    dockSample: dockPieces.slice(0, 8),
    compCount: compQs.length,
    activityHintHasToys: /\btoys\b/i.test(actText),
    activityHintHasWriteOrSay: /write or say|say or write|then say|then write/i.test(actText),
    warmSampleLeak: !!sampleLeak,
    flatNames: picks.filter((p) => p.type === 'flat').map((p) => p.name),
    houseLeaks: picks.filter((p) => p.type === 'flat' && /^house-/.test(p.name)).map((p) => p.name),
    artWinners,
    storyEmojis,
    frames: { count: frames.length, longest, fontPx },
    pages,
    picks: picks.map((p, i) => ({ i, type: p.type, name: p.name })),
  };
}, { lesson, meta });

const fails = [];
if (!(result.titlePick && result.titlePick.type === 'scene' && /terrace|moonlit|piano/i.test(result.titlePick.name))) {
  fails.push('title should be classical terrace scene');
}
if (!(result.activityPick && result.activityPick.type === 'scene' && /terrace|moonlit|piano/i.test(result.activityPick.name))) {
  fails.push('activity should reuse terrace scene');
}
if (!result.skipKing) fails.push('activity must skipKing (no second piano)');
if ((result.kingPieces || []).some((k) => /piano/i.test(String(k)))) {
  fails.push('activity still has piano king piece: ' + JSON.stringify(result.kingPieces));
}
if ((result.dockCount || 0) < 10) fails.push('activity dock too thin: ' + result.dockCount);
if ((result.compCount || 0) < 2) fails.push('comprehension questions missing after normalize: ' + result.compCount);
if (result.activityHintHasToys) fails.push('activity hint still says toys');
if (!result.activityHintHasWriteOrSay) fails.push('activity hint missing speak/write production cue');
if (result.warmSampleLeak) fails.push('warm-up still leaks teacher sample to students');
if (result.houseLeaks.length) fails.push('house flats leaked: ' + result.houseLeaks.join(','));
if (result.artWinners.some((w) => !String(w.winner).startsWith('pack:'))) {
  fails.push('vocab art must prefer pack: ' + JSON.stringify(result.artWinners));
}
if (result.storyEmojis.some((s) => s.emoji === '🏠')) fails.push('story emoji still house');
if (result.frames.longest > 75 && result.frames.fontPx > 28) fails.push('long frames font not shrunk');

for (const p of result.pages) {
  const b64 = p.dataUrl.replace(/^data:image\/jpeg;base64,/, '');
  fs.writeFileSync(path.join(OUT, `page-${p.index}-${p.key}.jpg`), Buffer.from(b64, 'base64'));
}

    logLine('VERIFY', 'producer invariants', {
  title: result.title,
  titlePick: result.titlePick && { type: result.titlePick.type, name: result.titlePick.name },
  activityPick: result.activityPick && { type: result.activityPick.type, name: result.activityPick.name },
  skipKing: result.skipKing,
  heroKey: result.heroKey,
  kingPieces: result.kingPieces,
  houseLeaks: result.houseLeaks,
  artWinners: result.artWinners,
  storyEmojis: result.storyEmojis,
  frames: result.frames,
  fails,
  out: OUT,
});

console.log(JSON.stringify({
  title: result.title,
  titlePick: result.titlePick && { type: result.titlePick.type, name: result.titlePick.name },
  activityPick: result.activityPick && { type: result.activityPick.type, name: result.activityPick.name },
  skipKing: result.skipKing,
  heroKey: result.heroKey,
  kingPieces: result.kingPieces,
  dockCount: result.dockCount,
  dockSample: result.dockSample,
  houseLeaks: result.houseLeaks,
  artWinners: result.artWinners,
  storyEmojis: result.storyEmojis,
  frames: result.frames,
  pageFiles: result.pages.map((p) => `page-${p.index}-${p.key}.jpg`),
  fails,
  ok: fails.length === 0,
}, null, 2));

await browser.close();
server.close();
process.exit(fails.length ? 1 : 0);
