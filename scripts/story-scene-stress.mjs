/**
 * Story-scene v1 stress test — real Gemini-generated A1/A2/B1 lessons.
 * Classify beats → bind storyScene → compose against PropBank → score honesty.
 * No new assets. No fixes. Pre-A1 is out of scope.
 *
 *   node scripts/story-scene-stress.mjs
 *   node scripts/story-scene-stress.mjs --count=36
 *   node scripts/story-scene-stress.mjs --classify-only   # reuse lessons/
 *   node scripts/story-scene-stress.mjs --compose-only    # reuse classified.json
 *   node scripts/story-scene-stress.mjs --sheets-only     # rebake contact sheets
 *
 * Writes tmp/story-scene-stress/
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tmp', 'story-scene-stress');
const LESSON_DIR = path.join(OUT, 'lessons');
const TEMPLATES = [
  'charObject',
  'dialogue',
  'exchange',
  'action',
  'group3',
  'travel',
  'heroFocus',
  'locationActivity',
];

const TOPICS = [
  'School Classroom',
  'Library Quiet Time',
  'Morning at the Bakery',
  'Cafe Order',
  'Fruit Market',
  'Kitchen Helpers',
  'Supermarket Shopping',
  'Morning at Home',
  'Family Dinner',
  'Day at the Zoo',
  'Pet Care',
  'Farm Animals',
  'Doctor Visit',
  'At the Dentist',
  'Clothes Closet',
  'Weather Walk',
  'Sports Day',
  'Soccer Practice',
  'Swimming Pool',
  'Train Station Trip',
  'City Bus Ride',
  'Airport Adventure',
  'Hotel Stay',
  'Fire Station',
  'Construction Site',
  'Playground Fun',
  'Beach Day Fun',
  'Music Class',
  'Birthday Party',
  'Post Office Visit',
  'Aquarium Visit',
  'Camping Night',
  'Basketball Game',
  'Pizza Kitchen',
  'Police Helper Day',
  'Market Day',
];

const LEVELS = ['A1', 'A2', 'B1'];
const CAST_WHO = new Set(['mia', 'leo']);
const FAMILY_MAP = {
  mom: 'family-mom',
  mother: 'family-mom',
  dad: 'family-dad',
  father: 'family-dad',
  grandma: 'family-grandma',
  grandpa: 'family-grandpa',
  aunt: 'family-aunt',
  uncle: 'family-uncle',
  baby: 'family-baby',
  teacher: 'job-teacher',
  doctor: 'job-doctor',
  nurse: 'job-nurse',
  adult: 'family-mom',
  parent: 'family-mom',
  kid: null, // assigned mia/leo with continuity
  child: null,
  boy: 'leo',
  girl: 'mia',
  sam: 'leo',
  ben: 'leo',
  tom: 'leo',
};

const REUSABLE_POSES = new Set(['idle', 'hold', 'walk', 'talk', 'sit', 'listen', 'reach']);
const DEDICATED = new Set([
  'kick', 'climb', 'eat', 'drink', 'throw', 'catch', 'jump', 'bounce', 'swim', 'ride',
  'brush', 'wave', 'juggle', 'swing', 'push', 'pull', 'dance', 'sleep', 'write', 'draw',
  'mix', 'lift', 'score', 'pass',
]);

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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

function isRetryable(status, data, errMsg) {
  const msg = String((data && data.error) || errMsg || '').toLowerCase();
  if ([429, 502, 503, 504].includes(status)) return true;
  return /rate|quota|timeout|temporar|unavailable|econnreset|fetch failed|overloaded|429|503/.test(msg);
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
        duration: String(duration),
        phonics: 'off',
      });
      lastStatus = status;
      lastData = data;
      if (status < 400 && data && data.lesson) return { ok: true, status, data, attempts: attempt };
      if (!isRetryable(status, data, null) || attempt === maxAttempts) {
        return { ok: false, status, data, attempts: attempt };
      }
      await sleep(Math.min(30_000, 1500 * 2 ** (attempt - 1)));
    } catch (err) {
      lastErr = err;
      const msg = String(err && err.message ? err.message : err);
      if (!isRetryable(0, null, msg) || attempt === maxAttempts) {
        return { ok: false, status: 0, data: null, error: msg, attempts: attempt };
      }
      await sleep(Math.min(30_000, 1500 * 2 ** (attempt - 1)));
    }
  }
  return {
    ok: false,
    status: lastStatus,
    data: lastData,
    error: lastErr && String(lastErr.message || lastErr),
    attempts: maxAttempts,
  };
}

function loadPropKeys() {
  const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/assets/09_props/manifest.json'), 'utf8'));
  return new Set(Object.keys(m.props || {}));
}

function resolvePropLemma(lemma, propKeys) {
  const raw = String(lemma || '')
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, '-');
  if (!raw) return { key: null, ok: false };
  if (propKeys.has(raw)) return { key: raw, ok: true };
  // Common aliases
  const aliases = {
    ball: 'soccer-ball',
    book: 'sch-hardcover-book',
    desk: 'sch-desk',
    ticket: 'circus-ticket-roll',
    bus: 'city-bus-stop',
    'bus-stop': 'city-bus-stop',
    lion: 'animal-lion',
    dog: 'animal-dog',
    cat: 'animal-cat',
    bear: 'animal-bear',
    sheep: 'animal-sheep',
    pig: 'animal-pig',
    horse: 'animal-horse',
    duck: 'animal-duck',
    counter: 'cafe-counter',
    table: 'cafe-counter',
    backpack: 'sch-backpack',
  };
  if (aliases[raw] && propKeys.has(aliases[raw])) return { key: aliases[raw], ok: true };
  // Suffix / contains match (prefer shorter keys)
  const hits = [...propKeys].filter((k) => k === raw || k.endsWith('-' + raw) || k.includes(raw));
  hits.sort((a, b) => a.length - b.length);
  if (hits[0]) return { key: hits[0], ok: true, fuzzy: true };
  return { key: raw, ok: false };
}

function extractVerbs(text) {
  const t = String(text || '').toLowerCase();
  const re =
    /\b(finds?|looks?|sees?|holds?|gives?|takes?|puts?|sits?|walks?|runs?|kicks?|climbs?|eats?|drinks?|reads?|opens?|closes?|plays?|throws?|catches?|jumps?|bounces?|pushes?|pulls?|wears?|shows?|shares?|buys?|orders?|washes?|brushes?|cleans?|waits?|waves?|points?|picks?|carries?|rides?|flies?|swims?|draws?|writes?|sings?|dances?|sleeps?|stands?|touches?|passes?|scores?|mixes?|lifts?|talks?|listens?|asks?|says?|goes?|comes?|arrives?|leaves?)\b/g;
  return [...new Set(t.match(re) || [])];
}

function poseHonest(pose, text) {
  const verbs = extractVerbs(text);
  const poseN = String(pose || 'idle').toLowerCase();
  const issues = [];
  for (const v of verbs) {
    const base = v.replace(/s$/, '');
    if (DEDICATED.has(v) || DEDICATED.has(base)) {
      if (poseN !== v && poseN !== base) {
        issues.push({ verb: v, need: base, chosen: poseN, kind: 'missing_pose' });
      }
    }
  }
  // Kick/climb etc. mapped onto walk/idle
  if ((/kick/.test(text) && poseN === 'walk') || (/climb/.test(text) && poseN === 'walk')) {
    issues.push({ verb: 'action', need: 'dedicated', chosen: poseN, kind: 'semantic_mismatch' });
  }
  return { ok: issues.length === 0, issues, verbs };
}

function assignWho(label, continuity) {
  const who = String(label || 'kid').toLowerCase().trim();
  if (CAST_WHO.has(who)) {
    continuity.kids.add(who);
    return { kind: 'cast', who };
  }
  if (FAMILY_MAP[who] === null || who === 'kid' || who === 'child') {
    // Continuity: reuse first kid, else alternate mia/leo
    if (continuity.kids.has('mia') && !continuity.kids.has('leo')) {
      continuity.kids.add('mia');
      return { kind: 'cast', who: 'mia' };
    }
    if (continuity.kids.has('leo') && !continuity.kids.has('mia')) {
      continuity.kids.add('leo');
      return { kind: 'cast', who: 'leo' };
    }
    const next = continuity.kidToggle ? 'leo' : 'mia';
    continuity.kidToggle = !continuity.kidToggle;
    continuity.kids.add(next);
    return { kind: 'cast', who: next };
  }
  if (FAMILY_MAP[who] && (FAMILY_MAP[who] === 'leo' || FAMILY_MAP[who] === 'mia')) {
    continuity.kids.add(FAMILY_MAP[who]);
    return { kind: 'cast', who: FAMILY_MAP[who] };
  }
  if (FAMILY_MAP[who]) {
    return { kind: 'prop', propKey: FAMILY_MAP[who], roleLabel: who };
  }
  // Unknown adult/role
  return { kind: 'missing_cast', who, propKey: null };
}

function bindStoryScene(classify, propKeys, continuity) {
  const templateId = classify.templateId;
  if (!TEMPLATES.includes(templateId)) {
    return { storyScene: null, flags: { unfit: true, reason: classify.unfitReason || 'UNFIT' } };
  }
  const flags = {
    missingPose: [],
    missingCast: [],
    missingProp: [],
    missingEnv: [],
    fuzzyProps: [],
  };
  const chars = Array.isArray(classify.characters) ? classify.characters : [];
  const props = Array.isArray(classify.props) ? classify.props : [];
  const env = Array.isArray(classify.environment) ? classify.environment : [];

  const resolvedChars = chars.map((c) => {
    const assigned = assignWho(c.who, continuity);
    let pose = String(c.pose || 'idle').toLowerCase();
    if (!REUSABLE_POSES.has(pose)) {
      flags.missingPose.push(pose);
      // Do not silently remap dedicated → idle in the bind; leave as requested for honesty scoring
    }
    if (assigned.kind === 'missing_cast') flags.missingCast.push(assigned.who);
    return { ...c, assigned, pose };
  });

  const resolvedProps = props.map((p) => {
    const r = resolvePropLemma(p, propKeys);
    if (!r.ok) flags.missingProp.push(p);
    else if (r.fuzzy) flags.fuzzyProps.push({ from: p, to: r.key });
    return { lemma: p, ...r };
  });
  const resolvedEnv = env.map((e) => {
    const r = resolvePropLemma(e, propKeys);
    if (!r.ok) flags.missingEnv.push(e);
    else if (r.fuzzy) flags.fuzzyProps.push({ from: e, to: r.key });
    return { lemma: e, ...r };
  });

  const slots = {};
  const fillChar = (c, facing) => {
    if (!c) return null;
    if (c.assigned.kind === 'cast') {
      return {
        who: c.assigned.who,
        pose: REUSABLE_POSES.has(c.pose) ? c.pose : c.pose, // keep for honesty; compose may omit
        emotion: c.emotion || 'happy',
        facing,
        actionPose: !REUSABLE_POSES.has(c.pose) ? true : undefined,
      };
    }
    if (c.assigned.kind === 'prop' && c.assigned.propKey) {
      return { propKey: c.assigned.propKey, scaleClass: 'actor', facing: facing || 'front' };
    }
    return null;
  };

  const byRole = (role) => resolvedChars.find((c) => String(c.role || '').toLowerCase() === role);
  const first = resolvedChars[0];
  const second = resolvedChars[1];
  const third = resolvedChars[2];
  const prop0 = resolvedProps.find((p) => p.ok);
  const env0 = resolvedEnv.find((e) => e.ok);

  if (templateId === 'charObject') {
    const a = fillChar(byRole('actor') || first, 'right');
    if (a) slots.actor = a;
    if (prop0) slots.object = { propKey: prop0.key };
  } else if (templateId === 'action') {
    const a = fillChar(byRole('actor') || first, 'right');
    if (a) slots.actor = a;
    if (prop0) slots.support = { propKey: prop0.key };
  } else if (templateId === 'exchange') {
    const g = fillChar(byRole('giver') || first, 'right');
    const r = fillChar(byRole('receiver') || second, 'left');
    if (g) slots.giver = g;
    if (r) slots.receiver = r;
    if (prop0) slots.item = { propKey: prop0.key, scaleClass: 'held' };
  } else if (templateId === 'dialogue') {
    const a = fillChar(byRole('speakerA') || first, 'right');
    const b = fillChar(byRole('speakerB') || second, 'left');
    if (a) {
      if (!a.pose || a.pose === 'idle') a.pose = 'talk';
      slots.speakerA = a;
    }
    if (b) {
      if (!b.pose || b.pose === 'idle') b.pose = 'listen';
      slots.speakerB = b;
    }
  } else if (templateId === 'group3') {
    const L = fillChar(byRole('left') || first, 'right');
    const C = fillChar(byRole('center') || third || second, 'front');
    const R = fillChar(byRole('right') || second || third, 'left');
    if (L) slots.left = L;
    if (C) slots.center = C;
    if (R) slots.right = R;
  } else if (templateId === 'travel') {
    const a = fillChar(byRole('actor') || first, 'right');
    if (a) {
      if (!a.pose || a.pose === 'idle') a.pose = 'walk';
      slots.actor = a;
    }
    const goal = env0 || prop0;
    if (goal) slots.vehicleOrGoal = { propKey: goal.key, scaleClass: /truck|bus|car|boat|ship/.test(goal.key) ? 'vehicle' : 'landmark' };
  } else if (templateId === 'heroFocus') {
    const hero = prop0 || env0;
    if (hero) slots.hero = { propKey: hero.key, scaleClass: 'hero' };
    const w = fillChar(byRole('witness') || byRole('actor') || first, 'right');
    if (w) slots.witness = w;
  } else if (templateId === 'locationActivity') {
    if (env0) slots.backdrop = { propKey: env0.key, scaleClass: 'furniture' };
    const a = fillChar(byRole('actor') || first, 'right');
    if (a) slots.actor = a;
    const b = fillChar(byRole('actorB') || second, 'left');
    if (b) slots.actorB = b;
    if (prop0) slots.prop = { propKey: prop0.key };
  }

  const primaryPose =
    (slots.actor && slots.actor.pose) ||
    (slots.speakerA && slots.speakerA.pose) ||
    (slots.giver && slots.giver.pose) ||
    (slots.center && slots.center.pose) ||
    (slots.witness && slots.witness.pose) ||
    null;

  return {
    storyScene: {
      templateId,
      actionVerb: extractVerbs(classify._text || '')[0] || null,
      slots,
    },
    flags,
    primaryPose,
    resolvedChars,
    resolvedProps,
    resolvedEnv,
  };
}

async function classifyBatch(beats, batchIndex) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const key = process.env.GEMINI_API_KEY;
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `You classify ESL story beats into composable scene templates for ClassIn boards.

ALLOWED templates ONLY:
${TEMPLATES.join(', ')}

Definitions:
- charObject: one character with a focus object/thing
- dialogue: two people talking (no object transfer)
- exchange: give/take/show/hand an item between people
- action: one character performing a clear physical action (with optional support prop)
- group3: three or more people together as the focus
- travel: going, arriving, leaving, riding, walking toward a destination/vehicle
- heroFocus: one large object/place feature dominates; people optional/tiny
- locationActivity: place backdrop + character doing something there

If a beat truly cannot fit, set templateId to "UNFIT". Prefer fitting.
Closed pose set: idle, talk, listen, hold, walk, reach, sit
If the beat needs kick/climb/eat/throw/etc., still set templateId but use the TRUE pose name (kick, climb…) — do NOT fake walk/idle.
Closed emotion: neutral, happy, worried (or null)
Normalize props/env to short English lemmas.

Return ONLY JSON:
{"rows":[{"id":"...","templateId":"...","characters":[{"who":"mia|leo|adult|teacher|doctor|kid|mom|dad|...","role":"actor|speakerA|giver|receiver|left|center|right|witness|...","pose":"...","emotion":null|"happy"}],"props":["..."],"environment":["..."],"unfitReason":null}]}

Beats:
${JSON.stringify(
  beats.map((b) => ({
    id: b.id,
    level: b.level,
    topic: b.topic,
    heading: b.heading,
    text: b.text,
    visualTheme: b.visualTheme,
    visualCaption: b.visualCaption,
  })),
  null,
  2
)}`,
          },
        ],
      },
    ],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(`classify batch ${batchIndex} HTTP ${resp.status}: ${JSON.stringify(data).slice(0, 400)}`);
  }
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error(`classify batch ${batchIndex}: non-JSON`);
    parsed = JSON.parse(m[0]);
  }
  return Array.isArray(parsed.rows) ? parsed.rows : [];
}

function tally(list) {
  const m = new Map();
  for (const x of list) {
    const k = String(x || '').toLowerCase().trim();
    if (!k) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function pct(n, d) {
  return d ? ((100 * n) / d).toFixed(1) : '0.0';
}

function scoreRow(row) {
  const f = row.flags || {};
  const problems = [];
  if (row.unfit) problems.push('unfit');
  if (f.missingPose && f.missingPose.length) problems.push('missing_pose');
  if (f.missingCast && f.missingCast.length) problems.push('missing_cast');
  if (f.missingProp && f.missingProp.length) problems.push('missing_prop');
  if (f.missingEnv && f.missingEnv.length) problems.push('missing_env');
  if (row.honesty && !row.honesty.ok) problems.push('semantic_mismatch');
  if (row.compose && row.compose.layerCount === 0) problems.push('blank_art');
  if (row.compose && row.compose.warnings && row.compose.warnings.length) problems.push('compose_warn');
  if (row.fallbackNeeded) problems.push('fallback');
  if (row.layoutIssues && row.layoutIssues.length) problems.push('layout');
  if (row.producerRewrite) problems.push('producer_rewrite');
  if (row.continuityBroken) problems.push('continuity');

  const assetsOk =
    !(f.missingCast && f.missingCast.length) &&
    !(f.missingProp && f.missingProp.length && row.templateId !== 'dialogue' && row.templateId !== 'group3') &&
    !(f.missingEnv && f.missingEnv.length && (row.templateId === 'locationActivity' || row.templateId === 'travel'));

  // Soft: dialogue/group3 may not need props
  const composed =
    row.compose &&
    row.compose.layerCount >= (row.templateId === 'dialogue' || row.templateId === 'group3' ? 2 : 1);

  const success =
    !row.unfit &&
    composed &&
    (row.honesty ? row.honesty.ok : true) &&
    !row.fallbackNeeded &&
    !(f.missingPose && f.missingPose.length);

  return {
    success: !!success,
    fallback: !!row.fallbackNeeded || !composed || !!(f.missingCast && f.missingCast.length),
    semanticOrVisual: problems.some((p) =>
      ['semantic_mismatch', 'missing_pose', 'blank_art', 'layout', 'continuity'].includes(p)
    ),
    problems,
    assetsOk,
    composed: !!composed,
  };
}

function levelStats(rows, level) {
  const subset = level ? rows.filter((r) => r.level === level) : rows;
  const scored = subset.map((r) => ({ ...r, score: scoreRow(r) }));
  const n = scored.length;
  const success = scored.filter((r) => r.score.success).length;
  const fallback = scored.filter((r) => r.score.fallback).length;
  const sem = scored.filter((r) => r.score.semanticOrVisual).length;
  const tpl = {};
  for (const t of TEMPLATES) tpl[t] = 0;
  for (const r of scored) if (tpl[r.templateId] != null) tpl[r.templateId] += 1;

  const missingPose = [];
  const missingCast = [];
  const missingEnv = [];
  const missingProp = [];
  for (const r of scored) {
    for (const x of (r.flags && r.flags.missingPose) || []) missingPose.push(x);
    for (const x of (r.flags && r.flags.missingCast) || []) missingCast.push(x);
    for (const x of (r.flags && r.flags.missingEnv) || []) missingEnv.push(x);
    for (const x of (r.flags && r.flags.missingProp) || []) missingProp.push(x);
    for (const iss of (r.honesty && r.honesty.issues) || []) {
      if (iss.kind === 'missing_pose') missingPose.push(iss.need);
    }
  }

  return {
    level: level || 'ALL',
    beats: n,
    lessons: new Set(scored.map((r) => r.lessonId)).size,
    successPct: pct(success, n),
    successN: success,
    fallbackPct: pct(fallback, n),
    fallbackN: fallback,
    semanticVisualPct: pct(sem, n),
    semanticVisualN: sem,
    templateDist: tpl,
    missingPoses: tally(missingPose).slice(0, 12),
    missingCast: tally(missingCast).slice(0, 12),
    missingEnv: tally(missingEnv).slice(0, 12),
    missingProp: tally(missingProp).slice(0, 12),
    scored,
  };
}

function writeReport(allRows, lessonMeta) {
  const all = levelStats(allRows, null);
  const byLevel = LEVELS.map((lv) => levelStats(allRows, lv));
  const lines = [];
  lines.push('# Story-scene v1 stress test');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('Real Gemini lessons only (no hand fixtures). Pre-A1 not included.');
  lines.push('Producer does not emit `storyScene` yet — beats classified then bound for compose.');
  lines.push('');
  lines.push('## Totals');
  lines.push('');
  lines.push(`- Lessons: **${lessonMeta.okLessons}** (requested ${lessonMeta.requested})`);
  lines.push(`- Story beats: **${all.beats}**`);
  lines.push(`- Successfully composited (honest + assets + layers): **${all.successPct}%** (${all.successN}/${all.beats})`);
  lines.push(`- Requiring fallback: **${all.fallbackPct}%** (${all.fallbackN}/${all.beats})`);
  lines.push(`- Semantic/visual problems: **${all.semanticVisualPct}%** (${all.semanticVisualN}/${all.beats})`);
  lines.push('');

  for (const s of byLevel) {
    lines.push(`## ${s.level}`);
    lines.push('');
    lines.push(`- Lessons: **${s.lessons}** · beats: **${s.beats}**`);
    lines.push(`- Success: **${s.successPct}%** (${s.successN})`);
    lines.push(`- Fallback: **${s.fallbackPct}%** (${s.fallbackN})`);
    lines.push(`- Semantic/visual: **${s.semanticVisualPct}%** (${s.semanticVisualN})`);
    lines.push('');
    lines.push('| Template | Count |');
    lines.push('|----------|------:|');
    for (const t of TEMPLATES) lines.push(`| \`${t}\` | ${s.templateDist[t]} |`);
    lines.push('');
    lines.push('### Missing poses');
    for (const [k, n] of s.missingPoses) lines.push(`- \`${k}\`: ${n}`);
    if (!s.missingPoses.length) lines.push('- (none tallied)');
    lines.push('');
    lines.push('### Missing cast roles');
    for (const [k, n] of s.missingCast) lines.push(`- \`${k}\`: ${n}`);
    if (!s.missingCast.length) lines.push('- (none tallied)');
    lines.push('');
    lines.push('### Missing env');
    for (const [k, n] of s.missingEnv) lines.push(`- \`${k}\`: ${n}`);
    if (!s.missingEnv.length) lines.push('- (none tallied)');
    lines.push('');
    lines.push('### Missing props');
    for (const [k, n] of s.missingProp) lines.push(`- \`${k}\`: ${n}`);
    if (!s.missingProp.length) lines.push('- (none tallied)');
    lines.push('');
  }

  lines.push('## Template distribution (all)');
  lines.push('');
  for (const t of TEMPLATES) lines.push(`- \`${t}\`: ${all.templateDist[t]}`);
  lines.push('');
  lines.push('## Most common gaps (all levels)');
  lines.push('');
  lines.push('### Poses');
  for (const [k, n] of all.missingPoses) lines.push(`- \`${k}\`: ${n}`);
  lines.push('');
  lines.push('### Cast roles');
  for (const [k, n] of all.missingCast) lines.push(`- \`${k}\`: ${n}`);
  lines.push('');
  lines.push('### Env');
  for (const [k, n] of all.missingEnv) lines.push(`- \`${k}\`: ${n}`);
  lines.push('');
  lines.push('### Props');
  for (const [k, n] of all.missingProp) lines.push(`- \`${k}\`: ${n}`);
  lines.push('');

  const problemTallies = tally(allRows.flatMap((r) => scoreRow(r).problems));
  lines.push('## Recurring failure codes');
  lines.push('');
  for (const [k, n] of problemTallies) lines.push(`- \`${k}\`: ${n}`);
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- No fixes applied in this run.');
  lines.push('- No new cast / env / P1 action plates generated.');
  lines.push('- Contact sheets: `representative-contact.jpg`, `failures-contact.jpg`.');
  lines.push('');

  return { markdown: lines.join('\n'), all, byLevel };
}

async function composeInBrowser(rows) {
  const { startPublicServer, openBoardPage } = await import('./lib/verify-harness.mjs');
  const { port, close } = await startPublicServer();
  const { browser, page } = await openBoardPage(port);
  const result = await page.evaluate(async (inputRows) => {
    await window.PropBank.ready();
    if (!window.StoryScene) return { error: 'StoryScene missing' };
    const out = [];
    for (const row of inputRows) {
      const scene = row.storyScene;
      if (!scene) {
        out.push({ id: row.id, layerCount: 0, layers: [], warnings: ['no storyScene'] });
        continue;
      }
      const composed = window.StoryScene.compose(scene, {
        stageW: 480,
        stageH: 380,
        propGet: (k) => window.PropBank.get(k),
      });
      const honesty = row.primaryPose
        ? window.StoryScene.poseForVerb(row.actionVerb || '', row.primaryPose)
        : { ok: true };
      out.push({
        id: row.id,
        layerCount: (composed.layers || []).length,
        layers: (composed.layers || []).map((l) => ({
          slot: l.slot,
          key: l.key,
          scaleClass: l.scaleClass,
          flip: !!l.flip,
        })),
        warnings: composed.warnings || [],
        poseForVerb: honesty,
      });
    }
    return { rows: out };
  }, rows.map((r) => ({
    id: r.id,
    storyScene: r.storyScene,
    primaryPose: r.primaryPose,
    actionVerb: r.actionVerb,
  })));
  await browser.close();
  close();
  return result;
}

async function bakeSheets(okRows, failRows) {
  const { startPublicServer, openBoardPage, clearPageJpgs } = await import('./lib/verify-harness.mjs');
  const sheetsDir = path.join(OUT, 'sheets');
  fs.mkdirSync(sheetsDir, { recursive: true });

  async function bakeBundle(name, picks) {
    if (!picks.length) return null;
    // Build a mini lesson with up to 4 story pages from picks
    const pages = picks.slice(0, 4).map((r) => ({
      heading: r.heading || r.templateId,
      text: r.text,
      visualTheme: r.visualTheme || 'scene',
      visualCaption: r.visualCaption || r.templateId,
      storyScene: r.storyScene,
    }));
    while (pages.length < 4 && picks[0]) {
      // pad with first if needed — skip
      break;
    }
    const lesson = {
      title: `Stress ${name}`,
      warmUp: { question: 'What do you see?', sampleAnswer: 'I see a friend.' },
      vocabulary: [
        { word: 'friend', emoji: '🤝' },
        { word: 'walk', emoji: '🚶' },
        { word: 'talk', emoji: '💬' },
        { word: 'see', emoji: '👀' },
        { word: 'book', emoji: '📖' },
        { word: 'door', emoji: '🚪' },
      ],
      sentenceFrames: ['I see a ____.', 'I walk to the ____.'],
      story: {
        title: name,
        pages,
        comprehensionQuestions: [{ question: 'What happens?', sampleAnswer: 'They talk.' }],
        creativeQuestions: [],
      },
      speakingQuestions: [{ question: 'Do you like this?', sampleAnswer: 'Yes.' }],
      activity: { title: 'Match', prompt: 'Match.', templates: ['I see a ____.'] },
      reviewSentences: [],
    };
    const meta = { level: 'A1', duration: '60', phonics: 'off' };
    const outDir = path.join(sheetsDir, name);
    fs.mkdirSync(outDir, { recursive: true });
    clearPageJpgs(outDir);

    const { port, close } = await startPublicServer();
    const { browser, page } = await openBoardPage(port);
    const baked = await page.evaluate(async ({ lesson, meta }) => {
      await window.PropBank.ready();
      await window.VocabIcons.ready();
      const boardPlan = window.EdbActivities.buildBoardPlan(lesson, meta);
      await window.LessonPages.attachBgPicks(lesson, meta, boardPlan);
      const canvases = await window.BoardPreview.renderCanvases(lesson, meta, boardPlan);
      const pages = [];
      for (let i = 0; i < canvases.length; i++) {
        const key = (boardPlan.pages && boardPlan.pages[i] && boardPlan.pages[i].pageKey) || String(i);
        pages.push({ index: i, key, dataUrl: canvases[i].toDataURL('image/jpeg', 0.88) });
      }
      return { pages };
    }, { lesson, meta });
    await browser.close();
    close();

    const storyPages = baked.pages.filter((p) => /^story\d+$/i.test(p.key));
    for (const p of baked.pages) {
      const b64 = p.dataUrl.replace(/^data:image\/jpeg;base64,/, '');
      fs.writeFileSync(path.join(outDir, `page-${p.index}-${p.key}.jpg`), Buffer.from(b64, 'base64'));
    }

    // Contact strip
    const { chromium } = await import('playwright');
    const b2 = await chromium.launch({ headless: true });
    const p2 = await b2.newPage({ viewport: { width: 1800, height: 700 } });
    await p2.setContent('<!doctype html><canvas id="c"></canvas>');
    const labels = picks.slice(0, storyPages.length).map(
      (r) => `${r.level} · ${r.templateId}${r.score && r.score.success ? ' · ok' : ' · fail'}`
    );
    const contactUrl = await p2.evaluate(
      async ({ stories, labels, title }) => {
        const gap = 10;
        const labelH = 40;
        const imgs = await Promise.all(
          stories.map(
            (s) =>
              new Promise((resolve, reject) => {
                const im = new Image();
                im.onload = () => resolve(im);
                im.onerror = reject;
                im.src = s.dataUrl;
              })
          )
        );
        const cellH = 500;
        const cellWs = imgs.map((im) => Math.round(im.width * (cellH / im.height)));
        const w = cellWs.reduce((a, b) => a + b, 0) + gap * (imgs.length + 1);
        const h = labelH + cellH + 24;
        const canvas = document.getElementById('c');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '600 18px system-ui';
        ctx.fillText(title, gap, 28);
        let x = gap;
        for (let i = 0; i < imgs.length; i++) {
          ctx.drawImage(imgs[i], x, labelH, cellWs[i], cellH);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '12px system-ui';
          ctx.fillText(labels[i] || stories[i].key, x + 4, labelH + cellH + 14);
          x += cellWs[i] + gap;
        }
        return canvas.toDataURL('image/jpeg', 0.92);
      },
      { stories: storyPages, labels, title: `Story-scene stress — ${name}` }
    );
    await b2.close();
    const contactPath = path.join(OUT, `${name}-contact.jpg`);
    fs.writeFileSync(contactPath, Buffer.from(contactUrl.replace(/^data:image\/jpeg;base64,/, ''), 'base64'));
    return contactPath;
  }

  const okPath = await bakeBundle('representative', okRows);
  const failPath = await bakeBundle('failures', failRows);
  return { okPath, failPath };
}

async function main() {
  loadEnv();
  fs.mkdirSync(LESSON_DIR, { recursive: true });
  const count = Math.max(3, Number(arg('count', '36')) || 36);
  const propKeys = loadPropKeys();

  // --- Generate ---
  let lessons = [];
  if (hasFlag('classify-only') || hasFlag('compose-only') || hasFlag('sheets-only')) {
    const files = fs.readdirSync(LESSON_DIR).filter((f) => f.endsWith('.json'));
    for (const f of files) {
      lessons.push(JSON.parse(fs.readFileSync(path.join(LESSON_DIR, f), 'utf8')));
    }
    console.log(`Loaded ${lessons.length} lessons from disk`);
  } else {
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY required');
      process.exit(1);
    }
    const handler = require('../api/generate-lesson.js');
    // Balanced: cycle levels, prefer 60-min for multi-page stories
    for (let i = 0; i < count; i++) {
      const level = LEVELS[i % 3];
      const topic = TOPICS[i % TOPICS.length];
      const duration = '60';
      process.stdout.write(`gen ${i + 1}/${count}: ${topic} (${level})… `);
      const result = await generateOneLesson(handler, topic, level, duration, 4);
      if (!result.ok) {
        console.log('FAIL', (result.data && result.data.error) || result.error || result.status);
        continue;
      }
      const lesson = result.data.lesson;
      const pack = {
        id: `L${String(i + 1).padStart(3, '0')}`,
        topic,
        level,
        duration,
        title: lesson.title,
        generatedAt: new Date().toISOString(),
        lesson,
        // Snapshot story text before any producer repair
        storyTextSnapshot: (lesson.story && lesson.story.pages || []).map((p) => String(p.text || '')),
      };
      fs.writeFileSync(path.join(LESSON_DIR, `${pack.id}-${level}.json`), JSON.stringify(pack, null, 2));
      lessons.push(pack);
      console.log(`OK "${lesson.title}" pages=${(lesson.story && lesson.story.pages || []).length}`);
      await sleep(400);
    }
  }

  // Flatten beats
  const beats = [];
  for (const pack of lessons) {
    const pages = (pack.lesson && pack.lesson.story && pack.lesson.story.pages) || [];
    const snap = pack.storyTextSnapshot || pages.map((p) => String(p.text || ''));
    pages.forEach((p, pi) => {
      beats.push({
        id: `${pack.id}-p${pi}`,
        lessonId: pack.id,
        topic: pack.topic,
        title: pack.title || (pack.lesson && pack.lesson.title),
        level: pack.level,
        pageIndex: pi,
        heading: p.heading || '',
        text: String(p.text || ''),
        textSnapshot: String(snap[pi] || p.text || ''),
        visualTheme: p.visualTheme || '',
        visualCaption: p.visualCaption || '',
      });
    });
  }
  fs.writeFileSync(path.join(OUT, 'beats.json'), JSON.stringify(beats, null, 2));
  console.log(`Beats: ${beats.length}`);

  // --- Classify ---
  let classifiedRows = [];
  const classifiedPath = path.join(OUT, 'classified.json');
  if (hasFlag('compose-only') || hasFlag('sheets-only')) {
    classifiedRows = JSON.parse(fs.readFileSync(classifiedPath, 'utf8'));
    console.log(`Loaded ${classifiedRows.length} classified rows`);
  } else {
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY required for classify');
      process.exit(1);
    }
    const batchSize = 8;
    for (let i = 0; i < beats.length; i += batchSize) {
      const batch = beats.slice(i, i + batchSize);
      process.stdout.write(`classify ${i + 1}-${i + batch.length}/${beats.length}… `);
      let rows = [];
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          rows = await classifyBatch(batch, i / batchSize);
          break;
        } catch (err) {
          console.log(`retry ${attempt}: ${err.message}`);
          await sleep(2000 * attempt);
        }
      }
      console.log(`got ${rows.length}`);
      classifiedRows.push(...rows);
      await sleep(300);
    }
    fs.writeFileSync(classifiedPath, JSON.stringify(classifiedRows, null, 2));
  }

  const byId = new Map(classifiedRows.map((r) => [r.id, r]));

  // --- Bind + honesty ---
  const continuityByLesson = new Map();
  const bound = [];
  for (const beat of beats) {
    const classify = byId.get(beat.id);
    if (!continuityByLesson.has(beat.lessonId)) {
      continuityByLesson.set(beat.lessonId, { kids: new Set(), kidToggle: false, lastKids: [] });
    }
    const continuity = continuityByLesson.get(beat.lessonId);
    if (!classify || !classify.templateId) {
      bound.push({
        ...beat,
        unfit: true,
        templateId: null,
        flags: {},
        storyScene: null,
        fallbackNeeded: true,
        honesty: { ok: false, issues: [{ kind: 'unclassified' }] },
      });
      continue;
    }
    classify._text = beat.text;
    const boundScene = bindStoryScene(classify, propKeys, continuity);
    const primaryPose = boundScene.primaryPose;
    const honesty = poseHonest(primaryPose, beat.text);
    // Continuity: if multiple cast kids appear across pages inconsistently with labels
    const castUsed = (boundScene.resolvedChars || [])
      .filter((c) => c.assigned && c.assigned.kind === 'cast')
      .map((c) => c.assigned.who);
    continuity.lastKids = castUsed;

    const producerRewrite =
      beat.textSnapshot &&
      beat.text &&
      /^We learn about\b/i.test(beat.text) &&
      !/^We learn about\b/i.test(beat.textSnapshot);

    bound.push({
      ...beat,
      templateId: classify.templateId,
      unfit: !TEMPLATES.includes(classify.templateId),
      classify,
      storyScene: boundScene.storyScene,
      flags: boundScene.flags,
      primaryPose,
      actionVerb: (boundScene.storyScene && boundScene.storyScene.actionVerb) || null,
      honesty,
      producerRewrite: !!producerRewrite,
      continuityBroken: false,
      fallbackNeeded: false, // set after compose
    });
  }

  // Continuity pass: same lesson "kid" who-label mapped to different cast without reason
  // (soft — skip for now beyond tracking)

  // --- Compose ---
  let composeMap = new Map();
  if (!hasFlag('sheets-only')) {
    console.log('Composing in browser…');
    const composed = await composeInBrowser(bound.filter((r) => r.storyScene));
    if (composed.error) {
      console.error(composed.error);
      process.exit(1);
    }
    for (const c of composed.rows || []) composeMap.set(c.id, c);
    fs.writeFileSync(path.join(OUT, 'compose.json'), JSON.stringify(composed.rows || [], null, 2));
  } else if (fs.existsSync(path.join(OUT, 'compose.json'))) {
    for (const c of JSON.parse(fs.readFileSync(path.join(OUT, 'compose.json'), 'utf8'))) {
      composeMap.set(c.id, c);
    }
  }

  for (const row of bound) {
    const c = composeMap.get(row.id);
    row.compose = c || { layerCount: 0, layers: [], warnings: ['missing compose'] };
    const needCast = (row.flags && row.flags.missingCast) || [];
    const needPose = (row.flags && row.flags.missingPose) || [];
    row.fallbackNeeded =
      row.unfit ||
      needCast.length > 0 ||
      (row.compose.layerCount || 0) === 0 ||
      (needPose.length > 0 && (row.compose.layerCount || 0) < 2);

    // Layout heuristic flags (no bake): hero without hero layer, travel without goal, etc.
    row.layoutIssues = [];
    if (row.templateId === 'travel' && row.storyScene && !row.storyScene.slots.vehicleOrGoal) {
      row.layoutIssues.push('travel_missing_goal');
    }
    if (row.templateId === 'heroFocus' && row.storyScene && !row.storyScene.slots.hero) {
      row.layoutIssues.push('hero_missing');
    }
    if (row.templateId === 'group3' && (row.compose.layerCount || 0) < 3) {
      row.layoutIssues.push('group3_incomplete');
    }
    if (row.templateId === 'dialogue' && (row.compose.layerCount || 0) < 2) {
      row.layoutIssues.push('dialogue_incomplete');
    }
  }

  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(bound, null, 2));

  const report = writeReport(bound, { requested: count, okLessons: lessons.length });
  fs.writeFileSync(path.join(OUT, 'report.md'), report.markdown);
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ all: report.all, byLevel: report.byLevel }, null, 2));

  // --- Sheets ---
  const scored = bound.map((r) => ({ ...r, score: scoreRow(r) }));
  const okPicks = scored.filter((r) => r.score.success && r.storyScene);
  const failPicks = scored.filter((r) => !r.score.success && r.storyScene);
  // Prefer diverse templates
  function diversify(list, n) {
    const out = [];
    const used = new Set();
    for (const t of TEMPLATES) {
      const hit = list.find((r) => r.templateId === t && !used.has(r.id));
      if (hit) {
        out.push(hit);
        used.add(hit.id);
      }
      if (out.length >= n) break;
    }
    for (const r of list) {
      if (out.length >= n) break;
      if (!used.has(r.id)) {
        out.push(r);
        used.add(r.id);
      }
    }
    return out.slice(0, n);
  }

  console.log('Baking contact sheets…');
  try {
    const sheets = await bakeSheets(diversify(okPicks, 4), diversify(failPicks, 4));
    console.log('Sheets', sheets);
  } catch (err) {
    console.warn('Sheet bake failed:', err.message);
  }

  console.log('\n' + report.markdown.split('\n').slice(0, 80).join('\n'));
  console.log(`\nFull report: ${path.join(OUT, 'report.md')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
