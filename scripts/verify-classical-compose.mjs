/**
 * Producer quality gate for classical-compose style lessons.
 * Bakes pages, asserts producer invariants, writes debug NDJSON + page JPGs.
 *
 *   node scripts/verify-classical-compose.mjs
 *   node scripts/verify-classical-compose.mjs --fixture=classical-compose-lesson.json
 *   node scripts/verify-classical-compose.mjs --story-art=auto   # apply disk cache if present
 *   node scripts/verify-classical-compose.mjs --story-art=1      # generate if miss (costs Gemini)
 */
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const LOG = path.join(ROOT, '.cursor', 'debug-3c9697.log');
const OUT = path.join(ROOT, 'tmp', 'board-bg-verify', 'classical-compose');

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
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

loadEnv();
const fixtureName = arg('fixture', 'classical-compose-lesson.json');
const lesson = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/fixtures', fixtureName), 'utf8'));
// Similar-but-not-identical title so we aren't fixture-locked.
if (arg('retitle', '1') !== '0') {
  lesson.title = 'Writing a Symphony for the Orchestra';
}

const meta = { level: 'B1', duration: '60', phonics: 'off' };
const storyArtMode = String(arg('story-art', process.env.STORY_ART_BAKE || 'auto')).toLowerCase();
let storyArtResult = null;
let storyArtMeta = { mode: storyArtMode, applied: 0, cacheKey: null, cacheHit: false };
if (storyArtMode !== '0' && storyArtMode !== 'off' && storyArtMode !== 'false') {
  try {
    const storyArtApi = require('../api/generate-story-art.js');
    const pages = ((lesson.story && lesson.story.pages) || []).slice(0, 3).map((p, i) => ({
      index: i,
      heading: p.heading || '',
      text: p.text || '',
      visualCaption: p.visualCaption || p.visualTheme || '',
    }));
    const cacheKey = storyArtApi.cacheKeyFor(lesson.title || 'Story', meta.level, pages);
    storyArtMeta.cacheKey = cacheKey;
    storyArtResult = storyArtApi.loadCachedResult(cacheKey);
    if (storyArtResult) {
      storyArtMeta.cacheHit = true;
    } else if (storyArtMode === '1' || storyArtMode === 'true' || storyArtMode === 'on' || storyArtMode === 'gen') {
      const out = { statusCode: 200, body: null };
      const res = {
        setHeader() {},
        status(code) { out.statusCode = code; return this; },
        json(payload) { out.body = payload; return this; },
      };
      await storyArtApi(
        { method: 'POST', body: { title: lesson.title || 'Story', level: meta.level, pages } },
        res
      );
      if (out.statusCode < 400 && out.body && Array.isArray(out.body.pages)) {
        storyArtResult = out.body;
        storyArtMeta.cacheHit = !!out.body.cacheHit;
      }
    }
    if (storyArtResult) meta.storyArt = storyArtResult;
  } catch (err) {
    storyArtMeta.error = err.message || String(err);
  }
}
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.dirname(LOG), { recursive: true });
// Drop stale page JPGs so Manus pickImages cannot attach an old wrap/activity sibling.
for (const n of fs.readdirSync(OUT)) {
  if (/^page-\d+-.+\.(jpe?g|png)$/i.test(n)) {
    try { fs.unlinkSync(path.join(OUT, n)); } catch { /* ignore */ }
  }
}
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
  let storyArtApplied = 0;
  if (meta && meta.storyArt && window.LessonPages.applyStoryArt) {
    storyArtApplied = window.LessonPages.applyStoryArt(rendered.pageEls, meta.storyArt) || 0;
  }
  const byKey = (rendered.slots && rendered.slots.byKey) || {};
  const actDom = rendered.pageEls[byKey.activity];
  const warmDom = rendered.pageEls[byKey.warm];
  const titleDom = rendered.pageEls[byKey.title];
  const framesDom = rendered.pageEls[byKey.frames];
  const actText = (actDom && actDom.textContent) || '';
  const warmText = (warmDom && warmDom.textContent) || '';
  const titleText = (titleDom && titleDom.textContent) || '';
  const framesText = (framesDom && framesDom.textContent) || '';
  const sampleLeak = /Teacher sample/i.test(warmText)
    || (lesson.warmUp && lesson.warmUp.sampleAnswer && warmText.includes(String(lesson.warmUp.sampleAnswer)));

  const boardVocab = words.slice(0, 6);
  const aimsMissing = boardVocab.filter((w) => !new RegExp(`\\b${w}\\b`, 'i').test(titleText));
  const hasGrammarAim = /grammar aim/i.test(titleText);
  const grammarClaimsFirstOnly = /first[- ]conditional/i.test(titleText)
    && !/second[- ]conditional|hypothetical|would|opinion/i.test(titleText)
    && (lesson.sentenceFrames || []).some((f) => /\bwould\b/i.test(String(f)));
  const framesNeedSecond = (lesson.sentenceFrames || []).some(
    (f) => /\bwould\b/i.test(String(f)) && /\bif\b/i.test(String(f))
  );
  const grammarNamesSecond = /second[- ]conditional/i.test(titleText);
  const grammarMissingSecondLabel = framesNeedSecond && hasGrammarAim && !grammarNamesSecond;
  const aimsOrphans = [];
  const aimsMatch = titleText.match(/Aims:\s*use\s+([^.]+)/i);
  if (aimsMatch) {
    const listed = aimsMatch[1].split(/,/).map((s) => s.trim()).filter(Boolean)
      .map((s) => s.replace(/\s+to talk(?: and read)? about.*$/i, '').trim());
    listed.forEach((w) => {
      if (w && !boardVocab.some((b) => b.toLowerCase() === w.toLowerCase())) {
        aimsOrphans.push(w);
      }
    });
  }
  // S48 — story boards should name receptive reading in Aims (not talk-only).
  const aimsHasRead = /\bread\b/i.test(titleText);
  const creativeText = ((lesson.story && lesson.story.creativeQuestions) || [])
    .map((q) => (typeof q === 'string' ? q : (q && (q.question || q.prompt)) || ''))
    .join(' ');
  const creativeOrphans = [];
  boardVocab; // taught set
  const vocabAll = words;
  // Words used in creative prompts that appear in lesson vocab but not board-taught
  const creativeTokens = (creativeText.toLowerCase().match(/\b[a-z]{4,}\b/g) || []);
  vocabAll.forEach((w) => {
    const lw = String(w).toLowerCase();
    if (boardVocab.some((b) => b.toLowerCase() === lw)) return;
    if (creativeTokens.includes(lw)) creativeOrphans.push(w);
  });
  const timingChipCount = rendered.pageEls.filter((el) => el && el.querySelector && el.querySelector('[data-timing-chip]')).length;
  const matchCaptionNotes = (boardPlan.pages || [])
    .filter((pg) => pg.pageKey === 'newWords')
    .flatMap((pg) => pg.notes || []);
  const newWordsPage = (boardPlan.pages || []).find((pg) => pg.pageKey === 'newWords');
  const matchPieces = ((newWordsPage && newWordsPage.unlocked) || [])
    .filter((p) => p.role === 'matchPiece');
  // Gate hole (Manus LgtX): notes alone lied — captions bake from piece.label /
  // pieceToPng matchPiece. Fail if any dock icon still carries a student label.
  const hasMatchCaptions = matchPieces.some((p) => !!(p.label || (p.meta && p.meta.captionChip)))
    || matchCaptionNotes.some((n) => /matchDockCaptions/i.test(String(n)));
  const hasMatchNoCaptionsNote = matchCaptionNotes.some((n) => /matchDockNoCaptions/i.test(String(n)));
  const hasMatchPads = matchCaptionNotes.some((n) => /matchDockPads/i.test(String(n)));
  const newWordsDom = rendered.pageEls[byKey.newWords];
  const matchPadDomCount = newWordsDom
    ? newWordsDom.querySelectorAll('[data-match-pad]').length
    : 0;
  const actTimingChip = !!(actDom && actDom.querySelector && actDom.querySelector('[data-timing-chip]'));
  const wrapDom = rendered.pageEls[byKey.wrap];
  // Prefer tagged aims/Also-say nodes — full-page textContent glues siblings
  // ("tempo"+"Exit" → "tempoExit") and false-fails the last aims word.
  const wrapExitHay = [
    wrapDom && wrapDom.querySelector && wrapDom.querySelector('[data-wrap-aims]'),
    wrapDom && wrapDom.querySelector && wrapDom.querySelector('[data-wrap-exit-also]'),
  ].filter(Boolean).map((n) => n.textContent || '').join(' ').toLowerCase();
  const wrapExitMissing = boardVocab.filter((w) => !new RegExp('\\b' + String(w).toLowerCase() + '\\b').test(wrapExitHay));
  const wrapPick = picks[byKey.wrap];
  const wrapHtml = wrapDom ? wrapDom.outerHTML.slice(0, 800) : '';
  const wrapNavy = /#1e293b|#334155|30,\s*41,\s*59|51,\s*65,\s*85|classical-terrace|moonlit|rgba\(15,\s*23,\s*42/i.test(
    String((wrapDom && wrapDom.style && wrapDom.style.background) || '')
    + String((wrapPick && wrapPick.name) || '')
    + wrapHtml
  );
  const hasAimsPanel = !!(titleDom && titleDom.querySelector && titleDom.querySelector('[data-aims-panel]'));
  const identityFrame = (lesson.sentenceFrames || []).some((f) => /If I am a musician/i.test(String(f)));
  const guitarStory = ((lesson.story && lesson.story.pages) || [])
    .some((sp) => /guitar/i.test([sp.text, sp.visualCaption, sp.heading].filter(Boolean).join(' ')));

  // Soft S24: story sides with data-story-prop must keep caption as a chip
  // below art — not absolute img stacking over sibling caption text.
  const storyCaptionIssues = [];
  const storyPropKeys = [];
  const storySides = [];
  let storyArtGenCount = 0;
  storyIdxs.forEach((si, storyI) => {
    const key = 'story' + storyI;
    const el = rendered.pageEls[byKey[key]];
    if (!el) return;
    const slot = el.querySelector('[data-story-art]');
    if (!slot) return;
    if (slot.dataset.storyArtGen === '1') storyArtGenCount += 1;
    const propKey = slot.dataset.storyProp || '';
    if (propKey) storyPropKeys.push({ i: storyI, key: propKey });
    if (slot.dataset.storyArtMode === 'side' && slot.dataset.storySide) {
      storySides.push(slot.dataset.storySide);
    }
    if (!propKey || slot.dataset.storyArtMode !== 'side') return;
    const imgs = slot.querySelectorAll('img');
    const caption = Array.from(slot.children).find((c) => c.tagName === 'DIV'
      && (c.textContent || '').trim().length > 2
      && !c.querySelector('img'));
    imgs.forEach((im) => {
      const pos = (im.style && im.style.position) || '';
      if (pos === 'absolute') {
        storyCaptionIssues.push({ i: storyI, issue: 'absolute-img-over-caption', prop: propKey });
      }
    });
    if (caption) {
      const bg = (caption.style && caption.style.background) || '';
      if (!/#fff|rgb\(255,\s*255,\s*255\)/i.test(bg)) {
        storyCaptionIssues.push({ i: storyI, issue: 'caption-not-white-chip', prop: propKey });
      }
      const ir = imgs[0] && imgs[0].getBoundingClientRect();
      const cr = caption.getBoundingClientRect();
      if (ir && cr && cr.top + 4 < ir.bottom && cr.bottom > ir.top) {
        storyCaptionIssues.push({ i: storyI, issue: 'caption-overlaps-img', prop: propKey });
      }
    } else {
      storyCaptionIssues.push({ i: storyI, issue: 'missing-caption-chip', prop: propKey });
    }
  });
  const storySideConsistent = storySides.length <= 1
    || storySides.every((s) => s === storySides[0]);

  // S34: mid-deck flats (exclude title/activity/wrap bookends) ≤2 unique washes.
  const midFlatNames = picks
    .map((p, i) => {
      const tags = (sections[i] && sections[i].tags) || [];
      if (tags.includes('title') || tags.includes('activity') || tags.includes('wrap')) return null;
      return p && p.type === 'flat' ? p.name : null;
    })
    .filter(Boolean);
  const midFlatUnique = [...new Set(midFlatNames)];

  const kingTitleInk = !!(actDom && actDom.querySelector && actDom.querySelector('[data-ink="heading"]'));
  const actHintInk = !!(actDom && actDom.querySelector && actDom.querySelector('[data-ink="hint"]'));
  const kingHintCard = !!(actDom && actDom.querySelector && actDom.querySelector('[data-king-hint-card]'));
  // Story caption chips should use charcoal ink (not terracotta) for palette cohesion.
  let storyCaptionCharcoal = true;
  let storyCaptionChipCount = 0;
  for (const storyI of storyIdxs) {
    const sDom = rendered.pageEls[storyI];
    if (!sDom || !sDom.querySelectorAll) continue;
    const chips = Array.from(sDom.querySelectorAll('[data-story-caption-chip]'));
    storyCaptionChipCount += chips.length;
    for (const chip of chips) {
      const c = String((chip.style && chip.style.color) || '');
      const ok = /#1e293b|#0f172a|#334155|rgb\(\s*30,\s*41,\s*59\s*\)|rgb\(\s*15,\s*23,\s*42\s*\)|rgb\(\s*51,\s*65,\s*85\s*\)/i.test(c);
      if (!ok) storyCaptionCharcoal = false;
    }
  }
  if (storyCaptionChipCount === 0) storyCaptionCharcoal = false;
  const wrapPeerFeedback = /Peer check/i.test((wrapDom && wrapDom.textContent) || '');
  const wrapPeerEl = wrapDom && wrapDom.querySelector && wrapDom.querySelector('[data-wrap-peer]');
  let wrapPeerOnBoard = false;
  if (wrapPeerEl) {
    const pr = wrapPeerEl.getBoundingClientRect();
    const wr = wrapDom.getBoundingClientRect();
    wrapPeerOnBoard = pr.bottom <= wr.bottom + 2 && pr.top >= wr.top - 2;
  }
  const prodWrite = !!(actDom && actDom.querySelector && actDom.querySelector('[data-prod-write]'));
  const story2Prop = (storyPropKeys || []).find((s) => s.i === 2);
  const story2Musician = !!(story2Prop && /^musician-/.test(story2Prop.key));

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
    aimsMissing,
    aimsOrphans,
    aimsHasRead,
    creativeOrphans,
    hasGrammarAim,
    grammarClaimsFirstOnly,
    grammarMissingSecondLabel,
    hasAimsPanel,
    wrapNavy,
    timingChipCount,
    hasMatchCaptions,
    hasMatchNoCaptionsNote,
    hasMatchPads,
    matchPadDomCount,
    actTimingChip,
    wrapExitMissing,
    identityFrame,
    guitarStory,
    storyPageCount: storyIdxs.length,
    storySideConsistent,
    storySides,
    midFlatUnique,
    kingTitleInk,
    actHintInk,
    kingHintCard,
    storyCaptionCharcoal,
    wrapPeerFeedback,
    wrapPeerOnBoard,
    prodWrite,
    story2Musician,
    storyArtApplied,
    storyArtGenCount,
    framesHintListenFirst: /listen and say/i.test(framesText),
    flatNames: picks.filter((p) => p.type === 'flat').map((p) => p.name),
    houseLeaks: picks.filter((p) => p.type === 'flat' && /^house-/.test(p.name)).map((p) => p.name),
    artWinners,
    storyEmojis,
    storyPropKeys,
    storyCaptionIssues,
    frames: { count: frames.length, longest, fontPx },
    pages,
    picks: picks.map((p, i) => ({ i, type: p.type, name: p.name })),
  };
}, { lesson, meta });

