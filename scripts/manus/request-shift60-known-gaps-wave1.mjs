/**
 * Shift60 known-universe gaps wave1 — residual coverageloop commission set
 * from tmp/asset-coverage/known-gap-triage.md class (a) + one (d) pad.
 *
 * DEFAULT IS DRY-RUN (writes OUT_DIR + queue txt only). Does NOT call Manus /
 * spend credits unless you pass --send explicitly.
 *
 * Dry-run (safe, default):
 *   node scripts/manus/request-shift60-known-gaps-wave1.mjs
 *   node scripts/manus/request-shift60-known-gaps-wave1.mjs --dry-run
 *
 * Fire later (spends Manus credits — only when intentionally commissioning):
 *   node scripts/manus/request-shift60-known-gaps-wave1.mjs --send
 *
 * After PNGs land: label + staged import (3×3 white vocab sheets), e.g.
 *   npm run assets:label-sheet -- --sheet=<png> --grid=3x3 --out=tmp/labels-known-gaps-w1.json
 *   npm run assets:import-sheet -- <png> --grid=3x3 --labels=... --prefix= --pack=<theme> --stage=tmp/...
 *
 * Source queue mirror: tmp/asset-coverage/manus-ready-known-gaps.txt
 * Regenerated coverage snapshot: npm run coverageloop → latest.json + triage
 *
 * Skip (b) other-key (fabric/bin/piñata) and (c) drop/deny. OBJECTS / clear stills only.
 * One sheet × 9 = 9 keys (8 commission + lava near-synonym pad).
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const SEND = process.argv.includes('--send');
const DRY = !SEND || process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-known-gaps-wave1');
const OUT_JSON = path.join(OUT_DIR, 'run.json');
const QUEUE_TXT = path.join(ROOT, 'tmp', 'asset-coverage', 'manus-ready-known-gaps.txt');
const QUEUE_JSON = path.join(ROOT, 'tmp', 'asset-coverage', 'manus-ready-known-gaps.json');

/**
 * Wave1 contact-sheet keys — triage (a) commission + lava (d) pad for full 3×3.
 * Labels steer Manus toward picturable stills (hug/kids/circle/forehead need care).
 */
const SHEETS = [
  {
    id: 'S1',
    theme: 'known-gap-commission',
    title: 'KNOWN GAPS (COMMISSION)',
    cells: [
      ['kids', 'two kids / children figures (friendly, no text)'],
      ['hug', 'two people hugging / embrace gesture (friendly, no faces needed)'],
      ['kiln', 'pottery kiln oven'],
      ['glaze', 'pottery glaze jar with dripping ceramic glaze'],
      ['cavity', 'tooth with dental cavity hole'],
      ['locksmith', 'locksmith key ring + padlock tools (role props, not full face)'],
      ['circle', 'simple geometric circle shape (shape card, not jewelry ring)'],
      ['forehead', 'close-up forehead / brow of a face (body-part crop)'],
      ['lava', 'bright lava flow / magma blob (near-synonym pad; volcano optional)'],
    ],
  },
];

const WAVE1_KEYS = SHEETS.flatMap((s) => s.cells.map(([k]) => k));

/** Ranked follow-on (d) near-synonym lows — not in this brief; optional later. */
const QUEUE_FOLLOW_ON = [
  'beacon', 'crater', 'stitch', 'package', 'parents', 'artifact',
];

function sheetBlock(sheet, index) {
  const lines = sheet.cells.map(([key, label], i) => `${i + 1}. ${key} — ${label}`);
  const keys = sheet.cells.map(([k]) => k).join(',');
  return `SHEET ${index} — ${sheet.title}:\n${lines.join('\n')}\nKeys: ${keys}`;
}

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS / clear picturable stills only — skip abstracts and logos.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 1 PNG.

${SHEETS.map((s, i) => sheetBlock(s, i + 1)).join('\n\n')}

Return 1 PNG + short legend. No essay.`);

function writeQueueFiles() {
  const coverageDir = path.dirname(QUEUE_TXT);
  fs.mkdirSync(coverageDir, { recursive: true });
  const header = [
    '# Manus-ready known-universe gap queue (Track C2)',
    '# Source: tmp/asset-coverage/known-gap-triage.md class (a) + lava (d) pad',
    '# Wave1 (this script brief) = first 9 lines after header',
    '# Skip: fabric/bin/pinata (b other-key); keeper/plastic (c drop); photograph (d drop)',
    '# Fire: node scripts/manus/request-shift60-known-gaps-wave1.mjs --send',
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
        source: 'tmp/asset-coverage/known-gap-triage.md + latest.json rankedGaps',
        wave1Script: 'scripts/manus/request-shift60-known-gaps-wave1.mjs',
        wave1Keys: WAVE1_KEYS,
        commissionA: ['hug', 'kids', 'kiln', 'glaze', 'cavity', 'locksmith', 'circle', 'forehead'],
        padD: ['lava'],
        skippedB: ['fabric', 'bin', 'pinata'],
        followOn: QUEUE_FOLLOW_ON,
        sheets: SHEETS.map((s) => ({
          id: s.id,
          theme: s.theme,
          keys: s.cells.map(([k]) => k),
        })),
        fireLater: {
          dryRun: 'node scripts/manus/request-shift60-known-gaps-wave1.mjs',
          send: 'node scripts/manus/request-shift60-known-gaps-wave1.mjs --send',
          outDir: 'tmp/manus-shift60-known-gaps-wave1',
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
  kind: 'known-gaps',
  source: 'tmp/asset-coverage/known-gap-triage.md',
  sheets: SHEETS.map((s) => ({
    id: s.id,
    theme: s.theme,
    keys: s.cells.map(([k]) => k),
  })),
  keys: WAVE1_KEYS,
  queue_txt: 'tmp/asset-coverage/manus-ready-known-gaps.txt',
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
        fire_later: 'node scripts/manus/request-shift60-known-gaps-wave1.mjs --send',
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift60 known-gaps wave1 (commission residual)',
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
