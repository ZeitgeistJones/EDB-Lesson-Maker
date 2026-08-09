/**
 * Prop demand report — what the board asks 09_props for and cannot get.
 *
 *   npm run assets:prop-demand
 *
 * Loads public/lib/sceneBackgrounds.js + propBank.js in a vm sandbox with a
 * file-backed fetch (the pattern from smoke-bg-picks.mjs), so the report
 * exercises the SHIPPED resolver and cannot pass while the runtime is broken.
 * Every request in PropBank.PROP_REQUESTS is resolved against every fixture
 * lesson in scripts/fixtures/cases.json.
 *
 * Two outputs: wishlist rows in the exact format of docs/asset-wishlist.md, and
 * generation sheet skeletons grouped by theme, nine per sheet. The PROP:
 * paragraphs are deliberately left as flagged TODOs — that sentence needs
 * judgement about the object, and faking it produces bad art.
 *
 * Gaps are reported per style family: "no container" and "no glossy container"
 * are different problems with different answers.
 *
 * Exit 0 always. A gap is information, not a failure.
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const STYLE_LOCK_DOC = path.join(root, 'docs', 'prop-style-lock.md');

const SHEET_SIZE = 9;

/** Minimal fetch that serves files out of public/ the way the browser would. */
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

function loadPropBank() {
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

/**
 * The style lock, composition and negative blocks come out of
 * docs/prop-style-lock.md rather than being copied here: the doc is the single
 * source of truth, and a copy would drift the day someone tightens the lock.
 */
function styleLockBlocks() {
  const missing = (what) =>
    `(could not read the ${what} from docs/prop-style-lock.md — open the doc and paste it)`;
  let md = '';
  try {
    md = fs.readFileSync(STYLE_LOCK_DOC, 'utf8').replace(/\r\n/g, '\n');
  } catch (_) {
    return { lock: missing('style lock'), composition: missing('composition rules'), negatives: missing('negatives') };
  }

  // No 'm' flag on purpose: with it, `$` would match the first line end and the
  // lazy body would come back empty.
  const section = (heading) => {
    const re = new RegExp(`(?:^|\\n)##+[ \\t]+${heading}[^\\n]*\\n([\\s\\S]*?)(?=\\n##[ \\t]|$)`);
    const m = re.exec(md);
    return m ? m[1].trim() : '';
  };
  /** First blockquote in a section, unquoted. */
  const quote = (body) => {
    const lines = body.split('\n');
    const start = lines.findIndex((l) => l.startsWith('> '));
    if (start < 0) return '';
    const out = [];
    for (let i = start; i < lines.length && lines[i].startsWith('>'); i++) {
      out.push(lines[i].replace(/^>\s?/, ''));
    }
    return out.join('\n');
  };

  return {
    lock: quote(section('The style lock')) || missing('style lock'),
    composition: section('Composition') || missing('composition rules'),
    negatives: quote(section('Negatives')) || missing('negatives'),
  };
}

/** Everything a picker could reasonably search a lesson on. */
function lessonTags(lesson) {
  const out = [];
  if (lesson.title) out.push(lesson.title);
  for (const t of lesson.tags || []) out.push(t);
  for (const v of lesson.vocabulary || []) out.push(typeof v === 'string' ? v : v && v.word);
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
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

const PB = loadPropBank();
await PB.ready();

const caseManifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'cases.json'), 'utf8')
);

const HOUSE = PB.HOUSE_FAMILY;
const FAMILIES = [HOUSE, 'glossy-adventure'];

const REQUESTS = Object.entries(PB.PROP_REQUESTS).flatMap(([recipe, rows]) =>
  rows.map((row) => ({ recipe, ...row }))
);

/**
 * family + group → one wishlist row. Grouping matters: two recipes short of a
 * cover is one missing cover, and the wishlist rule is one row per distinct
 * need. `group` is the role for a request miss and the theme for a theme miss.
 */