const storyArtGen = (result.storyArtGenCount || 0) > 0 || (result.storyArtApplied || 0) > 0;
storyArtMeta.applied = result.storyArtApplied || 0;
storyArtMeta.genSlots = result.storyArtGenCount || 0;
const soft = [];
if (storyArtMode !== '0' && storyArtMode !== 'off' && storyArtMode !== 'false') {
  if (storyArtResult && !storyArtGen) {
    soft.push('S47: StoryArt payload present but slots not marked data-story-art-gen');
  } else if (!storyArtResult) {
    soft.push('S47: no StoryArt disk cache — run scripts/illustrate-fixture-story.mjs (PropBank interim)');
  }
}
if ((result.storyPageCount || 0) > 0 && !result.aimsHasRead) {
  soft.push('S48: story lesson Aims line is talk-only — should mention read/reading');
}

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
const inspireWin = (result.artWinners || []).find((w) => w.w === 'inspire');
if (inspireWin && /brain\.png/i.test(String(inspireWin.winner))) {
  fails.push('inspire must use dedicated pack art (not brain stand-in): ' + inspireWin.winner);
}
if (inspireWin && !/inspire\.png/i.test(String(inspireWin.winner))) {
  fails.push('inspire must resolve to dedicated inspire.png: ' + inspireWin.winner);
}
if (result.storyEmojis.some((s) => s.emoji === '🏠')) fails.push('story emoji still house');
if (result.frames.longest > 75 && result.frames.fontPx > 28) fails.push('long frames font not shrunk');
if ((result.storyCaptionIssues || []).length) {
  fails.push('story caption bleed/overlap (S24): ' + JSON.stringify(result.storyCaptionIssues));
}
const story0Prop = (result.storyPropKeys || []).find((s) => s.i === 0);
if (story0Prop && /orchestra-stands|music-stand/.test(story0Prop.key)) {
  fails.push('story0 desk caption resolved to orchestra prop: ' + story0Prop.key);
}
if ((result.storyPageCount || 0) < 3) {
  fails.push('need 3 story beats before comprehension: ' + result.storyPageCount);
}
if ((result.aimsMissing || []).length) {
  fails.push('title aims missing vocab (S25): ' + result.aimsMissing.join(','));
}
if ((result.aimsOrphans || []).length) {
  fails.push('title aims list untaught words (S30): ' + result.aimsOrphans.join(','));
}
if ((result.creativeOrphans || []).length) {
  fails.push('creative prompts use vocab not on New Words (S30): ' + result.creativeOrphans.join(','));
}
if (!result.hasGrammarAim) fails.push('title missing grammar aim line (S25)');
if (result.grammarClaimsFirstOnly) {
  fails.push('grammar aim claims first-conditional only but frames use would (S31)');
}
if (result.grammarMissingSecondLabel) {
  fails.push('grammar aim must name second conditional when frames use If…would (S31)');
}
if (!result.hasAimsPanel) fails.push('title missing frosted aims panel (Manus PPT-like)');
if (!result.wrapNavy) fails.push('wrap bg not navy/slate bookend (S32)');
if (result.hasMatchCaptions) {
  fails.push('newWords match dock still has answer-naming caption chips (S26 student leak)');
}
if (!result.hasMatchNoCaptionsNote) {
  fails.push('newWords match dock missing matchDockNoCaptions note (S26)');
}
if (!result.hasMatchPads) fails.push('newWords match dock missing numbered pads note (S28)');
if ((result.matchPadDomCount || 0) < Math.min(6, (lesson.vocabulary || []).length || 0)) {
  fails.push('newWords DOM missing numbered drop pads (S28): ' + result.matchPadDomCount);
}
if (!result.actTimingChip) {
  fails.push('activity/king header missing timing chip (S29)');
}
if ((result.wrapExitMissing || []).length) {
  fails.push('wrap exit missing board vocab (S37): ' + result.wrapExitMissing.join(','));
}
if (result.identityFrame) fails.push('Frame still uses identity-based "If I am a musician"');
if (result.guitarStory) fails.push('story still references guitar (prefer piano/violin theme)');
const story1Prop = (result.storyPropKeys || []).find((s) => s.i === 1);
if (story1Prop && /guitar/i.test(story1Prop.key)) {
  fails.push('story1 prop still guitar: ' + story1Prop.key);
}
if ((result.timingChipCount || 0) < 4) {
  fails.push('too few teacher timing chips on headers: ' + result.timingChipCount);
}
// S29 — Manus next_action: gate pacing chips for lessons ≥45 min.
if (Number(meta.duration) >= 45 && (result.timingChipCount || 0) < 6) {
  fails.push('duration≥45 needs ≥6 timing chips (S29): ' + result.timingChipCount);
}
if (!result.storySideConsistent) {
  fails.push('story prop sides alternate (S33): ' + JSON.stringify(result.storySides));
}
if ((result.midFlatUnique || []).length > 2) {
  fails.push('mid-deck flats >2 unique washes (S34): ' + result.midFlatUnique.join(','));
}
if (!result.kingTitleInk || !result.actHintInk) {
  fails.push('activity instruction missing ink tags (S35)');
}
if (result.skipKing && !result.kingHintCard) {
  fails.push('king activity hint missing frosted instruction card (S40)');
}
if (result.storyCaptionCharcoal === false) {
  fails.push('story caption chips not charcoal ink (S40)');
}
if (!result.wrapPeerFeedback) {
  fails.push('wrap missing peer-feedback exit prompt (S36)');
}
if (!result.wrapPeerOnBoard) {
  fails.push('wrap peer-check prompt clipped off board (S36/S38)');
}
// PropBank musician-* gates only when generative StoryArt did not fill slots.
if (!storyArtGen) {
  const story2Prop = (result.storyPropKeys || []).find((s) => s.i === 2);
  if (story2Prop && /orchestra-stands|music-stand/i.test(story2Prop.key)) {
    fails.push('story2 orchestra caption still bare stands (prefer musician-*): ' + story2Prop.key);
  }
  if (!result.story2Musician) {
    fails.push('story2 should resolve to musician-* cutout (S38)');
  }
}
if (result.skipKing && !result.prodWrite) {
  fails.push('skipKing activity missing production write strip (S39)');
}

