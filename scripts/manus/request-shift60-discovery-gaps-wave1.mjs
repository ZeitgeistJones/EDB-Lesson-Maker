/**
 * Shift60 discovery-gaps wave1 — top open-world gaps from
 * tmp/asset-discovery/latest.json (rankedDiscoveryGaps / buckets.newDiscoveryGap).
 *
 * DEFAULT IS DRY-RUN (writes OUT_DIR only). Does NOT call Manus / spend credits
 * unless you pass --send explicitly.
 *
 * Dry-run (safe, default):
 *   node scripts/manus/request-shift60-discovery-gaps-wave1.mjs
 *   node scripts/manus/request-shift60-discovery-gaps-wave1.mjs --dry-run
 *
 * Fire later (spends Manus credits — only when intentionally commissioning):
 *   node scripts/manus/request-shift60-discovery-gaps-wave1.mjs --send
 *
 * After PNGs land: label + staged import (3×3 white vocab sheets), e.g.
 *   npm run assets:label-sheet -- --sheet=<png> --grid=3x3 --out=tmp/labels-discovery-w1.json
 *   npm run assets:import-sheet -- <png> --grid=3x3 --labels=... --prefix=disc- --pack=<theme> --stage=tmp/...
 *
 * Source queue mirror: tmp/asset-discovery/manus-ready-queue.txt
 * Regenerated discovery snapshot: npm run … (asset-gap-discovery) → latest.json
 *
 * Skip abstracts/junk; OBJECTS only. 3 sheets × 9 = 27 keys.
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const SEND = process.argv.includes('--send');
const DRY = !SEND || process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-discovery-gaps-wave1');
const OUT_JSON = path.join(OUT_DIR, 'run.json');
const QUEUE_TXT = path.join(ROOT, 'tmp', 'asset-discovery', 'manus-ready-queue.txt');
const QUEUE_JSON = path.join(ROOT, 'tmp', 'asset-discovery', 'manus-ready-queue.json');

/** Wave1 contact-sheet keys — high picturable ESL nouns for kids (3×3 × 3). */
const SHEETS = [
  {
    id: 'S1',
    theme: 'shoes-clothes-gear',
    title: 'SHOES / CLOTHES GEAR',
    cells: [
      ['boot', 'boot'],
      ['sneaker', 'sneaker'],
      ['slipper', 'slipper'],
      ['cleat', 'sports cleat'],
      ['laces', 'shoe laces'],
      ['leggings', 'leggings'],
      ['overalls', 'overalls'],
      ['velcro', 'velcro fastener strip'],
      ['floatie', 'swim floatie ring'],
    ],
  },
  {
    id: 'S2',
    theme: 'body-nature-kids',
    title: 'BODY / NATURE (KIDS)',
    cells: [
      ['chin', 'chin'],
      ['eyebrow', 'eyebrow'],
      ['eyelash', 'eyelash'],
      ['shoulder', 'shoulder'],
      ['fin', 'fish / swim fin'],
      ['sprout', 'plant sprout'],
      ['pawprint', 'animal pawprint'],
      ['cub', 'bear cub'],
      ['pup', 'puppy / pup'],
    ],
  },
  {
    id: 'S3',
    theme: 'objects-adventure',
    title: 'OBJECTS / ADVENTURE',
    cells: [
      ['gluestick', 'glue stick'],
      ['drumstick', 'drumstick'],
      ['chopstick', 'chopstick'],
      ['carry-on', 'carry-on suitcase'],
      ['canyon', 'canyon'],
      ['geode', 'geode rock'],
      ['mummy', 'mummy (wrapped, friendly)'],
      ['moat', 'castle moat'],
      ['catapult', 'catapult'],
    ],
  },
];

const WAVE1_KEYS = SHEETS.flatMap((s) => s.cells.map(([k]) => k));

/** Ranked follow-on queue (same snapshot) — not in this brief; next waves. */
const QUEUE_FOLLOW_ON = [
  'clippers', 'knitting-needle', 'quill', 'puck', 'mast', 'vise', 'roller', 'socket',
  'mortar', 'peak', 'balance-scale', 'coop', 'dropper', 'patrol-car', 'smoke-detector',
  'spool', 'bleacher', 'patch', 'rib', 'tag', 'denim', 'felt', 'aisle', 'hip', 'spine', 'waist',
];