const gaps = new Map();
function noteGap({ group, need, why, family }) {
  const key = `${family}|${group}`;
  if (!gaps.has(key)) gaps.set(key, { need, group, family, whys: new Set() });
  const g = gaps.get(key);
  if (need.length > g.need.length) g.need = need;
  g.whys.add(why);
}

/**
 * How many DISTINCT props clear a query, using the shipped resolver only —
 * re-implementing the scoring here would let the report and the board disagree.
 */
function enumerate(query, limit) {
  const exclude = [];
  for (let i = 0; i < limit; i++) {
    const hit = PB.resolve({ ...query, index: 0, exclude });
    if (!hit) break;
    exclude.push(hit.key);
  }
  return exclude;
}

// ── bank inventory ───────────────────────────────────────────────
const bank = PB.all();
const notKeyed = PB.skipped();
console.log('Prop demand — resolved through the shipped PropBank\n');
console.log(`bank: ${bank.length} usable prop(s) after the alpha filter` +
  (notKeyed.length ? `; ${notKeyed.length} dropped for missing alpha: ${notKeyed.join(', ')}` : ''));
for (const f of FAMILIES) {
  console.log(`  ${f.padEnd(18)} ${bank.filter((p) => p.family === f).length}`);
}

// ── per-lesson demand ────────────────────────────────────────────
console.log('\n=== Demand per fixture lesson ===');
for (const c of caseManifest.cases || []) {
  const lesson = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', c.fixture), 'utf8'));
  const family = PB.familyFor(lesson);
  const tags = lessonTags(lesson);
  const seed = lesson.title || c.id;

  console.log(`\n${c.id}: ${lesson.title}   family=${family}`);

  for (const req of REQUESTS) {
    const exclude = [];
    const hits = [];
    const misses = [];
    for (let i = 0; i < req.count; i++) {
      // Chrome / role-only slots use pickDecor. Word/theme demand still uses resolve.
      let hit = null;
      if (!req.themed && (req.role || (req.roles && req.roles.length))) {
        const pick = PB.pickDecor || PB.pickByRole;
        if (pick) {
          hit = req.role
            ? pick.call(PB, req.role, {
                seed,
                index: i,
                exclude: req.distinct ? exclude : [],
                family,
              })
            : PB.pickByRole(req.roles, {
                seed,
                index: i,
                exclude: req.distinct ? exclude : [],
                family,
              });
        }
      } else {
        hit = PB.resolve({
          role: req.role,
          roles: req.roles,
          tags: req.themed ? tags : undefined,
          // Themed slots without a concrete word no longer tag-qualify — report MISS.
          seed,
          index: i,
          exclude: req.distinct ? exclude : [],
          family,
        });
      }
      if (hit) {
        hits.push(hit.key);
        if (req.distinct) exclude.push(hit.key);
      } else {
        misses.push(i);
      }
    }

    const short = hits.length < req.count;
    const label = `${req.recipe}/${req.slot}`;
    console.log(
      `  ${label.padEnd(26)} ${short ? 'MISS' : 'ok  '} ${hits.length}/${req.count}` +
        `${req.distinct ? ' distinct' : ''}${req.wired ? '' : ' (not wired yet)'}` +
        (hits.length ? ` → ${hits.join(', ')}` : '')
    );

    if (!short) continue;
    const role = req.role || (req.roles && req.roles[0]) || 'object';
    noteGap({
      group: `role:${role}`,
      need: req.distinct && req.count > 1
        ? `${req.count} distinct ${role} props (${family})`
        : `${role} prop (${family})`,
      family,
      why: `${c.id} ${label}: resolved ${hits.length}/${req.count}` +
        (misses.length ? ` (missed slot ${misses.join(',')})` : '') +
        (req.themed ? ` on tags [${tags.slice(0, 5).join(', ')}]` : ''),
    });
  }
}

