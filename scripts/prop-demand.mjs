/**
 * Prop demand report — exercises the shipped PropBank resolver.
 *
 *   npm run assets:prop-demand
 *
 * Loads public/lib/sceneBackgrounds.js + propBank.js in a vm sandbox with a
 * file-backed fetch (same pattern as smoke-bg-picks.mjs), resolves every
 * PROP_REQUESTS row per fixture lesson, and prints wishlist rows + generation
 * sheet skeletons. Exit 0 always — gaps are information, not failures.
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');

function fileFetch(url) {
  const rel = String(url).replace(/^\.?\//, '');
  const filePath = path.join(publicDir, rel);
  if (!filePath.startsWith(publicDir) || !fs.existsSync(filePath)) {
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  }
  const body = fs.readFileSync(filePath);
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => JSON.parse(body.toString('utf8')),
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  });
}

function loadLibs() {
  const sandbox = { window: {}, fetch: fileFetch, console, setTimeout, clearTimeout };
  sandbox.self = sandbox;
  for (const name of ['sceneBackgrounds.js', 'propBank.js']) {
    const code = fs.readFileSync(path.join(publicDir, 'lib', name), 'utf8');
    vm.runInNewContext(code, sandbox, { filename: name });
  }
  const PB = sandbox.window.PropBank;
  if (!PB || !PB.resolve) throw new Error('propBank.js did not attach window.PropBank');
  return PB;
}

function lessonTags(lesson) {
  const out = [];
  if (lesson.title) out.push(lesson.title);
  for (const t of lesson.tags || []) out.push(t);
  for (const v of lesson.vocabulary || []) {
    out.push(typeof v === 'string' ? v : v && v.word);
  }
  if (lesson.story && lesson.story.title) out.push(lesson.story.title);
  for (const p of (lesson.story && lesson.story.pages) || []) {
    if (p.visualTheme) out.push(p.visualTheme);
    if (p.visualCaption) out.push(p.visualCaption);
  }
  if (lesson.activity && lesson.activity.title) out.push(lesson.activity.title);
  return out.filter(Boolean);
}

function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const PB = loadLibs();
await PB.ready();

const caseManifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'cases.json'), 'utf8')
);

const HOUSE = PB.HOUSE_FAMILY || 'matte';
const families = [HOUSE, 'glossy-adventure'];
const familyLabel = (f) => f || HOUSE;

/** gapKey → { need, whys: Set, role, family, tags } */
const gaps = new Map();

function noteGap({ need, why, role, family, tags }) {
  const key = `${familyLabel(family)}|${role || '(tags)'}|${need}`;
  if (!gaps.has(key)) {
    gaps.set(key, { need, role, family, tags: tags || [], whys: new Set() });
  }
  gaps.get(key).whys.add(why);
}

function flattenRequests(PROP_REQUESTS) {
  const out = [];
  for (const [recipe, rows] of Object.entries(PROP_REQUESTS || {})) {
    for (const row of rows) out.push({ recipe, ...row });
  }
  return out;
}

const REQUESTS = flattenRequests(PB.PROP_REQUESTS);

console.log('Prop demand — shipped PropBank.resolve over fixture lessons\n');

for (const c of caseManifest.cases || []) {
  const lesson = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', c.fixture), 'utf8'));
  const family = PB.familyFor(lesson);
  const tags = lessonTags(lesson);
  const seed = lesson.title || c.id;

  console.log(`=== ${c.id}: ${lesson.title}  family=${familyLabel(family)} ===`);

  for (const req of REQUESTS) {
    const roles = req.roles || (req.role ? [req.role] : [null]);
    const exclude = [];
    const hits = [];
    const missIndexes = [];

    for (let i = 0; i < req.count; i++) {
      const role = roles.length === 1 ? roles[0] : null;
      const query = {
        role: role || undefined,
        roles: roles.length > 1 ? roles : undefined,
        tags: req.themed ? tags : undefined,
        seed,
        index: i,
        exclude: req.distinct ? exclude : [],
        family,
      };
      const prop = PB.resolve(query);
      if (prop) {
        hits.push(prop.key);
        if (req.distinct) exclude.push(prop.key);
      } else {
        missIndexes.push(i);
      }
    }

    const needDistinct = req.distinct && hits.length < req.count;
    const needAny = hits.length === 0;
    const status = needAny || needDistinct
      ? `MISS ${hits.length}/${req.count}${req.distinct ? ' distinct' : ''}`
      : `ok ${hits.length}/${req.count}`;

    console.log(
      `  ${(req.recipe + '/' + req.slot).padEnd(28)} ${status}` +
        (hits.length ? ` → ${hits.join(', ')}` : '') +
        (missIndexes.length ? `  (miss idx ${missIndexes.join(',')})` : '')
    );

    if (needAny || needDistinct) {
      const role = req.role || (req.roles && req.roles[0]) || 'object';
      const need = req.distinct
        ? `${req.count} distinct ${role} props (${familyLabel(family)})`
        : `${role} prop (${familyLabel(family)})`;
      noteGap({
        need,
        why: `${c.id} ${req.recipe}/${req.slot}: got ${hits.length}/${req.count}` +
          (req.themed ? ` tags=[${tags.slice(0, 6).join(', ')}]` : ''),
        role,
        family,
        tags: req.themed ? tags.slice(0, 8) : [role],
      });
    }
  }

  // Thin roles the plan calls out — probe both families
  for (const f of families) {
    for (const role of ['sortBin', 'rewardFlap', 'letterTile', 'soundBoxes', 'wordStrip']) {
      const hit = PB.resolve({ role, seed, family: f });
      if (!hit) {
        noteGap({
          need: `${role} (${familyLabel(f)})`,
          why: `${c.id}: no keyed ${role} in ${familyLabel(f)}`,
          role,
          family: f,
          tags: [role],
        });
      }
    }
  }
}