function sheetBlock(sheet, index) {
  const lines = sheet.cells.map(([key, label], i) => `${i + 1}. ${key} — ${label}`);
  const keys = sheet.cells.map(([k]) => k).join(',');
  return `SHEET ${index} — ${sheet.title}:\n${lines.join('\n')}\nKeys: ${keys}`;
}

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

${SHEETS.map((s, i) => sheetBlock(s, i + 1)).join('\n\n')}

Return 3 PNGs + short legends. No essay.`);

function writeQueueFiles() {
  const discoveryDir = path.dirname(QUEUE_TXT);
  fs.mkdirSync(discoveryDir, { recursive: true });
  const header = [
    '# Manus-ready discovery-gap queue (Track C)',
    '# Source: tmp/asset-discovery/latest.json rankedDiscoveryGaps',
    '# Wave1 (this script brief) = first 27 lines after header',
    '# Fire: node scripts/manus/request-shift60-discovery-gaps-wave1.mjs --send',
    '# Default run is dry-run only (no credits).',
    '',
  ].join('\n');
  const ranked = [...WAVE1_KEYS, ...QUEUE_FOLLOW_ON];
  fs.writeFileSync(QUEUE_TXT, `${header}${ranked.join('\n')}\n`, 'utf8');
  fs.writeFileSync(
    QUEUE_JSON,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: 'tmp/asset-discovery/latest.json rankedDiscoveryGaps',
        wave1Script: 'scripts/manus/request-shift60-discovery-gaps-wave1.mjs',
        wave1Keys: WAVE1_KEYS,
        followOn: QUEUE_FOLLOW_ON,
        sheets: SHEETS.map((s) => ({
          id: s.id,
          theme: s.theme,
          keys: s.cells.map(([k]) => k),
        })),
        fireLater: {
          dryRun: 'node scripts/manus/request-shift60-discovery-gaps-wave1.mjs',
          send: 'node scripts/manus/request-shift60-discovery-gaps-wave1.mjs --send',
          outDir: 'tmp/manus-shift60-discovery-gaps-wave1',
        },
      },
      null,
      2,
    ),
    'utf8',
  );
}

fs.mkdirSync(OUT_DIR, { recursive: true });
writeQueueFiles();

const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = {
  started_at: new Date().toISOString(),
  agent_profile: profile,
  force_skills: force,
  quality: 'default',
  wave: 1,
  shift: 60,
  kind: 'discovery-gaps',
  source: 'tmp/asset-discovery/latest.json',
  sheets: SHEETS.map((s) => ({
    id: s.id,
    theme: s.theme,
    keys: s.cells.map(([k]) => k),
  })),
  keys: WAVE1_KEYS,
  queue_txt: 'tmp/asset-discovery/manus-ready-queue.txt',
};

if (fs.existsSync(OUT_JSON) && SEND && !process.env.MANUS_FORCE_RERUN) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
  if (prev.task_id) {
    console.error('REFUSING', prev.task_id);
    process.exit(2);
  }
}

if (DRY) {
  fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, dry_run: true, brief: BRIEF }, null, 2));
  console.log(
    JSON.stringify(
      {
        phase: 'dry-run',
        send: false,
        out_dir: OUT_DIR,
        queue_txt: QUEUE_TXT,
        queue_json: QUEUE_JSON,
        sheet_count: SHEETS.length,
        key_count: WAVE1_KEYS.length,
        keys: WAVE1_KEYS,
        fire_later: 'node scripts/manus/request-shift60-discovery-gaps-wave1.mjs --send',
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift60 discovery-gaps wave1 (shoes/body/adventure)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(
  OUT_JSON,
  JSON.stringify(
    {
      ...dumpBase,
      dry_run: false,
      task_id: taskId,
      task_url: created.task_url || (taskId ? 'https://manus.im/app/' + taskId : null),
      themes: SHEETS.map((s) => s.theme),
      created,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url, out_dir: OUT_DIR }, null, 2));
