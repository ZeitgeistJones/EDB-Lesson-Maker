/**
 * Story-scene demand study: sample real A1/A2/B1 story beats, classify into the
 * 8 locked templates (docs/story-scenes.md), report frequency + v1 asset shortlist.
 *
 *   node scripts/story-scene-demand.mjs
 *   node scripts/story-scene-demand.mjs --gen=36 --fixtures-only
 *   node scripts/story-scene-demand.mjs --classify-only
 *
 * Writes tmp/story-scene-demand/{beats.json,classified.json,report.md,shortlist.json}
 * Does NOT draw assets or implement the renderer.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tmp', 'story-scene-demand');
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
  // school
  'School Classroom',
  'Library Quiet Time',
  'Music Class',
  // food
  'Morning at the Bakery',
  'Cafe Order',
  'Fruit Market',
  'Kitchen Helpers',
  'Supermarket Shopping',
  // family / home
  'Morning at Home',
  'Family Dinner',
  'Cleaning the House',
  // animals
  'Day at the Zoo',
  'Pet Care',
  'Farm Animals',
  // body / health
  'Doctor Visit',
  'At the Dentist',
  'Parts of the Face',
  // clothes
  'Clothes Closet',
  'Getting Dressed for School',
  // weather
  'Weather Walk',
  'Rainy Day Plans',
  // sports
  'Sports Day',
  'Soccer Practice',
  'Swimming Pool',
  // travel / town
  'Train Station Trip',
  'City Bus Ride',
  'Airport Adventure',
  'Hotel Stay',
  // shopping
  'Toy Store Shopping',
  'Market Day',
  // community helpers
  'Fire Station',
  'Police Helper Day',
  'Post Office Visit',
  'Construction Site',
];

const LEVELS = ['A1', 'A2', 'B1'];
const DURATIONS = ['60', '30', '60']; // prefer 60 for more story pages

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
    const m = line.match(/^\s*([A-Z0_9_]+)\s*=\s*(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
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
        duration,
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
  return { ok: false, status: lastStatus, data: lastData, error: lastErr && String(lastErr.message || lastErr), attempts: maxAttempts };
}

function pagesFromLesson(lesson) {
  return Array.isArray(lesson?.story?.pages) ? lesson.story.pages : [];
}

function loadFixtureBeats() {
  const dir = path.join(ROOT, 'scripts', 'fixtures');
  const beats = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    if (!/lesson|loop\d/.test(f)) continue;
    let lesson;
    try {
      lesson = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    } catch {
      continue;
    }
    const pages = pagesFromLesson(lesson);
    if (!pages.length) continue;
    pages.forEach((p, i) => {
      beats.push({
        id: `fix-${f}-${i}`,
        source: `fixture:${f}`,
        topic: lesson.title || f.replace(/\.json$/, ''),
        level: lesson.level || null,
        area: guessArea(lesson.title || f, p.visualTheme),
        heading: p.heading || '',
        text: String(p.text || '').slice(0, 600),
        visualTheme: p.visualTheme || '',
        visualCaption: p.visualCaption || '',
      });
    });
  }
  return beats;
}

function guessArea(title, theme) {
  const s = `${title} ${theme}`.toLowerCase();
  if (/school|class|library|music|phonics/.test(s)) return 'school';
  if (/bakery|cafe|fruit|kitchen|supermarket|market|food|snack|apple|dinner/.test(s)) return 'food';
  if (/home|family|apartment|dollhouse|bathroom|coat/.test(s)) return 'family_home';
  if (/zoo|pet|farm|shark|animal|aquarium/.test(s)) return 'animals';
  if (/doctor|dentist|face|clinic|body|health/.test(s)) return 'body_health';
  if (/clothes|dress|coat/.test(s)) return 'clothes';
  if (/weather|rain|camp/.test(s)) return 'weather';
  if (/sport|soccer|gym|basket|swim|trampoline/.test(s)) return 'sports';
  if (/travel|train|bus|airport|hotel|town|city/.test(s)) return 'travel_town';
  if (/shop|store|market/.test(s)) return 'shopping';
  if (/fire|police|post|job|construction|helper/.test(s)) return 'community';
  return 'other';
}

async function generateBeats(count) {
  loadEnv();
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[story-scene-demand] GEMINI_API_KEY missing — live generation skipped');
    return [];
  }
  const handler = require('../api/generate-lesson.js');
  const beats = [];
  const n = Math.max(0, Number(count) || 0);
  for (let i = 0; i < n; i++) {
    const topic = TOPICS[i % TOPICS.length];
    const level = LEVELS[i % LEVELS.length];
    const duration = DURATIONS[i % DURATIONS.length];
    process.stdout.write(`  gen ${i + 1}/${n}: ${topic} (${level}/${duration})… `);
    const result = await generateOneLesson(handler, topic, level, duration, 4);
    if (!result.ok) {
      console.log(`FAIL ${(result.data && result.data.error) || result.error || result.status}`);
      continue;
    }
    const lesson = result.data.lesson;
    const pages = pagesFromLesson(lesson);
    console.log(`OK "${lesson.title}" pages=${pages.length}`);
    pages.forEach((p, pi) => {
      beats.push({
        id: `gen-${String(i + 1).padStart(3, '0')}-${pi}`,
        source: 'generate-lesson',
        topic: topic,
        title: lesson.title,
        level,
        duration,
        area: guessArea(topic, p.visualTheme),
        heading: p.heading || '',
        text: String(p.text || '').slice(0, 600),
        visualTheme: p.visualTheme || '',
        visualCaption: p.visualCaption || '',
      });
    });
  }
  return beats;
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

ALLOWED templates ONLY (pick exactly one per beat):
${TEMPLATES.join(', ')}

Definitions:
- charObject: one character with a focus object/thing
- dialogue: two people talking (no object transfer)
- exchange: give/take/show/hand an item between people
- action: one character performing a clear physical action (with optional support prop)
- group3: three or more people together as the focus
- travel: going, arriving, leaving, riding, walking toward a destination/vehicle
- heroFocus: one large object/place feature dominates; people optional/tiny
- locationActivity: place backdrop + character doing something there (stall, desk, counter, tank…)

If a beat truly cannot fit, set templateId to "UNFIT" and explain in unfitReason. Prefer fitting.

Closed pose set: idle, talk, listen, hold, walk, reach, sit
Closed emotion set: neutral, happy, worried, surprised, sad (or null)
Normalize props/env to short English lemmas (ticket, desk, bus, stall…).

Return ONLY JSON:
{"rows":[{"id":"...","templateId":"...","characters":[{"who":"mia|leo|adult|teacher|doctor|kid|...","role":"actor|speakerA|...","pose":"...","emotion":null|"happy"}],"props":["..."],"environment":["..."],"unfitReason":null}]}

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
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
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
    const k = String(x || '')
      .toLowerCase()
      .trim();
    if (!k) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function buildReport(beats, rows) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const joined = beats.map((b) => ({ ...b, classify: byId.get(b.id) || null }));
  const classified = joined.filter((j) => j.classify && j.classify.templateId);
  const fit = classified.filter((j) => TEMPLATES.includes(j.classify.templateId));
  const unfit = classified.filter((j) => j.classify.templateId === 'UNFIT' || !TEMPLATES.includes(j.classify.templateId));
  const missing = joined.filter((j) => !j.classify);

  const freq = Object.fromEntries(TEMPLATES.map((t) => [t, 0]));
  for (const j of fit) freq[j.classify.templateId] += 1;

  const poses = [];
  const props = [];
  const env = [];
  const who = [];
  for (const j of fit) {
    for (const c of j.classify.characters || []) {
      if (c.pose) poses.push(c.pose);
      if (c.who) who.push(c.who);
      if (c.emotion) poses.push(`emotion:${c.emotion}`);
    }
    for (const p of j.classify.props || []) props.push(p);
    for (const e of j.classify.environment || []) env.push(e);
  }

  const poseT = tally(poses.filter((p) => !String(p).startsWith('emotion:')));
  const emoT = tally(
    poses.filter((p) => String(p).startsWith('emotion:')).map((p) => String(p).replace(/^emotion:/, ''))
  );
  const propT = tally(props);
  const envT = tally(env);
  const whoT = tally(who);

  const coverage = classified.length ? (100 * fit.length) / classified.length : 0;

  const shortlist = {
    cast: whoT.slice(0, 12).map(([k, n]) => ({ who: k, n })),
    poses: poseT.slice(0, 12).map(([k, n]) => ({ pose: k, n })),
    emotions: emoT.slice(0, 8).map(([k, n]) => ({ emotion: k, n })),
    props: propT.slice(0, 40).map(([k, n]) => ({ prop: k, n })),
    environment: envT.slice(0, 40).map(([k, n]) => ({ env: k, n })),
    note: 'v1 stocking candidates from empirical beat demand — do not commission yet without review',
  };

  const lines = [];
  lines.push('# Story-scene demand report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('Architecture lock: `docs/story-scenes.md` (8 templates).');
  lines.push('');
  lines.push('## Sample');
  lines.push('');
  lines.push(`- Beats collected: **${beats.length}**`);
  lines.push(`- Classified: **${classified.length}** (missing classify: ${missing.length})`);
  lines.push(`- Fixtures: **${beats.filter((b) => String(b.source).startsWith('fixture')).length}**`);
  lines.push(`- Generated: **${beats.filter((b) => b.source === 'generate-lesson').length}**`);
  const byLevel = {};
  for (const b of beats) {
    const lv = b.level || 'unknown';
    byLevel[lv] = (byLevel[lv] || 0) + 1;
  }
  lines.push(`- By level: ${Object.entries(byLevel).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  lines.push('');
  lines.push('## Template coverage');
  lines.push('');
  lines.push(`- Fit in 8 templates: **${fit.length}** / ${classified.length} (**${coverage.toFixed(1)}%**)`);
  lines.push(`- UNFIT / other: **${unfit.length}**`);
  lines.push('');
  lines.push('| Template | Count | Share of fit |');
  lines.push('|----------|------:|-------------:|');
  for (const t of TEMPLATES) {
    const n = freq[t];
    const pct = fit.length ? ((100 * n) / fit.length).toFixed(1) : '0.0';
    lines.push(`| \`${t}\` | ${n} | ${pct}% |`);
  }
  lines.push('');
  lines.push('## Pose / emotion demand');
  lines.push('');
  lines.push('### Poses');
  for (const [k, n] of poseT.slice(0, 15)) lines.push(`- \`${k}\`: ${n}`);
  lines.push('');
  lines.push('### Emotions');
  for (const [k, n] of emoT.slice(0, 10)) lines.push(`- \`${k}\`: ${n}`);
  lines.push('');
  lines.push('## Prop demand (top)');
  lines.push('');
  for (const [k, n] of propT.slice(0, 25)) lines.push(`- \`${k}\`: ${n}`);
  lines.push('');
  lines.push('## Environment demand (top)');
  lines.push('');
  for (const [k, n] of envT.slice(0, 25)) lines.push(`- \`${k}\`: ${n}`);
  lines.push('');
  lines.push('## Cast who-labels (top)');
  lines.push('');
  for (const [k, n] of whoT.slice(0, 15)) lines.push(`- \`${k}\`: ${n}`);
  lines.push('');
  lines.push('## Patterns the 8 cannot represent');
  lines.push('');
  if (!unfit.length) {
    lines.push('None in this sample — every classified beat fit a template.');
  } else {
    for (const j of unfit.slice(0, 20)) {
      lines.push(
        `- **${j.id}** (${j.topic}): template=\`${j.classify.templateId}\` — ${j.classify.unfitReason || j.heading || j.visualCaption}`
      );
    }
  }
  lines.push('');
  lines.push('## v1 asset shortlist (from demand)');
  lines.push('');
  lines.push('### Cast / poses');
  lines.push('- Recurring kids: top `who` labels above (normalize to 4–6 named kids + teacher/parent/helper adults).');
  lines.push(`- Pose priority: ${poseT.slice(0, 6).map(([k]) => k).join(', ') || '(none)'}`);
  lines.push(`- Emotion priority: ${emoT.slice(0, 5).map(([k]) => k).join(', ') || '(none)'}`);
  lines.push('');
  lines.push('### Reusable story props (commission/tag first)');
  for (const [k, n] of propT.slice(0, 20)) lines.push(`- ${k} (${n})`);
  lines.push('');
  lines.push('### Reusable environment pieces');
  for (const [k, n] of envT.slice(0, 20)) lines.push(`- ${k} (${n})`);
  lines.push('');
  lines.push('Do not draw yet — review shortlist against PropBank/vocab overlap first.');
  lines.push('');

  return { report: lines.join('\n'), shortlist, joined, freq, coverage, fit, unfit };
}

async function main() {
  loadEnv();
  fs.mkdirSync(OUT, { recursive: true });

  let beats;
  if (hasFlag('classify-only') && fs.existsSync(path.join(OUT, 'beats.json'))) {
    beats = JSON.parse(fs.readFileSync(path.join(OUT, 'beats.json'), 'utf8'));
    console.log(`Loaded ${beats.length} beats from beats.json`);
  } else {
    const fixtureBeats = loadFixtureBeats();
    console.log(`Fixtures: ${fixtureBeats.length} beats`);
    let genBeats = [];
    if (!hasFlag('fixtures-only')) {
      const genCount = Number(arg('gen', '36'));
      console.log(`Generating up to ${genCount} lessons…`);
      genBeats = await generateBeats(genCount);
      console.log(`Generated beats: ${genBeats.length}`);
    }
    beats = [...fixtureBeats, ...genBeats];
    fs.writeFileSync(path.join(OUT, 'beats.json'), `${JSON.stringify(beats, null, 2)}\n`);
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY required to classify');
    process.exit(1);
  }

  const batchSize = Number(arg('batch', '12'));
  const rows = [];
  for (let i = 0; i < beats.length; i += batchSize) {
    const batch = beats.slice(i, i + batchSize);
    process.stdout.write(`classify ${i + 1}–${i + batch.length}/${beats.length}… `);
    let attempt = 0;
    for (;;) {
      attempt += 1;
      try {
        const part = await classifyBatch(batch, Math.floor(i / batchSize));
        rows.push(...part);
        console.log(`OK (+${part.length})`);
        break;
      } catch (err) {
        console.log(`retry ${attempt}: ${err.message}`);
        if (attempt >= 4) throw err;
        await sleep(2000 * attempt);
      }
    }
  }

  fs.writeFileSync(path.join(OUT, 'classified.json'), `${JSON.stringify(rows, null, 2)}\n`);
  const { report, shortlist, joined } = buildReport(beats, rows);
  fs.writeFileSync(path.join(OUT, 'report.md'), report);
  fs.writeFileSync(path.join(OUT, 'shortlist.json'), `${JSON.stringify(shortlist, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT, 'joined.json'), `${JSON.stringify(joined, null, 2)}\n`);
  console.log(`\nWrote ${path.join(OUT, 'report.md')}`);
  console.log(report.split('\n').slice(0, 40).join('\n'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
