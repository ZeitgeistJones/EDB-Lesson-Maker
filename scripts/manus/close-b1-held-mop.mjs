/**
 * Close B1 held-wave mop QA in the durable stockpile inventory.
 *
 * Stockpile bookkeeping only. Does not import, key, wire, reclassify, or touch
 * CODE_LATER / DEFER_B2.
 */
import fs from 'fs';
import path from 'path';
import { ROOT } from './client.mjs';
import { STOCKPILE_REL, TRACKED_INV_REL, GENERATE } from './b1-stockpile-keys.mjs';

const MAIN_RUN = 'held-wave-mop/2026-08-18T23-01-44-347Z';
const WAVE2_RETRY_RUN = 'held-wave-mop/2026-08-18T23-05-22-836Z';

const FINAL = {
  checkpoint: '8a5f0ed8',
  original_generate: 53,
  previous_clean: 19,
  mop_candidates: 34,
  recovered_locally: 14,
  regenerated_accepted: 34,
  final_pass: 53,
  remaining_hold: 0,
  final_sources: {
    'wave2-p0-narrative-complication': {
      sheet: `${MAIN_RUN}/01.blackfield.png`,
      raw_replacement: `${MAIN_RUN}/01.png`,
      task_id: 'Vv2uhtpKsZqz4pCx7zRxtw',
      task_url: 'https://manus.im/app/Vv2uhtpKsZqz4pCx7zRxtw',
      disposition:
        'PASS after deterministic local black-field rebuild of the accepted Manus replacement; raw Manus still preserved.',
      recovered_locally: true,
      note:
        'Wave 2 white cells were A: Manus blank/white art, not slicing. First mop task had cleaner semantics; local flood-fill removed border-connected white backplates.',
    },
    'wave3-p1-information-tracking': {
      sheet: `${MAIN_RUN}/02.png`,
      task_id: 'Vv2uhtpKsZqz4pCx7zRxtw',
      task_url: 'https://manus.im/app/Vv2uhtpKsZqz4pCx7zRxtw',
      disposition: 'PASS: no readable baked text; information relations remain visually understandable.',
      recovered_locally: false,
    },
    'wave4-p2-grammar-self-repair': {
      sheet: `${MAIN_RUN}/03.png`,
      task_id: 'Vv2uhtpKsZqz4pCx7zRxtw',
      task_url: 'https://manus.im/app/Vv2uhtpKsZqz4pCx7zRxtw',
      disposition: 'PASS: semantic relation mini-scenes replace off-brief decorative vocabulary objects.',
      recovered_locally: false,
    },
  },
  preserved_extra_runs: [
    {
      path: WAVE2_RETRY_RUN,
      task_id: 'WpJyizVUEsTYaaYPfu6ny6',
      task_url: 'https://manus.im/app/WpJyizVUEsTYaaYPfu6ny6',
      disposition:
        'Preserved but not selected: black-field rebuild passed mechanically, but rain-starts added a second blocked-path complication.',
    },
  ],
};

const WAVE_KEY_ORDER = {
  'wave2-p0-narrative-complication': [
    'b1-complication-rain-starts',
    'b1-complication-place-closed',
    'b1-complication-item-missing',
    'b1-complication-short-delay',
    'b1-complication-path-blocked',
    'b1-complication-item-unavailable',
    'b1-reaction-notice-problem',
    'b1-reaction-worried-to-ready',
    'b1-action-ask-help',
    'b1-action-change-plan',
    'b1-action-try-again',
    'b1-action-choose-backup',
    'b1-outcome-problem-solved',
    'b1-outcome-plan-restored',
  ],
  'wave3-p1-information-tracking': [
    'b1-info-source-to-key-facts-to-recipient',
    'b1-info-practical-relay-chain',
    'b1-info-two-key-facts-bundle',
    'b1-info-update-changes-plan',
    'b1-track-main-point-support-local-clue',
    'b1-track-local-inference-clue-to-answer',
    'b1-track-supporting-detail-pin-cluster',
    'b1-viewpoint-predict-outcome-check',
    'b1-viewpoint-opinion-reason-outcome',
    'b1-viewpoint-two-familiar-perspectives',
    'b1-viewpoint-prediction-changed-by-new-fact',
  ],
  'wave4-p2-grammar-self-repair': [
    'b1-grammar-background-event-overlay',
    'b1-grammar-experience-now-bridge',
    'b1-grammar-condition-result-path',
    'b1-grammar-plan-changed-overlay',
    'b1-grammar-speaker-relayed-message',
    'b1-turn-thought-group-beads',
    'b1-turn-pause-and-continue',
    'b1-turn-self-correction-swap',
    'b1-turn-keep-going-path',
  ],
};