const THEME_PROBES = [
  { name: 'medical', tags: ['doctor', 'medical', 'health', 'clinic', 'hospital'] },
  { name: 'cafeteria', tags: ['cafeteria', 'food', 'tray', 'lunch', 'kitchen'] },
  { name: 'travel', tags: ['travel', 'airport', 'suitcase', 'passport', 'flight'] },
  { name: 'park', tags: ['park', 'playground', 'swing', 'outdoor'] },
  { name: 'school', tags: ['school', 'classroom', 'desk', 'teacher'] },
  { name: 'home', tags: ['home', 'living', 'furniture', 'house'] },
];

console.log('\n=== Theme probes (tag rank, both families) ===');
for (const probe of THEME_PROBES) {
  for (const f of families) {
    const hit = PB.resolve({ tags: probe.tags, seed: probe.name, family: f, minScore: 3 });
    const label = `${probe.name}/${familyLabel(f)}`;
    if (hit) {
      console.log(`  ${label.padEnd(28)} → ${hit.key}`);
    } else {
      console.log(`  ${label.padEnd(28)} → MISS`);
      noteGap({
        need: `${probe.name} themed props (${familyLabel(f)})`,
        why: `theme probe ${probe.name}: no tag match in ${familyLabel(f)}`,
        role: 'object',
        family: f,
        tags: probe.tags,
      });
    }
  }
}

console.log('\n--- Wishlist rows (paste into docs/asset-wishlist.md) ---\n');
console.log('| Date | Need | Why (case / word / page) | Preferred type | Suggested source | Status |');
console.log('|------|------|--------------------------|----------------|------------------|--------|');
const date = today();
const wishlist = [...gaps.values()].sort((a, b) => a.need.localeCompare(b.need));
for (const g of wishlist) {
  const why = [...g.whys].slice(0, 3).join('; ').replace(/\|/g, '/');
  console.log(
    `| ${date} | ${g.need} | ${why} | Prop cutout in 09_props | docs/prop-style-lock.md → assets:prop | open |`
  );
}

console.log('\n--- Generation sheets (TODO skeletons — do not invent PROP: prose) ---\n');

function sheetFor(theme, items, family) {
  const names = items.map((it) => it.slug);
  const roles = items.map((it) => it.role);
  const scales = items.map((it) => it.scale);
  const anchors = items.map((it) => it.anchor);
  const styleNote = family === 'glossy-adventure'
    ? '(glossy-adventure family — use the adventure style lock variant, not the matte house lock)'
    : '(matte house style — paste docs/prop-style-lock.md style lock verbatim)';

  console.log(`## Sheet: ${theme} × ${items.length}  ${styleNote}`);
  console.log('Composition + negatives: from docs/prop-style-lock.md (per cell on a 3x3 sheet).');
  console.log('');
  items.forEach((it, i) => {
    console.log(`PROP ${i + 1} (${it.slug}, role=${it.role}, scale=${it.scale}, anchor=${it.anchor}):`);
    console.log(`  TODO: write one PROP: paragraph for "${it.slug}" — tags hint: ${(it.tags || []).join(', ')}`);
  });
  console.log('');
  console.log(
    `npm run assets:prop -- <sheet.png> --sheet --grid=3x3 ` +
      `--names=${names.join(',')} --roles=${roles.join(',')} ` +
      `--scales=${scales.join(',')} --anchors=${anchors.join(',')}` +
      (family === 'glossy-adventure' ? '  # then set styleFamily glossy-adventure on each row' : '')
  );
  console.log('');
}

const sheetBuckets = {
  medical: [],
  travel: [],
  cafeteria: [],
  park: [],
  phonics: [],
  sort: [],
  other: [],
};

for (const g of wishlist) {
  const n = g.need.toLowerCase();
  const tags = (g.tags || []).join(' ').toLowerCase();
  const item = {
    slug: `${(g.role || 'prop')}`.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, ''),
    role: g.role || 'object',
    scale: 0.4,
    anchor: 'bottom',
    tags: g.tags || [],
    family: g.family,
  };
  if (/medical|doctor|clinic|hospital/.test(n + tags)) sheetBuckets.medical.push(item);
  else if (/travel|airport|suitcase|passport/.test(n + tags)) sheetBuckets.travel.push(item);
  else if (/cafeteria|food|tray|lunch/.test(n + tags)) sheetBuckets.cafeteria.push(item);
  else if (/park|playground|swing/.test(n + tags)) sheetBuckets.park.push(item);
  else if (/letter|sound|strip|phonics|tile|rewardflap/.test(n + tags)) sheetBuckets.phonics.push(item);
  else if (/sort|bin/.test(n + tags)) sheetBuckets.sort.push(item);
  else sheetBuckets.other.push(item);
}

for (const [theme, items] of Object.entries(sheetBuckets)) {
  if (!items.length) continue;
  const seen = new Set();
  const unique = [];
  for (const it of items) {
    const k = `${it.family}|${it.role}`;
    if (seen.has(k)) continue;
    seen.add(k);
    it.slug = `${theme}-${it.role}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    unique.push(it);
    if (unique.length >= 9) break;
  }
  const matte = unique.filter((u) => u.family === HOUSE || !u.family);
  const glossy = unique.filter((u) => u.family === 'glossy-adventure');
  if (matte.length) sheetFor(theme, matte, HOUSE);
  if (glossy.length) sheetFor(`${theme}-glossy`, glossy, 'glossy-adventure');
}

console.log(`\n${wishlist.length} gap group(s). Exit 0.`);
process.exit(0);
