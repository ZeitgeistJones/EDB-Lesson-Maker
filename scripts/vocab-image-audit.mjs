/**
 * Vocab image reliability audit — generate many lessons, resolve each word
 * with the same VocabArt / VocabIcons ladder as board bake, write reports.
 *
 *   node scripts/vocab-image-audit.mjs
 *   node scripts/vocab-image-audit.mjs --count=50
 *   node scripts/vocab-image-audit.mjs --fixtures-only
 *   node scripts/vocab-image-audit.mjs --amusement-only
 *
 * Writes:
 *   tmp/vocab-image-audit/latest.json
 *   tmp/vocab-image-audit/report.md
 *   tmp/vocab-image-audit/words.csv
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const OUT_DIR = path.join(ROOT, 'tmp', 'vocab-image-audit');
const IMG_DIR = path.join(PUBLIC, 'assets', '07_vocab-pack', 'img');
const PROP_IMG = path.join(PUBLIC, 'assets', '09_props', 'img');

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
function hasFlag(name) {
  return process.argv.includes(`--${name}`);
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

/** Diverse topics — amusement park first so the known case is always audited. */
const TOPIC_POOL = [
  'Amusement Park',
  'At the Dentist',
  'Airport Adventure',
  'Day at the Zoo',
  'Beach Day Fun',
  'Morning at the Bakery',
  'School Classroom',
  'Parts of the Face',
  'Sports Day',
  'Train Station Trip',
  'Kitchen Helpers',
  'Farm Animals',
  'Weather Walk',
  'Supermarket Shopping',
  'Hotel Stay',
  'Doctor Visit',
  'Birthday Party',
  'City Bus Ride',
  'Garden Growing',
  'Library Quiet Time',
  'Clothes Closet',
  'Pet Care',
  'Music Class',
  'Volcano Science',
  'Swimming Pool',
  'Fruit Market',
  'Camping Night',
  'Fire Station',
  'Construction Site',
  'Aquarium Visit',
  'Castle Adventure',
  'Circus Day',
  'Cafe Order',
  'Space Exploration',
  'Playground Fun',
  'Bathroom Routines',
  'Feelings and Emotions',
  'Jobs in Town',
  'Recycling Center',
  'Photography Class',
  'Train Museum',
  'Soccer Practice',
  'Basketball Game',
  'Pizza Kitchen',
  'Rainforest Trek',
  'Snow Day',
  'Birthday Cake Bakery',
  'Police Station',
  'Post Office',
  'Market Vegetables',
];

const LEVELS = ['A1', 'A2', 'B1'];
const DURATIONS = ['30', '60'];

const AMUSEMENT_WORDS = [
  'ticket',
  'popcorn',
  'ferris wheel',
  'entrance',
  'rollercoaster',
  'prize',
];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function fileFetch(url) {
  const u = String(url).replace(/^\//, '');
  let rel = null;
  if (u.includes('07_vocab-pack/index')) rel = path.join(PUBLIC, 'assets/07_vocab-pack/index.json');
  else if (u.includes('propPolicy')) rel = path.join(PUBLIC, 'lib/propPolicy.json');
  else if (u.includes('09_props/manifest')) rel = path.join(PUBLIC, 'assets/09_props/manifest.json');
  else if (u.includes('08_backgrounds/manifest')) rel = path.join(PUBLIC, 'assets/08_backgrounds/manifest.json');
  else if (u.startsWith('assets/')) rel = path.join(PUBLIC, u);
  if (!rel || !fs.existsSync(rel)) {
    return Promise.resolve({
      ok: false,
      status: 404,
      json: async () => ({}),
      arrayBuffer: async () => new ArrayBuffer(0),
    });
  }
  const body = fs.readFileSync(rel);
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => JSON.parse(body.toString('utf8')),
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  });
}