for (const p of result.pages) {
  const b64 = p.dataUrl.replace(/^data:image\/jpeg;base64,/, '');
  fs.writeFileSync(path.join(OUT, `page-${p.index}-${p.key}.jpg`), Buffer.from(b64, 'base64'));
}

// S27 — Manus packet must include every story beat (gate the review picker).
const { pickImages } = await import('./manus/review.mjs');
const picked = pickImages(OUT).map((p) => path.basename(p));
const storyFiles = fs.readdirSync(OUT).filter((n) => /^page-\d+-story\d+\.jpe?g$/i.test(n));
const missingStories = storyFiles.filter((n) => !picked.includes(n));
if (missingStories.length) {
  fails.push('pickImages dropped story pages (S27): ' + missingStories.join(','));
}
if ((result.storyPageCount || 0) >= 3 && !picked.some((n) => /story2/i.test(n))) {
  fails.push('pickImages missing story2 beat');
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
  storyPropKeys: result.storyPropKeys,
  storyCaptionIssues: result.storyCaptionIssues,
  storySideConsistent: result.storySideConsistent,
  midFlatUnique: result.midFlatUnique,
  kingTitleInk: result.kingTitleInk,
  wrapPeerFeedback: result.wrapPeerFeedback,
  wrapExitMissing: result.wrapExitMissing,
  aimsMissing: result.aimsMissing,
  hasGrammarAim: result.hasGrammarAim,
  hasMatchCaptions: result.hasMatchCaptions,
  hasMatchPads: result.hasMatchPads,
  matchPadDomCount: result.matchPadDomCount,
  timingChipCount: result.timingChipCount,
  pickedImages: picked,
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
  storyPropKeys: result.storyPropKeys,
  storyCaptionIssues: result.storyCaptionIssues,
  storySideConsistent: result.storySideConsistent,
  midFlatUnique: result.midFlatUnique,
  kingTitleInk: result.kingTitleInk,
  wrapPeerFeedback: result.wrapPeerFeedback,
  wrapExitMissing: result.wrapExitMissing,
  aimsMissing: result.aimsMissing,
  hasGrammarAim: result.hasGrammarAim,
  hasMatchCaptions: result.hasMatchCaptions,
  hasMatchPads: result.hasMatchPads,
  matchPadDomCount: result.matchPadDomCount,
  timingChipCount: result.timingChipCount,
  storyPageCount: result.storyPageCount,
  storyArt: storyArtMeta,
  soft,
  frames: result.frames,
  pageFiles: result.pages.map((p) => `page-${p.index}-${p.key}.jpg`),
  pickedImages: picked,
  fails,
  ok: fails.length === 0,
}, null, 2));

await browser.close();
server.close();
process.exit(fails.length ? 1 : 0);
