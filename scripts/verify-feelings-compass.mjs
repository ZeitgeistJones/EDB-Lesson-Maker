/**
 * Producer quality gate for feelings-compass (abstract vocab stress test).
 * Mirrors classical-compose pedagogy gates without music/terrace specials.
 *
 *   node scripts/verify-feelings-compass.mjs
 *   node scripts/verify-feelings-compass.mjs --story-art=auto   # apply disk cache if present
 *   node scripts/verify-feelings-compass.mjs --story-art=1      # generate if miss (costs Gemini)
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT,
  arg,
  loadEnv,
  logLine as harnessLogLine,
  clearPageJpgs,
  startPublicServer,
  openBoardPage,
  prepareStoryArt,
} from './lib/verify-harness.mjs';

const LOG = path.join(ROOT, '.cursor', 'debug-3c9697.log');
const OUT = path.join(ROOT, 'tmp', 'board-bg-verify', 'feelings-compass');
const logLine = (hypothesisId, message, data) =>
  harnessLogLine(LOG, 'feelings-verify', hypothesisId, message, data);

loadEnv();
const fixtureName = arg('fixture', 'feelings-compass-lesson.json');
const lesson = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/fixtures', fixtureName), 'utf8'));
if (arg('retitle', '1') !== '0') {
  lesson.title = 'Reading the Feelings Compass';
}

const meta = { level: 'B1', duration: '60', phonics: 'off' };
const storyArtMode = String(arg('story-art', process.env.STORY_ART_BAKE || 'auto')).toLowerCase();
const { storyArtResult, storyArtMeta } = await prepareStoryArt(lesson, meta, storyArtMode);
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.dirname(LOG), { recursive: true });
clearPageJpgs(OUT);
if (fs.existsSync(LOG)) fs.writeFileSync(LOG, '');

const { port, close } = await startPublicServer();
const { browser, page } = await openBoardPage(port);

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
    artWinners.push({ w, winner, curated, propKey: prop && prop.key });
  }

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

  // S49 (Manus QCVsgMcb): comprehension board must show a higher-order question,
  // and creative "Your Ideas" cards must not clip below the board.
  const compDom = rendered.pageEls[byKey.comprehension];
  const creativeDom = rendered.pageEls[byKey.creative];
  const inferReDom = /\b(why|what do you think|how do you know|how might|what would|what could|infer|imagine)\b/i;
  const compBoardText = (compDom && compDom.textContent) || '';
  const compBoardInferential = inferReDom.test(compBoardText);
  let creativeCardsOnBoard = true;
  if (creativeDom && creativeDom.getBoundingClientRect) {
    const cr = creativeDom.getBoundingClientRect();
    const cards = Array.from(creativeDom.querySelectorAll('[data-write-in-stage]'));
    for (const c of cards) {
      const r = c.getBoundingClientRect();
      if (r.bottom > cr.bottom + 2) { creativeCardsOnBoard = false; break; }
    }
  }

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
  const vocabAll = words;
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
  const hasMatchCaptions = matchPieces.some((p) => !!(p.label || (p.meta && p.meta.captionChip)))
    || matchCaptionNotes.some((n) => /matchDockCaptions/i.test(String(n)));
  const hasMatchNoCaptionsNote = matchCaptionNotes.some((n) => /matchDockNoCaptions/i.test(String(n)));
  const hasMatchPads = matchCaptionNotes.some((n) => /matchDockPads/i.test(String(n)));
  const hasMatchInline = matchCaptionNotes.some((n) => /matchDockInline/i.test(String(n)));
  const newWordsDom = rendered.pageEls[byKey.newWords];
  const matchPadDomCount = newWordsDom
    ? newWordsDom.querySelectorAll('[data-match-pad]').length
    : 0;
  const inlineArtCount = newWordsDom
    ? newWordsDom.querySelectorAll('img').length
    : 0;
  const actTimingChip = !!(actDom && actDom.querySelector && actDom.querySelector('[data-timing-chip]'));
  const wrapDom = rendered.pageEls[byKey.wrap];
  const wrapExitHay = [
    wrapDom && wrapDom.querySelector && wrapDom.querySelector('[data-wrap-aims]'),
    wrapDom && wrapDom.querySelector && wrapDom.querySelector('[data-wrap-exit-also]'),
  ].filter(Boolean).map((n) => n.textContent || '').join(' ').toLowerCase();
  const wrapExitMissing = boardVocab.filter((w) => !new RegExp('\\b' + String(w).toLowerCase() + '\\b').test(wrapExitHay));
  const wrapPick = picks[byKey.wrap];
  const wrapHtml = wrapDom ? wrapDom.outerHTML.slice(0, 800) : '';
  const wrapNavy = /#1e293b|#334155|30,\s*41,\s*59|51,\s*65,\s*85|rgba\(15,\s*23,\s*42/i.test(
    String((wrapDom && wrapDom.style && wrapDom.style.background) || '')
    + String((wrapPick && wrapPick.name) || '')
    + wrapHtml
  );
  const hasAimsPanel = !!(titleDom && titleDom.querySelector && titleDom.querySelector('[data-aims-panel]'));

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
  const wrapTimingChip = !!(wrapDom && wrapDom.querySelector && wrapDom.querySelector('[data-timing-chip]'));

  const feelingDockCount = (dockPieces || []).filter((k) => /^feeling-/.test(String(k))).length;
  const facePartsOnDock = (dockPieces || []).filter((k) =>
    /^(face-eyes|face-nose|face-mouth|face-ears|face-hair|hair-)/.test(String(k))).length;
  // Feelings now rides the egg-free board-house deck (house-*). board-face flats
  // carry corner eye/wink easter eggs that read as a floating unlabeled
  // googly-eyes prop on an emotion board (S53). Flag any board-face leak.
  const faceEggLeaks = picks.filter((p) => p.type === 'flat' && /^board-face-/.test(p.name)).map((p) => p.name);
  const classicalLeaks = picks.filter((p) =>
    p.type === 'flat' && /classical|moon|lavender-strings/.test(p.name)).map((p) => p.name);

  // S50/S51 — frame copy must not vertically clip descenders (y/g/p/q/j), comma
  // tails (worried,→worried.) or the "____" blank. Guard the rendered style, not
  // just the source string: enough line-height and no vertical overflow clip.
  const frameTextChecks = (framesDom ? Array.from(framesDom.querySelectorAll('[data-frame-text]')) : [])
    .map((fx) => {
      const cs = window.getComputedStyle(fx);
      const fs = parseFloat(cs.fontSize) || 0;
      const lh = cs.lineHeight === 'normal' ? fs * 1.2 : (parseFloat(cs.lineHeight) || 0);
      return {
        text: (fx.textContent || '').trim(),
        lineHeightRatio: fs ? +(lh / fs).toFixed(3) : 0,
        overflowY: cs.overflowY,
        clipped: (fx.scrollHeight || 0) > (fx.clientHeight || 0) + 1,
      };
    });

  // S51 — second-conditional frames use a comma (If I felt X, I would ___), never
  // a mid-sentence period, and the blank stays on the line.
  // Only leading-If frames need the comma ("If I felt X, I would ___"). Frames
  // where the if-clause trails ("I would feel ___ if someone ___") do not.
  const condFramePunct = (lesson.sentenceFrames || []).slice(0, 3)
    .filter((f) => /^\s*if\b/i.test(String(f)) && /\bwould\b/i.test(String(f)))
    .map((f) => {
      const s = String(f);
      const body = s.replace(/[.!?]+\s*$/, '');
      return { frame: s, hasComma: /,/.test(s), midPeriod: /\./.test(body) };
    });

  // S52 — shy must not share a glyph with happy on the match dock (both smiles).
  const vFind = (w) => (lesson.vocabulary || []).find(
    (v) => String((typeof v === 'string' ? v : v.word) || '').toLowerCase() === w
  );
  const emj = (w) => (window.VocabIcons.emojiFor
    ? window.VocabIcons.emojiFor(w, ((vFind(w) || {}).emoji))
    : ((vFind(w) || {}).emoji || ''));
  const shyGlyph = emj('shy');
  const happyGlyph = emj('happy');

  // S56 — "confused" must not read as a neutral/meh face and must be distinct
  // from the other five board feelings (drag-picture match lives or dies on it).
  const confusedGlyph = emj('confused');
  const boardFeelingGlyphs = boardVocab.map((w) => ({ w: String(w), g: emj(String(w).toLowerCase()) }));

  // S57 — warm-up must stay target-neutral (elicit prior knowledge, no taught
  // feeling word pre-cued before New Words teaches it).
  const warmQuestion = String((lesson.warmUp && lesson.warmUp.question) || '');
  const warmSample = String((lesson.warmUp && lesson.warmUp.sampleAnswer) || '');
  const warmTargetLeaks = boardVocab.filter((w) => {
    const re = new RegExp('\\b' + String(w).toLowerCase() + '\\b', 'i');
    return re.test(warmQuestion) || re.test(warmText) || re.test(warmSample);
  });

  // S58 — draggable match pieces stay label/number-free (protects the
  // no-answer-naming tiebreak: never pre-map drag emoji to the numbered pads).
  const matchPieceLabels = matchPieces
    .map((p) => String(p.label || (p.meta && (p.meta.captionChip || p.meta.caption)) || '').trim())
    .filter(Boolean);
  const matchPieceNumbered = matchPieces.some((p) => {
    const glyph = String(p.emoji || '');
    return /\d/.test(glyph) || (p.meta && (p.meta.padIndex != null || p.meta.answerIndex != null));
  });

  // S54 — feelings drag faces must be grabbably large (not postage-stamp).
  const feelingDockSides = ((actPage && actPage.unlocked) || [])
    .filter((p) => p.role === 'dockPiece')
    .map((p) => Math.min(p.w || 0, p.h || 0));
  const minFeelingDockSide = feelingDockSides.length ? Math.min(...feelingDockSides) : 0;

  // S59 — the Feelings Lab dock must render the SAME vetted vocab-pack art the New
  // Words match dock teaches (not a second 3D prop face set). Capture each feeling
  // dock piece's word + rendered asset source so the gate can prove both drag
  // surfaces share one face vocabulary (and no untaught prop expression leaks in).
  const feelingDockArt = ((actPage && actPage.unlocked) || [])
    .filter((p) => p.role === 'dockPiece' && /^feeling-/.test(String((p.meta && p.meta.propKey) || '')))
    .map((p) => ({
      key: (p.meta && p.meta.propKey) || '',
      word: (p.meta && p.meta.word) || '',
      asset: String(p.asset || ''),
    }));

  // S60 — a completed second-conditional model must appear on the frames board so
  // the target grammar is modeled receptively before students produce it.
  const frameModelEl = framesDom && framesDom.querySelector
    ? framesDom.querySelector('[data-frame-model]')
    : null;
  const frameModelText = frameModelEl ? (frameModelEl.textContent || '').trim() : '';

  // S61 — comprehension write-in cards must sit fully on the board (Q3's box was
  // clipping off the bottom edge). Mirror the creative-cards clip check.
  let compCardsOnBoard = true;
  if (compDom && compDom.getBoundingClientRect) {
    const cr = compDom.getBoundingClientRect();
    const cards = Array.from(compDom.querySelectorAll('[data-write-in-stage]'));
    for (const c of cards) {
      const r = c.getBoundingClientRect();
      if (r.bottom > cr.bottom + 2) { compCardsOnBoard = false; break; }
    }
  }

  // S62 — story body copy must be near-black (not medium-gray that washes out
  // projected). Capture every rendered story-body ink colour.
  const storyBodyInks = [];
  for (const storyI of storyIdxs) {
    const sDom = rendered.pageEls[storyI];
    if (!sDom || !sDom.querySelectorAll) continue;
    Array.from(sDom.querySelectorAll('[data-story-body]')).forEach((b) => {
      storyBodyInks.push(String((b.style && b.style.color) || ''));
    });
  }

  // S63 — title Aims must NAME the topic, not hide it behind "today's topic".
  const aimHidesTopic = /today's topic|todays topic/i.test(titleText);
  const aimNamesTopic = lesson.topic
    ? new RegExp('\\b' + String(lesson.topic).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(titleText)
    : true;

  // S64 — Feelings Lab hero must be balanced into the RIGHT region (past the left
  // instruction column) so the page isn't lopsided with a dead right third.
  const heroPieces = ((actPage && actPage.locked) || [])
    .concat((actPage && actPage.unlocked) || [])
    .filter((p) => p.role === 'stageHero' || p.role === 'heroPart' || (p.meta && p.meta.stageKing));
  const kingHeroX = heroPieces.length
    ? Math.min(...heroPieces.map((p) => (p._force && p._force.x != null ? p._force.x : (p.x || 0))))
    : -1;

  // S65 — New Words match dock (picture bin) must HUG the word cards and FILL the
  // column edge-to-edge as a wide grid of large faces — not a centred narrow block
  // stranded mid-right with a dead gap (round-1+2 Judge B).
  const vDock = ((window.EdbLayout && window.EdbLayout.ZONE_TEMPLATES
    && window.EdbLayout.ZONE_TEMPLATES.vocab) || {}).dock || { x: 724, w: 412 };
  const binMinX = matchPieces.length ? Math.min(...matchPieces.map((p) => p.x || 0)) : 0;
  const binMaxX2 = matchPieces.length ? Math.max(...matchPieces.map((p) => (p.x || 0) + (p.w || 0))) : 0;
  const binMinSide = matchPieces.length ? Math.min(...matchPieces.map((p) => Math.min(p.w || 0, p.h || 0))) : 0;
  const binCols = new Set(matchPieces.map((p) => Math.round(p.x || 0))).size;
  const vocabTrayPresent = !!(newWordsDom && newWordsDom.querySelector
    && newWordsDom.querySelector('[data-vocab-tray]'));

  // S66 — frames stack must keep a bottom gutter so Frame 3's write-line is never
  // flush on the board edge (round-1 model row pushed it down; Judge B: "cut off").
  let framesGutter = 999;
  if (framesDom && framesDom.getBoundingClientRect) {
    const fbody = framesDom.querySelector('[data-frames-body]');
    if (fbody) {
      framesGutter = Math.round(framesDom.getBoundingClientRect().bottom - fbody.getBoundingClientRect().bottom);
    }
  }

  // S68 — warm-up carries a target-neutral sentence starter to scaffold output
  // without pre-cueing any taught feeling word.
  const warmStarterEl = warmDom && warmDom.querySelector
    ? warmDom.querySelector('[data-warm-starter]') : null;
  const warmStarterText = warmStarterEl ? (warmStarterEl.textContent || '').trim() : '';

  // S70 — the surfaced inferential comprehension question must not be a stated-fact
  // retrieval in disguise ("...surprised at the end" is answered verbatim in the story).
  const compBoardStaleInfer = /surprised at the end/i.test(compBoardText);

  if (window.LessonPages.cleanup) window.LessonPages.cleanup(rendered.host);

  return {
    aimHidesTopic,
    aimNamesTopic,
    activityHintReadsFace: /reads? the face|read the face/i.test(actText),
    activityHintPartnerGuesses: /partner guesses/i.test(actText),
    kingHeroX,
    binMinX,
    binMaxX2,
    binMinSide,
    binCols,
    vocabTrayPresent,
    vDock,
    framesGutter,
    warmStarterText,
    compBoardStaleInfer,
    title: lesson.title,
    titlePick: picks[titleIdx],
    activityPick: picks[actIdx],
    recipe: actAssign && actAssign.recipeId,
    heroKey: actAssign && actAssign.ctx && actAssign.ctx.hero && actAssign.ctx.hero.key,
    skipKing: !!(actAssign && actAssign.ctx && actAssign.ctx.skipKing),
    kingPieces,
    dockCount: dockPieces.length,
    dockSample: dockPieces.slice(0, 10),
    feelingDockCount,
    facePartsOnDock,
    compCount: compQs.length,
    compBoardInferential,
    creativeCardsOnBoard,
    activityHintHasToys: /\btoys\b/i.test(actText),
    activityHintHasWriteOrSay: /write or say|say or write|then say|then write/i.test(actText),
    activityHintFeelings: /feeling/i.test(actText),
    activityHintTwoRound: /round\s*1/i.test(actText) && /round\s*2/i.test(actText),
    activityHintSecondCond: /if i felt/i.test(actText) && /\bi would\b/i.test(actText),
    activityProdWrite: !!(actDom && actDom.querySelector && actDom.querySelector('[data-prod-write]')),
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
    hasMatchInline,
    matchPadDomCount,
    inlineArtCount,
    actTimingChip,
    wrapExitMissing,
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
    wrapTimingChip,
    faceEggLeaks,
    classicalLeaks,
    frameTextChecks,
    condFramePunct,
    shyGlyph,
    happyGlyph,
    confusedGlyph,
    boardFeelingGlyphs,
    warmTargetLeaks,
    matchPieceLabels,
    matchPieceNumbered,
    minFeelingDockSide,
    feelingDockArt,
    frameModelText,
    compCardsOnBoard,
    storyBodyInks,
    artWinners,
    storyPropKeys,
    storyCaptionIssues,
    storyArtApplied,
    storyArtGenCount,
    frames: { count: frames.length, longest, fontPx },
    framesHintListenFirst: /listen and say/i.test(framesText),
    pages,
    picks: picks.map((p, i) => ({ i, type: p.type, name: p.name })),
  };
}, { lesson, meta });

const fails = [];
// Shared vocab helpers for round-2 gates (S65/S68).
const BOARD_VOCAB = (lesson.vocabulary || [])
  .slice(0, 6)
  .map((v) => (typeof v === 'string' ? v : v && v.word))
  .filter(Boolean);
const DRAG_TARGET_VOCAB = BOARD_VOCAB.length || 6;
if (result.recipe !== 'heroProp') fails.push('activity must be heroProp (face-blank + feelings dock): ' + result.recipe);
if (result.heroKey !== 'face-blank') fails.push('hero must be face-blank: ' + result.heroKey);
// S49 (Manus QCVsgMcb): drag sources must equal the taught vocab. A 12-sticker pad
// for 6 taught feelings overloads B1 and adds unnameable distractors.
const DRAG_TARGET = Math.min(6, (lesson.vocabulary || []).length || 6);
if ((result.feelingDockCount || 0) !== DRAG_TARGET) {
  fails.push('DRAG_SOURCE_COUNT != TARGET_VOCAB_COUNT (S49): dock=' + result.feelingDockCount + ' target=' + DRAG_TARGET + ' ' + JSON.stringify(result.dockSample));
}
if ((result.facePartsOnDock || 0) > 0) {
  fails.push('feelings dock leaked face parts: ' + JSON.stringify(result.dockSample));
}
if ((result.compCount || 0) < 2) fails.push('comprehension questions missing after normalize: ' + result.compCount);
if (result.activityHintHasToys) fails.push('activity hint still says toys');
if (!result.activityHintHasWriteOrSay) fails.push('activity hint missing speak/write production cue');
if (!result.activityHintFeelings) fails.push('activity hint should name feeling faces');
if (!result.activityHintTwoRound) {
  fails.push('feelings activity missing two-round Lab cue (S41 Manus ZPD)');
}
if (!result.activityProdWrite) {
  fails.push('feelings Lab missing student write strip (S39/S44 Manus kS8Er B1)');
}
if (!result.activityHintSecondCond) {
  fails.push('feelings Round 2 missing If I felt…would cue (S45 Manus LSSgv ZPD)');
}
if ((result.storyPropKeys || []).some((s) => /checkmark|check-mark|^check$/i.test(String(s.key || '')))) {
  fails.push('story prop resolved to checkmark badge (Ssdp B2): ' + JSON.stringify(result.storyPropKeys));
}
const feelWordRe = /\b(worried|scared|confused|shy|surprised|happy|sad|angry|bored|sleepy|proud|silly|excited|tired)\b/i;
const storyPages = lesson.story && lesson.story.pages;
if (Array.isArray(storyPages)) {
  for (let i = 0; i < storyPages.length; i++) {
    const cap = String((storyPages[i] && storyPages[i].visualCaption) || '');
    const lead = cap.split(/[—–-]/)[0].trim();
    if (!feelWordRe.test(cap)) {
      fails.push(`S44 story caption ${i} missing feeling word: ${cap}`);
    } else if (!feelWordRe.test(lead)) {
      fails.push(`S44 story caption ${i} must lead with feeling word: ${cap}`);
    }
  }
}
const soft = [];
const storyArtGen = (result.storyArtGenCount || 0) > 0 || (result.storyArtApplied || 0) > 0;
storyArtMeta.applied = result.storyArtApplied || 0;
storyArtMeta.genSlots = result.storyArtGenCount || 0;
// PropBank feeling-* fallback only matters when generative StoryArt did not fill slots.
if (!storyArtGen && !(result.storyPropKeys || []).some((s) => /^feeling-/.test(String(s.key || '')))) {
  soft.push('S42: no feeling-* story props — caption may not name emotion words');
}
if (storyArtMode !== '0' && storyArtMode !== 'off' && storyArtMode !== 'false') {
  if (storyArtResult && !storyArtGen) {
    soft.push('S47: StoryArt payload present but slots not marked data-story-art-gen');
  } else if (!storyArtResult) {
    soft.push('S47: no StoryArt disk cache — run scripts/illustrate-fixture-story.mjs (PropBank interim)');
  }
  // S48 (Manus S9VxcmZA): multi-panel StoryArt must carry recurring-character
  // continuity. Stale caches (pre v2-charlock) have no charLock flag — regen to
  // stop character drift (e.g. hair color shifting between beats).
  const multiPanel = (result.storyPageCount || 0) > 1;
  if (storyArtResult && storyArtGen && multiPanel && !storyArtResult.charLock) {
    soft.push('S48: StoryArt cache predates character-lock (v2-charlock) — regenerate with --story-art=1 to enforce recurring-character consistency across beats');
  }
  storyArtMeta.charLock = !!(storyArtResult && storyArtResult.charLock);
}
const inferRe = /\b(why|what do you think|how do you know|how might|what would|what could|infer|imagine)\b/i;
const inferentialComp = (lesson.story && lesson.story.comprehensionQuestions || []).some((q) =>
  inferRe.test(String(q && q.question || q || '')));
if (!inferentialComp) {
  soft.push('S45 soft: no inferential comprehension question in fixture (Manus LSSgv ZPD)');
} else if (!result.compBoardInferential) {
  // Gate hole (Manus QCVsgMcb): fixture had an inferential Q but the board's visible
  // top-3 were recall-only. Producer must surface it, not drop it past slice(0,3).
  fails.push('S49: comprehension board shows only recall — inferential question dropped (Manus QCVsgMcb)');
}
if (result.creativeCardsOnBoard === false) {
  fails.push('S49: creative "Your Ideas" cards clipped below board bottom (Manus QCVsgMcb crop)');
}
if ((result.storyPageCount || 0) > 0 && !result.aimsHasRead) {
  soft.push('S48: story lesson Aims line is talk-only — should mention read/reading');
}
if (result.warmSampleLeak) fails.push('warm-up still leaks teacher sample to students');
if (result.faceEggLeaks.length) {
  fails.push('S53: board-face eye-egg flats leaked (unlabeled googly-eyes prop on newWords/activity) — feelings must ride egg-free board-house: ' + result.faceEggLeaks.join(','));
}
if (result.classicalLeaks.length) fails.push('classical music flats leaked into feelings: ' + result.classicalLeaks.join(','));

// S50 — frame text keeps descender headroom and is never vertically clipped
// (worried,→worried. / shy→shv / my→mv / dropped "____" — both judges).
if (!result.frameTextChecks.length) {
  fails.push('S50: no [data-frame-text] frame copy found to guard for descender clip');
}
for (const fc of result.frameTextChecks) {
  if (fc.lineHeightRatio < 1.35) {
    fails.push(`S50: frame text line-height too tight (${fc.lineHeightRatio}, need ≥1.35) — clips descenders/commas: "${fc.text}"`);
  }
  if (fc.overflowY === 'hidden' || fc.clipped) {
    fails.push(`S50: frame text vertically clipped (overflowY=${fc.overflowY}, clipped=${fc.clipped}): "${fc.text}"`);
  }
}
// S51 — second conditional frames: comma, no mid-sentence period, blank on line.
for (const cp of result.condFramePunct) {
  if (!cp.hasComma) fails.push('S51: second-conditional frame missing comma (If I felt X, I would ___): ' + cp.frame);
  if (cp.midPeriod) fails.push('S51: second-conditional frame has a mid-sentence period (should be a comma): ' + cp.frame);
}
// S52 — shy glyph must differ from happy on the match dock.
if (result.shyGlyph && result.happyGlyph && result.shyGlyph === result.happyGlyph) {
  fails.push('S52: shy and happy share the same match-dock glyph (' + result.shyGlyph + ') — students cannot tell pads apart');
}
// S52 (pack) — same gate hole S56 closed for confused: the New Words dock renders
// the vocab-pack PNG (wordArtPng), so an emojiFor override alone cannot save shy if
// shy.png is still a smile. Guard the rendered art: shy's pack codepoint must not be
// a smile-family Twemoji (it read identically to happy's grin — both selfloop judges).
try {
  const packIndexShy = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'public/assets/07_vocab-pack/index.json'), 'utf8')
  );
  const shyRow = packIndexShy && packIndexShy.shy;
  const SMILE_CODEPOINTS = ['1f60a', '1f600', '1f603', '1f604', '1f601', '1f642', '1f60d', '1f970', '1f60e', '1f929'];
  if (shyRow && SMILE_CODEPOINTS.includes(String(shyRow.codepoint || '').toLowerCase())) {
    fails.push('S52: shy vocab-pack art is a smile-family Twemoji (' + shyRow.codepoint + ' ' + (shyRow.emoji || '') + ') — repoint fetch-vocab-icons shy→😳 (1f633) and re-render shy.png so it does not read as happy');
  }
} catch (err) {
  fails.push('S52: could not read vocab pack index to verify shy art: ' + (err.message || err));
}
// S54 — feelings drag faces must be grabbably large (not postage-stamp).
if ((result.minFeelingDockSide || 0) < 96) {
  fails.push('S54: feelings drag faces too small (min side ' + result.minFeelingDockSide + 'px, need ≥96) — enlarge dock stickers');
}
// S56 — "confused" glyph must not be a neutral/meh face and must be distinct
// from the other five board feelings (both judges: 😕 read as neutral 😐).
const NEUTRAL_GLYPHS = ['😐', '😑', '😕', '🫤', '😶'];
if (NEUTRAL_GLYPHS.includes(String(result.confusedGlyph || ''))) {
  fails.push('S56: confused icon is a neutral/meh face (' + result.confusedGlyph + ') — use a clearly-puzzled glyph (🤔/😕-brow) so the drag-picture match is unmistakable');
}
// S56 (pack) — the New Words drag dock renders the vocab-pack PNG via wordArtPng,
// NOT the emoji fallback. Guard the actual rendered art: confused's pack codepoint
// must not be a neutral/meh Twemoji (1f615 😕, 1f610 😐, 1f611 😑, 1fae4 🫤, 1f636 😶).
try {
  const packIndex = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'public/assets/07_vocab-pack/index.json'), 'utf8')
  );
  const confusedRow = packIndex && packIndex.confused;
  const NEUTRAL_CODEPOINTS = ['1f615', '1f610', '1f611', '1fae4', '1f636'];
  if (confusedRow && NEUTRAL_CODEPOINTS.includes(String(confusedRow.codepoint || '').toLowerCase())) {
    fails.push('S56: confused vocab-pack art is a neutral/meh Twemoji (' + confusedRow.codepoint + ' ' + (confusedRow.emoji || '') + ') — repoint fetch-vocab-icons confused→🤔 (1f914) and re-render confused.png');
  }
} catch (err) {
  fails.push('S56: could not read vocab pack index to verify confused art: ' + (err.message || err));
}
{
  const seen = new Map();
  for (const { w, g } of (result.boardFeelingGlyphs || [])) {
    if (!g) continue;
    if (seen.has(g)) {
      fails.push('S56: board feeling glyphs collide — "' + w + '" and "' + seen.get(g) + '" share ' + g + ' (six icons must be mutually distinct)');
    } else {
      seen.set(g, w);
    }
  }
}
// S57 — warm-up must stay target-neutral (no taught feeling word pre-cued).
if ((result.warmTargetLeaks || []).length) {
  fails.push('S57: warm-up pre-cues target vocab before it is taught (' + result.warmTargetLeaks.join(',') + ') — make the warm-up target-neutral to elicit prior knowledge');
}
// S58 — draggable match pieces stay label/number-free (protect the tiebreak:
// never pre-map drag emoji to numbered pads — that gives away the match).
if ((result.matchPieceLabels || []).length) {
  fails.push('S58: draggable match pieces carry answer-naming labels (' + result.matchPieceLabels.join(',') + ') — drag pieces must stay label-free (S26 family)');
}
if (result.matchPieceNumbered) {
  fails.push('S58: draggable match pieces are numbered/pre-mapped to pads — remove numbers/answer indices from drag emoji (pedagogy: fix guessing via unambiguous icons, not by revealing the match)');
}
// S59 — the Feelings Lab dock must reuse the vetted vocab-pack face art (same set
// as New Words), not a second 3D prop face vocabulary. Every feeling dock piece
// must carry its taught word and resolve to the 07_vocab-pack art (both judges:
// mismatched art broke the picture→word transfer + leaked an untaught "angry" face).
{
  const dockArt = result.feelingDockArt || [];
  if (!dockArt.length) {
    fails.push('S59: no feeling dock pieces captured on the activity page');
  }
  for (const d of dockArt) {
    if (!d.word) {
      fails.push('S59: feeling dock piece ' + (d.key || '?') + ' has no taught word — it renders prop art, not the New Words pack face');
    } else if (!/07_vocab-pack/.test(d.asset)) {
      fails.push('S59: feeling dock piece ' + d.key + ' renders non-pack art (' + (d.asset || 'none') + ') — repoint the Feelings Lab dock at the New Words vocab-pack PNG so both drag surfaces share one face set');
    }
    if (/09_props\/?.*feeling-/i.test(d.asset)) {
      fails.push('S59: feeling dock piece ' + d.key + ' still points at a 3D prop face (' + d.asset + ')');
    }
  }
}
// S60 — a completed second-conditional model must be on the frames board (grammar
// aim modeled receptively before production). Model must be a full sentence with
// no blank ("____") and use If…would.
{
  const m = String(result.frameModelText || '');
  if (!m) {
    fails.push('S60: frames board missing a worked second-conditional Model (Judge A: target grammar never modeled in the input)');
  } else if (/_{2,}|_ /.test(m) || /___/.test(m)) {
    fails.push('S60: frames Model still contains a blank — it must be a completed example: ' + m);
  } else if (!(/\bif\b/i.test(m) && /\bwould\b/i.test(m))) {
    fails.push('S60: frames Model is not a second conditional (needs If…would): ' + m);
  }
}
// S61 — comprehension write-in cards must sit fully on the board (Q3 clipped).
if (result.compCardsOnBoard === false) {
  fails.push('S61: comprehension write-in card clipped below the board bottom (Judge B: Q3 answer box cut off) — tighten the comprehension grid so all questions fit');
}
// S62 — story body copy must be near-black, not medium-gray that washes out.
{
  const DARK = /#0f172a|#0b1220|rgb\(\s*15,\s*23,\s*42\s*\)/i;
  const inks = result.storyBodyInks || [];
  if (!inks.length) {
    fails.push('S62: no [data-story-body] story copy captured to verify contrast');
  }
  for (const ink of inks) {
    if (!DARK.test(String(ink))) {
      fails.push('S62: story body ink not near-black (' + ink + ') — darken so projected reading text does not wash out');
    }
  }
}
// S63 — title Aims must name the topic (round-2 Judge A: "today's topic" hides it).
if (result.aimHidesTopic) {
  fails.push('S63: title Aims hides the topic behind "today\'s topic" — name it (set lesson.topic so Aims read "about <topic>")');
}
if (lesson.topic && !result.aimNamesTopic) {
  fails.push('S63: title Aims does not name the declared topic "' + lesson.topic + '" — the Aims line must say "about ' + lesson.topic + '"');
}
// S64 — Feelings Lab hero balanced into the right region (not centred → dead right).
if (result.recipe === 'heroProp' && (result.kingHeroX || 0) < 480) {
  fails.push('S64: Feelings Lab hero not balanced right (x=' + result.kingHeroX + ', need ≥480) — a centred head leaves the right third empty and the page reads lopsided (both round-2 judges)');
}
// S65 — New Words picture bin hugs the cards and fills the column with large faces.
{
  const dockX = (result.vDock && result.vDock.x) || 724;
  const dockW = (result.vDock && result.vDock.w) || 412;
  const dockRight = dockX + dockW;
  if (!result.vocabTrayPresent) {
    fails.push('S65: New Words match dock missing the framed "picture bin" tray (data-vocab-tray) — faces read as floating icons, not an intentional drag tray (Judge B)');
  }
  if ((result.binMinX || 0) > dockX + 24) {
    fails.push('S65: match-dock faces do not hug the cards (leftX=' + result.binMinX + ', dock starts ' + dockX + ') — they float mid-right with a dead gap');
  }
  if ((result.binMaxX2 || 0) < dockRight - 24) {
    fails.push('S65: match-dock faces do not fill the bin width (rightX=' + result.binMaxX2 + ', dock ends ' + dockRight + ') — widen the grid to fill the column');
  }
  if ((result.binMinSide || 0) < 110) {
    fails.push('S65: match-dock faces too small (min side ' + result.binMinSide + 'px, need ≥110) — enlarge the picture-bin faces');
  }
  if ((result.binCols || 0) < 3 && DRAG_TARGET_VOCAB >= 5) {
    fails.push('S65: match-dock grid is not wide (cols=' + result.binCols + ', need ≥3 for ' + DRAG_TARGET_VOCAB + ' words) — use a short wide bin, not a tall stranded sliver');
  }
}
// S66 — frames stack keeps a bottom gutter (Frame 3 never flush on the edge).
if ((result.framesGutter || 0) < 20) {
  fails.push('S66: frames stack has no bottom gutter (gutter=' + result.framesGutter + 'px, need ≥20) — Frame 3 write-line reads cut off at the board edge (Judge B)');
}
// S67 — no reversed "I would feel ___ if someone ___" frame (past-form trap with no
// model of the reversed order → invites present-tense error; round-2 Judge A). Frames
// must lead with the modeled If-clause order.
{
  const reversed = (lesson.sentenceFrames || []).slice(0, 3)
    .filter((f) => /^\s*i would feel\b/i.test(String(f)) && /\bif\b/i.test(String(f)));
  if (reversed.length) {
    fails.push('S67: reversed result-first conditional frame invites a past-form error (' + reversed.join(' | ') + ') — reword to the taught If-first order');
  }
}
// M2/S60b — the worked Model must NOT reuse a feeling that is the given word in any
// frame, or Frame 1 becomes copy-the-model instead of production (round-2 Judge A).
{
  const m = String(result.frameModelText || '');
  const mw = (m.match(/if i felt\s+([a-z]+)/i) || [])[1];
  if (mw) {
    const taught = (lesson.vocabulary || []).map((v) => (typeof v === 'string' ? v : v && v.word)).filter(Boolean);
    const givens = new Set();
    (lesson.sentenceFrames || []).slice(0, 3).forEach((f) => {
      const s = String(f || '').toLowerCase();
      taught.forEach((w) => { if (new RegExp('\\b' + String(w).toLowerCase() + '\\b').test(s)) givens.add(String(w).toLowerCase()); });
    });
    if (givens.has(mw.toLowerCase())) {
      fails.push('S60: frames Model reuses a frame\'s given feeling ("' + mw + '") — Frame 1 becomes copy-the-model; pick a feeling not given in any frame (round-2 Judge A)');
    }
  }
}
// S68 — warm-up carries a target-neutral sentence starter (scaffold) that leaks no
// taught feeling word (round-2 Judge B: the warm-up was one lonely question + empty box).
{
  const starter = String(result.warmStarterText || '');
  if (!starter) {
    fails.push('S68: warm-up missing a sentence-starter scaffold (data-warm-starter) — a lone question over an empty box reads boring/unscaffolded (Judge B)');
  } else {
    const leaks = BOARD_VOCAB.filter((w) => new RegExp('\\b' + String(w).toLowerCase() + '\\b', 'i').test(starter));
    if (leaks.length) {
      fails.push('S68: warm-up starter pre-cues taught vocab (' + leaks.join(',') + ') — keep the scaffold target-neutral');
    }
  }
}
// S69 — activity Round 2 must describe the READ-the-face mechanic, not a misleading
// "partner guesses" (the chosen face is in full view; round-2 Judge A).
if (result.recipe === 'heroProp') {
  if (result.activityHintPartnerGuesses) {
    fails.push('S69: activity says "partner guesses" but the face is visible — reword to reading the face and naming the feeling (round-2 Judge A)');
  }
  if (!result.activityHintReadsFace) {
    fails.push('S69: activity Round 2 missing the read-the-face cue ("reads the face") — clarify what the partner actually does');
  }
}
// S70 — the surfaced inferential comprehension question must be genuinely inferential,
// not a stated fact retrieval in disguise ("surprised at the end"; round-2 Judge A).
if (result.compBoardStaleInfer) {
  fails.push('S70: comprehension "why" question is answered verbatim in the story ("surprised at the end") — make it genuinely inferential (round-2 Judge A)');
}
if (result.artWinners.some((w) => !String(w.winner).startsWith('pack:'))) {
  fails.push('board vocab art must prefer pack: ' + JSON.stringify(result.artWinners));
}
if ((result.storyCaptionIssues || []).length) {
  fails.push('story caption bleed/overlap (S24): ' + JSON.stringify(result.storyCaptionIssues));
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
if (!result.hasMatchPads && !result.hasMatchInline) {
  fails.push('newWords missing matchDockPads or matchDockInline note (S28)');
}
if (result.hasMatchInline) {
  if ((result.inlineArtCount || 0) < Math.min(4, (lesson.vocabulary || []).length || 0)) {
    fails.push('newWords inline layout missing pictures beside words (S28): ' + result.inlineArtCount);
  }
} else if ((result.matchPadDomCount || 0) < Math.min(6, (lesson.vocabulary || []).length || 0)) {
  fails.push('newWords DOM missing numbered drop pads (S28): ' + result.matchPadDomCount);
}
if (!result.actTimingChip) {
  fails.push('activity/king header missing timing chip (S29)');
}
if ((result.wrapExitMissing || []).length) {
  fails.push('wrap exit missing board vocab (S37): ' + result.wrapExitMissing.join(','));
}
if ((result.timingChipCount || 0) < 4) {
  fails.push('too few teacher timing chips on headers: ' + result.timingChipCount);
}
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
if (!result.kingHintCard) {
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
if (!result.wrapTimingChip) {
  fails.push('wrap missing timing chip (S29/S46 Manus 3Uc8)');
}

for (const p of result.pages) {
  const b64 = p.dataUrl.replace(/^data:image\/jpeg;base64,/, '');
  fs.writeFileSync(path.join(OUT, `page-${p.index}-${p.key}.jpg`), Buffer.from(b64, 'base64'));
}

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

logLine('VERIFY', 'feelings-compass invariants', {
  title: result.title,
  heroKey: result.heroKey,
  feelingDockCount: result.feelingDockCount,
  dockSample: result.dockSample,
  artWinners: result.artWinners,
  aimsMissing: result.aimsMissing,
  hasGrammarAim: result.hasGrammarAim,
  grammarMissingSecondLabel: result.grammarMissingSecondLabel,
  hasMatchCaptions: result.hasMatchCaptions,
  timingChipCount: result.timingChipCount,
  wrapExitMissing: result.wrapExitMissing,
  pickedImages: picked,
  fails,
  out: OUT,
});

console.log(JSON.stringify({
  title: result.title,
  recipe: result.recipe,
  heroKey: result.heroKey,
  feelingDockCount: result.feelingDockCount,
  dockSample: result.dockSample,
  artWinners: result.artWinners,
  aimsMissing: result.aimsMissing,
  hasGrammarAim: result.hasGrammarAim,
  grammarMissingSecondLabel: result.grammarMissingSecondLabel,
  hasMatchCaptions: result.hasMatchCaptions,
  matchPadDomCount: result.matchPadDomCount,
  timingChipCount: result.timingChipCount,
  wrapExitMissing: result.wrapExitMissing,
  faceEggLeaks: result.faceEggLeaks,
  frameLineHeights: result.frameTextChecks.map((f) => f.lineHeightRatio),
  shyGlyph: result.shyGlyph,
  happyGlyph: result.happyGlyph,
  confusedGlyph: result.confusedGlyph,
  warmTargetLeaks: result.warmTargetLeaks,
  matchPieceLabels: result.matchPieceLabels,
  minFeelingDockSide: result.minFeelingDockSide,
  feelingDockArt: result.feelingDockArt,
  frameModelText: result.frameModelText,
  compCardsOnBoard: result.compCardsOnBoard,
  aimHidesTopic: result.aimHidesTopic,
  aimNamesTopic: result.aimNamesTopic,
  kingHeroX: result.kingHeroX,
  matchBin: {
    minX: result.binMinX, maxX2: result.binMaxX2,
    minSide: result.binMinSide, cols: result.binCols,
    tray: result.vocabTrayPresent,
  },
  framesGutter: result.framesGutter,
  warmStarterText: result.warmStarterText,
  activityHintReadsFace: result.activityHintReadsFace,
  compBoardStaleInfer: result.compBoardStaleInfer,
  storyBodyInks: result.storyBodyInks,
  storyPageCount: result.storyPageCount,
  storyPropKeys: result.storyPropKeys,
  storyArt: storyArtMeta,
  activityHintTwoRound: result.activityHintTwoRound,
  midFlatUnique: result.midFlatUnique,
  pageFiles: result.pages.map((p) => `page-${p.index}-${p.key}.jpg`),
  pickedImages: picked,
  soft,
  fails,
  ok: fails.length === 0,
}, null, 2));

await browser.close();
close();
process.exit(fails.length ? 1 : 0);