async function loadLibs() {
  const packIndex = JSON.parse(
    fs.readFileSync(path.join(PUBLIC, 'assets/07_vocab-pack/index.json'), 'utf8')
  );
  const sandbox = {
    window: { __TOPIC_PACK_KEYS__: Object.keys(packIndex) },
    console,
    fetch: fileFetch,
    document: {
      createElement: (t) =>
        t !== 'canvas'
          ? {}
          : {
              width: 0,
              height: 0,
              getContext: () => new Proxy({}, { get: () => () => {} }),
              toDataURL: () => 'x',
            },
    },
  };
  vm.createContext(sandbox);
  for (const rel of [
    'public/lib/topicIdentity.js',
    'public/lib/producerQuality.js',
    'public/lib/propBank.js',
    'public/lib/vocabIcons.js',
    'public/lib/vocabArt.js',
    'public/lib/lessonTraits.js',
  ]) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
  }
  await sandbox.window.PropBank.ready();
  await sandbox.window.VocabIcons.ready();
  return sandbox.window;
}

function entryWord(v) {
  if (typeof v === 'string') return String(v);
  if (v && v.word) return String(v.word);
  return '';
}

function diskExistsForArtSrc(artSrc) {
  if (!artSrc) return false;
  const rel = String(artSrc).replace(/^\//, '');
  const abs = path.join(PUBLIC, rel);
  return fs.existsSync(abs);
}

/**
 * Same resolution checks as production bake (edbActivities.planVocabArt):
 * VocabIcons exact/plural/alias + VocabArt.planFor(allowPackFallback:true).
 */
function auditWord(W, lesson, word, boardSet) {
  const VI = W.VocabIcons;
  const slug = W.VocabArt.slug(word);
  const packPath = VI.pathForSync(word);
  const kind = VI.matchKindSync(word);
  const indexKey = packPath
    ? path.basename(packPath).replace(/\.png$/i, '')
    : null;
  const exactIndex =
    kind === 'exact' || kind === 'plural'
      ? true
      : !!(indexKey && (indexKey === slug || indexKey === String(word).toLowerCase().trim()));
  const packFileOk = packPath ? diskExistsForArtSrc(packPath) : false;

  const row = (lesson._auditRows || []).find(
    (r) => String(r.word).toLowerCase() === String(word).toLowerCase()
  );
  const tier = row ? row.tier : 'none';
  const artSrc = row ? row.artSrc : null;
  const glyph = row ? row.glyph : null;
  const matchable = row ? !!row.matchable : false;
  const onBoard = boardSet.has(String(word).toLowerCase());
  const artFileOk = artSrc ? diskExistsForArtSrc(artSrc) : false;

  let failureReason = null;
  let success = false;
  if (matchable && (artSrc || glyph)) {
    if (artSrc && !artFileOk) {
      failureReason = 'file missing';
    } else {
      success = true;
    }
  } else if (!packPath && !glyph && tier === 'none') {
    failureReason = exactIndex === false && !indexKey ? 'no exact key' : 'resolver returned null';
  } else if (packPath && !packFileOk) {
    failureReason = 'file missing';
  } else if (packPath && tier === 'none' && !glyph) {
    failureReason = 'silent blank slot';
  } else if (row && row.reason === 'sense-mismatch') {
    failureReason = 'sense-mismatch';
  } else if (tier === 'none') {
    failureReason = 'resolver returned null';
  } else {
    failureReason = 'render insertion failure';
  }

  // Refine no-key vs index-missing
  if (!success && !packPath) {
    const raw = String(word || '')
      .trim()
      .toLowerCase()
      .replace(/[^\w\s'-]/g, '')
      .replace(/\s+/g, ' ');
    const hyphen = raw.replace(/\s+/g, '-');
    const keys = VI.allKeys();
    const hasExact = keys.includes(raw) || keys.includes(hyphen) || keys.includes(slug);
    if (!hasExact) failureReason = 'no exact key';
    else failureReason = 'index entry missing';
  }

  return {
    word,
    normalizedKey: slug,
    indexKey: indexKey || null,
    matchKind: kind,
    exactIndexKeyFound: !!(kind === 'exact' || kind === 'plural' || (packPath && kind)),
    filePathResolved: !!packPath || !!artSrc,
    fileExistsOnDisk: packFileOk || artFileOk || (!!glyph && tier === 'glyph'),
    insertedIntoLesson: true,
    onBoard,
    tier,
    artSrc: artSrc || null,
    glyph: glyph || null,
    success,
    failureReason: success ? null : failureReason,
    outcome: success
      ? `ok (${tier}${artSrc ? ': ' + path.basename(artSrc) : glyph ? ': glyph' : ''})`
      : `FAIL (${failureReason})`,
  };
}

function auditLesson(W, lesson, meta) {
  const originalWords = (lesson.vocabulary || []).map(entryWord).filter(Boolean);
  const originalSet = new Set(originalWords.map((w) => String(w).toLowerCase()));

  const TI = W.TopicIdentity;
  const brief =
    lesson._topicBrief ||
    (TI && typeof TI.ensureBrief === 'function' ? TI.ensureBrief(lesson) : null);
  if (brief && typeof W.VocabArt.remapVocabEntriesToBrief === 'function') {
    W.VocabArt.remapVocabEntriesToBrief(lesson, brief);
  }
  // Fresh adapt each audit (clone vocab so we don't poison fixtures).
  delete lesson._vocabAdapted;
  const adapted = W.VocabArt.adaptBoardVocabulary(lesson, {
    seed: lesson.title,
    topicBrief: brief,
  });
  // Full-list plan (same flags as adapt scoring) so every original word gets a row.
  const art = W.VocabArt.planFor(lesson, {
    seed: lesson.title,
    allowPackFallback: true,
    topicBrief: brief,
    allWords: true,
    independent: true,
  });
  lesson._auditRows = art.rows || [];
  const boardSet = new Set((adapted.board || []).map((w) => String(w).toLowerCase()));

  // Score generated/fixture vocabulary only — not theme-bank inject fillers.
  const seen = new Set();
  const words = [];
  for (const w of originalWords) {
    const k = w.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    words.push(w);
  }
  // Remap may change a word (comb→honeycomb); include remapped forms still in lesson.
  for (const w of (lesson.vocabulary || []).map(entryWord).filter(Boolean)) {
    const k = w.toLowerCase();
    if (seen.has(k)) continue;
    if (!originalSet.has(k) && !(lesson.vocabulary || []).some((e) => e && e._themeBankFill)) {
      // remapped original
      seen.add(k);
      words.push(w);
    }
  }

  const wordRows = words.map((w) => auditWord(W, lesson, w, boardSet));
  const boardRows = wordRows.filter((r) => r.onBoard);
  const fails = wordRows.filter((r) => !r.success);
  const boardFails = boardRows.filter((r) => !r.success);

  return {
    id: meta.id,
    source: meta.source,
    topic: meta.topic || lesson.title,
    title: lesson.title,
    level: meta.level || lesson.level || null,
    duration: meta.duration || lesson.duration || null,
    adaptedBoard: adapted.board || [],
    adaptedOverflow: adapted.overflow || [],
    pictured: adapted.pictured,
    boardCount: adapted.boardCount,
    wordCount: wordRows.length,
    successCount: wordRows.filter((r) => r.success).length,
    failCount: fails.length,
    boardWordCount: boardRows.length,
    boardFailCount: boardFails.length,
    words: wordRows,
    failures: fails,
  };
}

function mockGenerate(handler, body) {
  return new Promise((resolve, reject) => {
    const req = { method: 'POST', body };
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) {
        this.headers[k] = v;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        resolve({ status: this.statusCode, data });
      },
    };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableGenerateFailure(status, data, errMsg) {
  const msg = String((data && data.error) || errMsg || '').toLowerCase();
  if (status === 429 || status === 503 || status === 502 || status === 504) return true;
  if (/rate|quota|timeout|temporar|unavailable|econnreset|fetch failed|socket|overloaded|503|429/.test(msg)) {
    return true;
  }
  return false;
}

async function generateOneLesson(handler, topic, level, duration, maxAttempts = 4) {
  let lastStatus = 0;
  let lastData = null;
  let lastErr = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { status, data } = await mockGenerate(handler, {
        topic,
        level,
        duration,
        phonics: 'off',
      });
      lastStatus = status;
      lastData = data;
      if (status < 400 && data && data.lesson) {
        return { ok: true, status, data, attempts: attempt };
      }
      if (!isRetryableGenerateFailure(status, data, null) || attempt === maxAttempts) {
        return { ok: false, status, data, attempts: attempt };
      }
      const wait = Math.min(30_000, 1500 * 2 ** (attempt - 1));
      process.stdout.write(`retry${attempt}/${maxAttempts} ${wait}ms… `);
      await sleep(wait);
    } catch (err) {
      lastErr = err;
      const msg = String(err && err.message ? err.message : err);
      if (!isRetryableGenerateFailure(0, null, msg) || attempt === maxAttempts) {
        return { ok: false, status: 0, data: null, error: msg, attempts: attempt };
      }
      const wait = Math.min(30_000, 1500 * 2 ** (attempt - 1));
      process.stdout.write(`retry${attempt}/${maxAttempts} ${wait}ms… `);
      await sleep(wait);
    }
  }
  return {
    ok: false,
    status: lastStatus,
    data: lastData,
    error: lastErr ? String(lastErr.message || lastErr) : null,
    attempts: maxAttempts,
  };
}

async function generateLessons(count) {
  loadEnv();
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[vocab-image-audit] GEMINI_API_KEY missing — skipping live generation');
    return [];
  }
  const handler = require('../api/generate-lesson.js');
  const out = [];
  for (let i = 0; i < count; i++) {
    const topic = TOPIC_POOL[i % TOPIC_POOL.length];
    const level = LEVELS[i % LEVELS.length];
    const duration = DURATIONS[i % DURATIONS.length];
    process.stdout.write(`  generate ${i + 1}/${count}: ${topic} (${level}/${duration})… `);
    const result = await generateOneLesson(handler, topic, level, duration, 4);
    if (result.ok) {
      console.log(
        `OK "${result.data.lesson.title}" vocab=${(result.data.lesson.vocabulary || []).length}` +
          (result.attempts > 1 ? ` (after ${result.attempts} tries)` : '')
      );
      out.push({
        error: false,
        id: `gen-${String(i + 1).padStart(3, '0')}`,
        source: 'generate-lesson',
        topic,
        level,
        duration,
        lesson: result.data.lesson,
      });
      continue;
    }
    const msg =
      (result.data && result.data.error) ||
      result.error ||
      (result.status ? `HTTP ${result.status}` : 'generate failed');
    console.log(`FAIL ${msg}`);
    out.push({
      error: true,
      id: `gen-${String(i + 1).padStart(3, '0')}`,
      topic,
      level,
      duration,
      message: msg,
    });
  }
  return out;
}

function loadFixtures() {
  const dir = path.join(ROOT, 'scripts', 'fixtures');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('-lesson.json'))
    .sort()
    .map((f, i) => {
      const lesson = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      return {
        error: false,
        id: `fix-${String(i + 1).padStart(3, '0')}`,
        source: `fixture:${f}`,
        topic: lesson.title || f,
        level: lesson.level || null,
        duration: lesson.duration || null,
        lesson,
      };
    });
}

