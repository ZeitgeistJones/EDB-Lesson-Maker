/**
 * Record lightweight B1 stockpile QA outcomes without importing/keying assets.
 *
 * This keeps raw Manus harvests durable while making off-brief waves explicit
 * in both the harvested inventory and tracked docs copy.
 */
import fs from 'fs';
import path from 'path';
import { ROOT } from './client.mjs';
import { STOCKPILE_REL, TRACKED_INV_REL } from './b1-stockpile-keys.mjs';

const INVENTORY_PATHS = [
  path.join(ROOT, STOCKPILE_REL, 'inventory.json'),
  path.join(ROOT, TRACKED_INV_REL),
];

const QA_HOLDS = {
  'wave2-p0-narrative-complication': {
    held: 1,
    note:
      'Lightweight QA hold: retry removed text but still used worksheet-white cell panels instead of pure black contact-sheet fields. Raw sheets kept; reissue before import/keying.',
    itemStatus: 'held_raw',
    obviousFail: true,
  },
  'wave3-p1-information-tracking': {
    held: 1,
    note:
      'Lightweight QA hold: retry improved the main text leak but still includes baked environmental labels/tiny text on some books, signs, screens, or papers. Raw sheets kept; reissue before import/keying.',
    itemStatus: 'held_raw',
    obviousFail: true,
  },
  'wave4-p2-grammar-self-repair': {
    held: 1,
    note:
      'Lightweight QA hold: retry came back as generic object art instead of B1 relation mini-scenes for time/change/condition/speech/self-repair. Raw sheets kept; reissue before import/keying.',
    itemStatus: 'held_raw',
    obviousFail: true,
  },
};

function annotateInventory(filePath) {
  const inv = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const waves = inv.waves || {};

  for (const [waveId, hold] of Object.entries(QA_HOLDS)) {
    const wave = waves[waveId];
    if (!wave) continue;

    wave.held = hold.held;
    wave.qa_status = 'held_raw';
    wave.qa_notes = Array.from(new Set([...(wave.qa_notes || []), hold.note]));

    for (const item of wave.items || []) {
      item.status = hold.itemStatus;
      item.obvious_fail = hold.obviousFail;
      item.qa_status = 'held_raw';
      item.qa_note = hold.note;
    }
  }

  let held = 0;
  let failed = 0;
  let banked = 0;
  for (const wave of Object.values(waves)) {
    held += Number(wave.held || 0);
    failed += Number(wave.failed || 0);
    for (const item of wave.items || []) {
      if (item.status === 'generated_raw') banked += 1;
    }
  }

  inv.updated_at = new Date().toISOString();
  inv.running_total = {
    ...(inv.running_total || {}),
    concepts_banked_raw: banked,
    failed,
    held,
  };

  fs.writeFileSync(filePath, `${JSON.stringify(inv, null, 2)}\n`);
}

for (const filePath of INVENTORY_PATHS) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing inventory: ${filePath}`);
  }
  annotateInventory(filePath);
}

console.log(
  JSON.stringify(
    {
      phase: 'qa-annotated',
      holds: Object.keys(QA_HOLDS),
      inventories: INVENTORY_PATHS,
    },
    null,
    2,
  ),
);