// ── role coverage, per family ────────────────────────────────────
const wantedRoles = [...new Set(REQUESTS.flatMap((r) => r.roles || [r.role]).filter(Boolean))].sort();
console.log('\n=== Role coverage per style family (usable props) ===');
for (const role of wantedRoles) {
  const counts = FAMILIES.map((f) => `${f}=${bank.filter((p) => p.family === f && p.role === role).length}`);
  console.log(`  ${role.padEnd(14)} ${counts.join('  ')}`);
}
// Empty roles are already visible in the table above and in the per-lesson
// misses, so they do not each earn a wishlist row.

/**
 * Theme demand. Scene dressing is what needs a themed prop, and these are the
 * places the fixture lessons actually visit. Two props is the floor for dressing
 * a scene, so a theme with 0-1 matches is a sheet waiting to be generated.
 */
const THEMES = [
  { name: 'medical', tags: ['doctor', 'medical', 'health', 'clinic', 'hospital', 'checkup'] },
  { name: 'cafeteria', tags: ['cafeteria', 'lunch', 'tray', 'food', 'canteen'] },
  { name: 'travel', tags: ['travel', 'airport', 'passport', 'flight', 'luggage'] },
  { name: 'park', tags: ['park', 'playground', 'swing', 'outdoors'] },
  { name: 'school', tags: ['school', 'classroom', 'desk', 'teacher', 'pencils'] },
  { name: 'home', tags: ['home', 'living', 'room', 'furniture', 'house'] },
  { name: 'gym', tags: ['gym', 'sport', 'exercise', 'fitness'] },
];

const themeCounts = [];
console.log('\n=== Theme coverage (how many distinct props a scene could be dressed with) ===');
for (const theme of THEMES) {
  for (const family of FAMILIES) {
    const hits = enumerate({ tags: theme.tags, seed: theme.name, family }, 4);
    themeCounts.push({ theme: theme.name, tags: theme.tags, family, hits });
    console.log(
      `  ${`${theme.name}/${family}`.padEnd(32)} ${hits.length}` +
        (hits.length ? ` → ${hits.join(', ')}` : '  MISS')
    );
    if (hits.length < 2) {
      noteGap({
        group: `theme:${theme.name}`,
        need: `${theme.name} scene-dressing props (${family})`,
        family,
        why: `theme ${theme.name}: ${hits.length} prop(s) clear the tag floor in ${family}` +
          ` (tags [${theme.tags.slice(0, 4).join(', ')}])`,
      });
    }
  }
}

// ── output 1: wishlist rows ──────────────────────────────────────
const wishlist = [...gaps.values()].sort(
  (a, b) => a.family.localeCompare(b.family) || a.need.localeCompare(b.need)
);
const date = today();
console.log('\n--- Wishlist rows — paste into docs/asset-wishlist.md ---\n');
console.log('| Date | Need | Why (case / word / page) | Preferred type | Suggested source | Status |');
console.log('|------|------|--------------------------|----------------|------------------|--------|');
for (const g of wishlist) {
  const why = [...g.whys].slice(0, 3).join('; ').replace(/\|/g, '/');
  console.log(
    `| ${date} | ${g.need} | ${why} | Prop cutout in \`09_props\` | ` +
      `\`docs/prop-style-lock.md\` → \`assets:prop\` | open |`
  );
}

// ── output 2: generation sheets ──────────────────────────────────
const BLOCKS = styleLockBlocks();

/** Roles worth putting on a scene-dressing sheet, in a stable order. */
const DRESSING_ROLES = (PB.requestFor('sceneDressing') || {}).roles || ['object'];
const ANCHOR_BY_ROLE = {
  furniture: 'bottom',
  shelf: 'bottom',
  container: 'bottom',
  playPart: 'top',
  object: 'bottom',
  tool: 'center',
  cover: 'center',
  sortBin: 'bottom',
  reward: 'center',
  rewardFlap: 'center',
  orderPad: 'bottom',
};