function amusementSynthetic() {
  return {
    error: false,
    id: 'amusement-debug',
    source: 'synthetic:amusement-park',
    topic: 'Amusement Park',
    level: 'A1',
    duration: '30',
    lesson: {
      title: 'Amusement Park Fun',
      level: 'A1',
      duration: 30,
      vocabulary: AMUSEMENT_WORDS.map((word) => ({
        word,
        emoji: '•',
        sentence: `I see a ${word}.`,
      })),
    },
  };
}

function csvEscape(v) {
  const s = String(v == null ? '' : v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildReport(audits, genErrors, amusementDetail) {
  const lessons = audits.length;
  const allWords = audits.flatMap((a) => a.words);
  const totalWords = allWords.length;
  const successes = allWords.filter((w) => w.success).length;
  const failures = allWords.filter((w) => !w.success).length;
  const boardWords = allWords.filter((w) => w.onBoard);
  const boardFails = boardWords.filter((w) => !w.success);

  const zeroMissing = audits.filter((a) => a.boardFailCount === 0).length;
  const atLeastOne = audits.filter((a) => a.boardFailCount >= 1).length;
  const multiple = audits.filter((a) => a.boardFailCount >= 2).length;

  const byReason = new Map();
  for (const w of allWords.filter((x) => !x.success)) {
    const r = w.failureReason || 'unknown';
    byReason.set(r, (byReason.get(r) || 0) + 1);
  }
  const reasons = [...byReason.entries()].sort((a, b) => b[1] - a[1]);

  const byWord = new Map();
  for (const w of allWords.filter((x) => !x.success)) {
    const k = w.normalizedKey || w.word;
    byWord.set(k, (byWord.get(k) || 0) + 1);
  }
  const worstWords = [...byWord.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);

  const byPattern = new Map();
  for (const w of allWords.filter((x) => !x.success)) {
    const k = w.normalizedKey || '';
    let pat = 'other';
    if (!k) pat = 'empty';
    else if (k.includes('-')) pat = 'hyphenated';
    else if (/^[a-z]+$/.test(k) && k.length > 12) pat = 'long-closed-compound';
    else if (/^[a-z]+$/.test(k)) pat = 'single-token';
    else pat = 'spaced-or-punct';
    byPattern.set(pat, (byPattern.get(pat) || 0) + 1);
  }

  const byTopic = new Map();
  for (const a of audits) {
    const t = a.topic || a.title;
    const cur = byTopic.get(t) || { lessons: 0, words: 0, fails: 0 };
    cur.lessons += 1;
    cur.words += a.wordCount;
    cur.fails += a.failCount;
    byTopic.set(t, cur);
  }
  const worstTopics = [...byTopic.entries()]
    .map(([topic, s]) => ({
      topic,
      lessons: s.lessons,
      failRate: s.words ? s.fails / s.words : 0,
      fails: s.fails,
      words: s.words,
    }))
    .sort((a, b) => b.failRate - a.failRate || b.fails - a.fails)
    .slice(0, 15);

  const lines = [];
  lines.push('# Vocab image audit');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Overall');
  lines.push('');
  lines.push(`- Lessons audited: **${lessons}**`);
  lines.push(`- Generate errors (excluded): **${genErrors.length}**`);
  lines.push(`- Total vocab words: **${totalWords}**`);
  lines.push(`- Successes: **${successes}** (${totalWords ? ((100 * successes) / totalWords).toFixed(1) : 0}%)`);
  lines.push(`- Failures: **${failures}** (${totalWords ? ((100 * failures) / totalWords).toFixed(1) : 0}%)`);
  lines.push(`- Board-slice words: **${boardWords.length}** · board failures: **${boardFails.length}** (${boardWords.length ? ((100 * boardFails.length) / boardWords.length).toFixed(1) : 0}%)`);
  lines.push('');
  lines.push('## Lesson-level (board slice)');
  lines.push('');
  lines.push(`- Zero missing: **${zeroMissing}** / ${lessons}`);
  lines.push(`- ≥1 missing: **${atLeastOne}** / ${lessons}`);
  lines.push(`- Multiple missing (≥2): **${multiple}** / ${lessons}`);
  lines.push('');
  lines.push('## Failure causes');
  lines.push('');
  for (const [reason, n] of reasons) {
    lines.push(`- \`${reason}\`: ${n}`);
  }
  if (!reasons.length) lines.push('- (none)');
  lines.push('');
  lines.push('## Worst offender words');
  lines.push('');
  for (const [word, n] of worstWords) {
    lines.push(`- \`${word}\`: ${n}`);
  }
  if (!worstWords.length) lines.push('- (none)');
  lines.push('');
  lines.push('## Failure key patterns');
  lines.push('');
  for (const [pat, n] of [...byPattern.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${pat}: ${n}`);
  }
  lines.push('');
  lines.push('## Topics with highest fail rate');
  lines.push('');
  for (const t of worstTopics) {
    lines.push(
      `- ${t.topic}: ${(100 * t.failRate).toFixed(1)}% (${t.fails}/${t.words} across ${t.lessons} lesson(s))`
    );
  }
  lines.push('');
  lines.push('## Amusement-park debug');
  lines.push('');
  if (amusementDetail) {
    lines.push('| word | normalized key | exact index? | path resolved? | file on disk? | on board? | outcome | failure reason |');
    lines.push('|---|---|---|---|---|---|---|---|');
    for (const w of amusementDetail.words) {
      lines.push(
        `| ${w.word} | ${w.normalizedKey} | ${w.exactIndexKeyFound ? 'yes' : 'no'} | ${w.filePathResolved ? 'yes' : 'no'} | ${w.fileExistsOnDisk ? 'yes' : 'no'} | ${w.onBoard ? 'yes' : 'no'} | ${w.outcome} | ${w.failureReason || '—'} |`
      );
    }
    lines.push('');
    lines.push(
      `Board after adapt: ${(amusementDetail.adaptedBoard || []).join(', ') || '(none)'}`
    );
    lines.push(
      `Overflow: ${(amusementDetail.adaptedOverflow || []).join(', ') || '(none)'}`
    );
  } else {
    lines.push('(not run)');
  }
  lines.push('');
  lines.push('## Single best fix (producer)');
  lines.push('');
  const topReason = reasons[0] ? reasons[0][0] : null;
  const topWord = worstWords[0] ? worstWords[0][0] : null;
  if (topReason === 'no exact key') {
    lines.push(
      `**Commission pack art for top missing keys** (dominant failure: \`no exact key\`, ${reasons[0][1]} hits).` +
        (topWord ? ` Worst offender: \`${topWord}\`.` : '') +
        ' Prefer dedicated pack rows over wrong aliases (e.g. do not map `rollercoaster` → drink `coaster`).' +
        ' Keep the closed-compound→hyphen bridge in `VocabIcons.resolveKey` for Gemini spellings like `ferriswheel`.'
    );
  } else if (topReason === 'file missing') {
    lines.push(
      `**Repair / re-import missing image files** (dominant failure: \`file missing\`, ${reasons[0][1]} hits).` +
        (topWord ? ` Start with \`${topWord}\`.` : '')
    );
  } else if (topReason === 'sense-mismatch') {
    lines.push(
      `**Tighten sense gating / aliases** (dominant failure: \`sense-mismatch\`, ${reasons[0][1]} hits).` +
        (topWord ? ` Worst offender: \`${topWord}\`.` : '')
    );
  } else if (topReason) {
    lines.push(
      `**Address \`${topReason}\` first** (${reasons[0][1]} hits).` +
        (topWord ? ` Worst offender word: \`${topWord}\`.` : '')
    );
  } else {
    lines.push('No vocabulary image failures in this run.');
  }
  lines.push('');
  lines.push(
    'Amusement-park known gap: `rollercoaster` / `roller-coaster` has no pack row (adapt moves it off board). Commission `roller-coaster.png`.'
  );
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const count = Math.max(1, Number(arg('count', '50')) || 50);
  const fixturesOnly = hasFlag('fixtures-only');
  const amusementOnly = hasFlag('amusement-only');

  ensureDir(OUT_DIR);
  console.log('[vocab-image-audit] loading VocabArt sandbox…');
  const W = await loadLibs();

  const amusement = auditLesson(W, structuredClone(amusementSynthetic().lesson), {
    id: 'amusement-debug',
    source: 'synthetic:amusement-park',
    topic: 'Amusement Park',
    level: 'A1',
    duration: '30',
  });
  console.log('[vocab-image-audit] amusement-park:');
  for (const w of amusement.words) {
    console.log(
      `  ${w.word.padEnd(16)} ${w.success ? 'OK' : 'FAIL'}  ${w.outcome}${w.onBoard ? '' : ' (overflow)'}`
    );
  }

  if (amusementOnly) {
    const payload = {
      generatedAt: new Date().toISOString(),
      lessonCount: 1,
      amusement,
      lessons: [amusement],
    };
    fs.writeFileSync(path.join(OUT_DIR, 'latest.json'), `${JSON.stringify(payload, null, 2)}\n`);
    fs.writeFileSync(path.join(OUT_DIR, 'report.md'), buildReport([amusement], [], amusement));
    console.log(`Wrote ${path.join(OUT_DIR, 'report.md')}`);
    return;
  }

  let sources = [];
  if (fixturesOnly) {
    sources = loadFixtures();
    console.log(`[vocab-image-audit] fixtures-only: ${sources.length}`);
  } else {
    console.log(`[vocab-image-audit] generating up to ${count} lessons…`);
    sources = await generateLessons(count);
    // Always include fixtures as a free extra sample when generating.
    const fixtures = loadFixtures();
    console.log(`[vocab-image-audit] also auditing ${fixtures.length} fixtures`);
    sources = sources.concat(fixtures);
  }

  // Always include the amusement synthetic case.
  sources = [amusementSynthetic(), ...sources];

  const audits = [];
  const genErrors = [];
  for (const src of sources) {
    if (src.error) {
      genErrors.push(src);
      continue;
    }
    try {
      const lesson = structuredClone(src.lesson);
      const audited = auditLesson(W, lesson, src);
      audits.push(audited);
      if (audited.failCount) {
        console.warn(
          `[vocab-image-audit] ${audited.id} "${audited.title}": ${audited.failCount}/${audited.wordCount} vocab image failures`
        );
        for (const f of audited.failures.slice(0, 8)) {
          console.warn(`    - ${f.word}: ${f.failureReason}`);
        }
      }
    } catch (err) {
      console.warn(`[vocab-image-audit] audit failed ${src.id}:`, err.message || err);
      genErrors.push({
        error: true,
        id: src.id,
        topic: src.topic,
        message: String(err.message || err),
      });
    }
  }

  const amusementAudited = audits.find((a) => a.id === 'amusement-debug') || amusement;

  const csvHeader = [
    'lesson_id',
    'source',
    'topic',
    'title',
    'level',
    'duration',
    'word',
    'normalized_key',
    'index_key',
    'match_kind',
    'on_board',
    'tier',
    'success',
    'failure_reason',
    'art_src',
  ];
  const csvLines = [csvHeader.join(',')];
  for (const a of audits) {
    for (const w of a.words) {
      csvLines.push(
        [
          a.id,
          a.source,
          a.topic,
          a.title,
          a.level,
          a.duration,
          w.word,
          w.normalizedKey,
          w.indexKey,
          w.matchKind,
          w.onBoard,
          w.tier,
          w.success,
          w.failureReason,
          w.artSrc,
        ]
          .map(csvEscape)
          .join(',')
      );
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    lessonCount: audits.length,
    generateErrors: genErrors.length,
    summary: {
      totalWords: audits.reduce((n, a) => n + a.wordCount, 0),
      successes: audits.reduce((n, a) => n + a.successCount, 0),
      failures: audits.reduce((n, a) => n + a.failCount, 0),
      lessonsZeroBoardMissing: audits.filter((a) => a.boardFailCount === 0).length,
      lessonsWithBoardMissing: audits.filter((a) => a.boardFailCount >= 1).length,
      lessonsMultiBoardMissing: audits.filter((a) => a.boardFailCount >= 2).length,
    },
    amusement: amusementAudited,
    lessons: audits,
    errors: genErrors,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'latest.json'), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'words.csv'), `${csvLines.join('\n')}\n`);
  fs.writeFileSync(
    path.join(OUT_DIR, 'report.md'),
    buildReport(audits, genErrors, amusementAudited)
  );

  console.log('\n[vocab-image-audit] done');
  console.log(`  lessons: ${audits.length}`);
  console.log(`  words: ${payload.summary.totalWords}  fail: ${payload.summary.failures}`);
  console.log(`  report: ${path.join(OUT_DIR, 'report.md')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