const INVENTORY_PATHS = [
  path.join(ROOT, STOCKPILE_REL, 'inventory.json'),
  path.join(ROOT, TRACKED_INV_REL),
];

function generatedPassItems(inv) {
  let pass = 0;
  for (const wave of Object.values(inv.waves || {})) {
    for (const item of wave.items || []) {
      if (item.classification === 'GENERATE' && item.qa_status === 'pass') pass += 1;
    }
  }
  return pass;
}

function closeInventory(filePath) {
  const inv = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const now = new Date().toISOString();
  inv.updated_at = now;
  inv.b1_held_wave_mop = { ...FINAL, closed_at: now };

  for (const wave of Object.values(inv.waves || {})) {
    for (const item of wave.items || []) {
      if (item.classification !== 'GENERATE') continue;
      item.status = 'generated_raw';
      item.obvious_fail = false;
      item.qa_status = 'pass';
      item.qa_note = item.qa_note || 'PASS from original clean Wave 1 stockpile QA.';
    }
    if (wave.items && wave.items.length) {
      wave.held = 0;
      wave.failed = 0;
      wave.qa_status = 'pass';
      wave.qa_notes = wave.qa_notes || [];
    }
  }

  for (const [waveId, source] of Object.entries(FINAL.final_sources)) {
    const wave = inv.waves && inv.waves[waveId];
    if (!wave) throw new Error(`Missing wave in inventory: ${waveId}`);
    const order = WAVE_KEY_ORDER[waveId];
    wave.replacement_sheets = Array.from(
      new Map([...(wave.replacement_sheets || []), source].map((x) => [x.sheet, x])).values(),
    );
    wave.qa_status = 'pass';
    wave.qa_notes = [source.disposition, source.note].filter(Boolean);
    for (const item of wave.items || []) {
      const index = order.indexOf(item.key);
      if (index === -1) continue;
      item.status = 'generated_raw';
      item.obvious_fail = false;
      item.qa_status = 'pass';
      item.qa_note = source.disposition;
      item.replacement = {
        sheet: source.sheet,
        raw_replacement: source.raw_replacement || source.sheet,
        task_id: source.task_id,
        task_url: source.task_url,
        cell_index: index + 1,
        recovered_locally: source.recovered_locally,
      };
    }
  }

  const pass = generatedPassItems(inv);
  if (pass !== GENERATE.length) {
    throw new Error(`Expected ${GENERATE.length} GENERATE pass items, got ${pass}`);
  }

  inv.running_total = {
    ...(inv.running_total || {}),
    generate: GENERATE.length,
    concepts_banked_raw: GENERATE.length,
    failed: 0,
    held: 0,
    safety_skipped: 0,
    generate_pass: GENERATE.length,
    generate_hold: 0,
  };

  fs.writeFileSync(filePath, `${JSON.stringify(inv, null, 2)}\n`);
}

for (const filePath of INVENTORY_PATHS) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing inventory: ${filePath}`);
  closeInventory(filePath);
}

const finalPath = path.join(ROOT, STOCKPILE_REL, 'held-wave-mop', 'final-ledger.json');
fs.writeFileSync(finalPath, `${JSON.stringify({ ...FINAL, closed_at: new Date().toISOString() }, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      phase: 'b1-held-mop-closed',
      original_generate: FINAL.original_generate,
      previous_clean: FINAL.previous_clean,
      mop_candidates: FINAL.mop_candidates,
      recovered_locally: FINAL.recovered_locally,
      regenerated_accepted: FINAL.regenerated_accepted,
      final_pass: FINAL.final_pass,
      remaining_hold: FINAL.remaining_hold,
      final_ledger: path.relative(ROOT, finalPath),
    },
    null,
    2,
  ),
);