/**
 * A themed sheet is nine cells, so spend the first few on the roles the recipes
 * actually missed in the house family — a gym-flavoured sorting bin pays down a
 * recipe miss and dresses the scene, where a ninth generic object does neither.
 */
const SHORT_ROLES = [...gaps.values()]
  .filter((g) => g.family === HOUSE && g.group.startsWith('role:'))
  .map((g) => g.group.slice('role:'.length))
  .slice(0, 3);
const SHEET_ROLES = [...SHORT_ROLES];
for (let i = 0; SHEET_ROLES.length < SHEET_SIZE; i++) {
  SHEET_ROLES.push(DRESSING_ROLES[i % DRESSING_ROLES.length]);
}

function printSheet(theme, have) {
  console.log(`## Sheet: ${theme} × ${SHEET_SIZE}  (matte house style)`);
  console.log(have.length ? `Already have: ${have.join(', ')}` : 'Nothing in the bank matches this theme yet.');
  console.log('\n### Style lock (verbatim)\n');
  console.log(BLOCKS.lock);
  console.log('\n### PROP paragraphs — TODO, one per cell, reading order\n');
  console.log('TODO: nine objects that belong in a ' + theme + ' scene, and one PROP: paragraph each.');
  console.log('Do not let a script write these: the sentence has to say what the object is,');
  console.log('its angle, its one body colour, its neutral fittings, and what "empty" means for it.\n');
  SHEET_ROLES.forEach((role, i) => {
    console.log(
      `PROP ${i + 1}  role=${role}  anchor=${ANCHOR_BY_ROLE[role] || 'bottom'}` +
        (i < SHORT_ROLES.length ? '   ← a recipe is short of this role' : '')
    );
    console.log('  TODO: PROP: <one object, its angle, its one body colour, its neutral');
    console.log('        fittings, and what "empty" means for it>');
  });
  console.log('\n### Composition (per cell)\n');
  console.log(BLOCKS.composition);
  console.log('\n### Negatives (verbatim)\n');
  console.log(BLOCKS.negatives);
  console.log('\n### Import line — replace every <…> before running\n');
  const roles = SHEET_ROLES.slice();
  const anchors = SHEET_ROLES.map((r) => ANCHOR_BY_ROLE[r] || 'bottom');
  const names = SHEET_ROLES.map((_, i) => `<${theme}-name-${i + 1}>`);
  // Real-world size cannot be measured from pixels and has no safe default.
  const scales = SHEET_ROLES.map(() => '<scale>');
  console.log(
    `npm run assets:prop -- <sheet.png> --sheet --grid=3x3 \\\n` +
      `  --names=${names.join(',')} \\\n` +
      `  --roles=${roles.join(',')} \\\n` +
      `  --scales=${scales.join(',')} \\\n` +
      `  --anchors=${anchors.join(',')} --tags=${theme}`
  );
  console.log('');
}

const MAX_SHEETS = 3;
console.log('\n--- Generation sheets — nine per sheet, grouped by theme ---\n');
console.log(
  'A sheet of nine unrelated objects is nine single generations with extra steps,\n' +
  `so each sheet below is one coherent place, thinnest theme first (${MAX_SHEETS} at a time).\n` +
  'Matte only: the house style is the target for anything new, so a glossy gap is a\n' +
  'wishlist row above, not a sheet — nine glossy props per theme is not the answer.\n'
);
const sheets = themeCounts
  .filter((t) => t.family === HOUSE && t.hits.length < 2)
  .sort((a, b) => a.hits.length - b.hits.length || a.theme.localeCompare(b.theme))
  .slice(0, MAX_SHEETS);
for (const s of sheets) printSheet(s.theme, s.hits);

console.log(
  `${wishlist.length} gap group(s), ${sheets.length} sheet(s) suggested. ` +
  'No prop art was invented. Exit 0.'
);
process.exit(0);
