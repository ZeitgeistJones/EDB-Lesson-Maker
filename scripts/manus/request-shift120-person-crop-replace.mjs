/**
 * Shift120 — replace person top-crop quarantine with full-in-frame black cutouts.
 * Reads tmp/person-crop-replace/queue.json (run flag-top-crop-props.mjs first).
 *
 * NOTE: Cursor ESL rule says do not regen people for *flatness*. This call is
 * C10 crop/margin only — soft-3D OK; one pass; no flatness repair loops.
 *
 *   node scripts/manus/request-shift120-person-crop-replace.mjs
 *   node scripts/manus/request-shift120-person-crop-replace.mjs --dry-run
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT,
  createTask,
  MANUS_SKILLS,
  resolveAgentProfile,
  withEslAssetGeneratorBrief,
  apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-person-crop-replace');
const OUT_JSON = path.join(OUT_DIR, 'run.json');
const QUEUE_JSON = path.join(ROOT, 'tmp', 'person-crop-replace', 'queue.json');
const PROMPT_FALLBACK = path.join(OUT_DIR, 'PROMPT.md');

const FIGURE_CELLS = [
  {
    key: 'job-astronaut',
    note: 'full-body astronaut in suit + helmet, boots visible, facing front-ish',
  },
  {
    key: 'space-astronaut-gray',
    note: 'full-body gray spacesuit astronaut, helmet on, boots visible',
  },
  {
    key: 'space-astronaut-orange',
    note: 'full-body orange spacesuit astronaut, helmet on, boots visible (one clean figure — we alias a/b/c/d)',
  },
  {
    key: 'planet-astronaut-helmet',
    note: 'astronaut HELMET only (glass dome + neck ring), centered with margin — not a cropped head',
  },
  {
    key: 'spacesuit-empty',
    note: 'empty hung spacesuit (no person inside), full suit silhouette with margin',
  },
  {
    key: 'space-boot',
    note: 'single space boot object, side view, full boot in frame',
  },
  {
    key: 'oxygen-tank',
    note: 'backpack oxygen tank object',
  },
  {
    key: 'astronaut-glove',
    note: 'space glove object',
  },
  {
    key: 'visors-helmet-open',
    note: 'helmet with visor raised (object), full dome in frame',
  },
];

const BRIEF_BODY = `TASK: Black-field ESL PROP cutouts for ClassIn PropBank (09_props). Replace HEAD-CROPPED astronaut props that failed importer gate C10 (opaque mass within top 3% of frame).

THIS IS A CROP / MARGIN FIX — soft-3D educational style is ACCEPTABLE. Do NOT iterate or regenerate to chase flatter vector style. One clean pass.

HARD RULES:
- Pure #000000 field edge-to-edge (no grey cards, no white plates, no frames)
- True even 3×3 grid; ONE subject per cell; centered
- Each subject must have ≥3% empty black margin on TOP and BOTTOM of its cell (helmet/boots must NOT touch cell edge)
- Full figures: helmet TOP through boots BOTTOM all visible inside the cell
- ZERO text/letters/numbers/logos
- quality: default ONLY (never high)
- Deliver exactly 1 PNG (3×3) + short chat legend (keys only)

SHEET — ASTRONAUT C10 REPLACE (3×3) L→R top→bottom:
1. job-astronaut — ${FIGURE_CELLS[0].note}
2. space-astronaut-gray — ${FIGURE_CELLS[1].note}
3. space-astronaut-orange — ${FIGURE_CELLS[2].note}
4. planet-astronaut-helmet — ${FIGURE_CELLS[3].note}
5. spacesuit-empty — ${FIGURE_CELLS[4].note}
6. space-boot — ${FIGURE_CELLS[5].note}
7. oxygen-tank — ${FIGURE_CELLS[6].note}
8. astronaut-glove — ${FIGURE_CELLS[7].note}
9. visors-helmet-open — ${FIGURE_CELLS[8].note}
Keys: ${FIGURE_CELLS.map((c) => c.key).join(',')}

Return 1 PNG + legend. No essay.`;

const BRIEF = withEslAssetGeneratorBrief(BRIEF_BODY);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const queue = fs.existsSync(QUEUE_JSON) ? JSON.parse(fs.readFileSync(QUEUE_JSON, 'utf8')) : null;

const dumpBase = {
  started_at: new Date().toISOString(),
  agent_profile: profile,
  force_skills: force,
  quality: 'default',
  kind: 'person-crop-c10-replace',
  wave: 'person-crop-replace',
  cells: FIGURE_CELLS,
  queue_figures: queue && queue.figures ? queue.figures.map((e) => e.key) : null,
  import_hint:
    'npm run assets:import-sheet -- <sheet.png> --grid=3x3 --prefix= — names from legend; map space-astronaut-orange → space-astronaut-orange-a and alias b/c/d; leave old dockSafe:false until new keys pass C10',
};

if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) {
    console.error('REFUSING — already created', prev.task_id, prev.task_url || '');
    process.exit(2);
  }
}

fs.writeFileSync(
  PROMPT_FALLBACK,
  ['# Person-crop C10 replace (astronauts)', '', BRIEF, ''].join('\n'),
);

if (DRY) {
  fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, dry_run: true, brief: BRIEF }, null, 2));
  console.log(JSON.stringify({ phase: 'dry_run', out: OUT_JSON }, null, 2));
  process.exit(0);
}

try {
  apiKey();
} catch (err) {
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify({ ...dumpBase, wall: 'MANUS_API_KEY missing', brief: BRIEF, prompt: PROMPT_FALLBACK }, null, 2),
  );
  console.error('WALL: MANUS_API_KEY missing — wrote', PROMPT_FALLBACK);
  console.error(String(err && err.message ? err.message : err));
  process.exit(3);
}

let created;
try {
  created = await createTask({
    title: 'ESL black props: astronaut C10 crop replace (full figures ≥3% top margin)',
    message: BRIEF,
    agent_profile: profile,
    force_skills: force,
    hide_in_task_list: false,
    interactive_mode: false,
  });
} catch (err) {
  const msg = String(err && err.message ? err.message : err);
  const wall = /401|expired|unauthenticated|deleted or does not exist/i.test(msg)
    ? 'MANUS_API_KEY rejected — update repo .env MANUS_API_KEY then re-run'
    : 'task.create failed';
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify({ ...dumpBase, wall, error: msg, brief: BRIEF, prompt: PROMPT_FALLBACK }, null, 2),
  );
  console.error('WALL:', wall, '— wrote', PROMPT_FALLBACK);
  console.error(msg);
  process.exit(3);
}

const taskId = created.task_id || created.id || null;
const taskUrl = created.task_url || (taskId ? `https://manus.im/app/${taskId}` : null);
fs.writeFileSync(
  OUT_JSON,
  JSON.stringify({ ...dumpBase, task_id: taskId, task_url: taskUrl, created }, null, 2),
);
console.log(
  JSON.stringify(
    {
      phase: 'created',
      task_id: taskId,
      task_url: taskUrl,
      keys: FIGURE_CELLS.map((c) => c.key),
    },
    null,
    2,
  ),
);
