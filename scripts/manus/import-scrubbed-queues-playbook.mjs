/**
 * Post-Manus import checklist for scrubbed-queue sheets (Shift60).
 *
 * One-command import (preferred once PNGs land in assets-inbox):
 *   node scripts/manus/import-scrubbed-queues.mjs
 *   node scripts/manus/import-scrubbed-queues.mjs --dry-run
 *   node scripts/manus/import-scrubbed-queues.mjs --task=1
 *
 * Uses commission keys from taskN/run.json (not vision labels) + white vocab
 * importer → public/assets/07_vocab-pack/.
 *
 *   node scripts/manus/import-scrubbed-queues-playbook.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PLAN = path.join(ROOT, 'tmp/manus-shift60-scrubbed-queues/plan.json');
const SUMMARY = path.join(ROOT, 'tmp/manus-shift60-scrubbed-queues/send-summary.json');

const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
const summary = fs.existsSync(SUMMARY)
  ? JSON.parse(fs.readFileSync(SUMMARY, 'utf8'))
  : null;

console.log(`# Scrubbed-queue import playbook
Concepts commissioned: ${plan.combinedCount}
Sheets: ${plan.sheetCount} across ${plan.taskCount} Manus tasks
Skip: hug, kids, parents, circle + needsReview

## Manus tasks
${(summary?.results || [])
  .map((r) => `- task ${r.taskNo}: ${r.task_url || r.task_id || '(pending)'}`)
  .join('\n')}

## When PNGs land
1. Unpack into assets-inbox/manus-shift60-scrub/task1|task2/
2. One-shot import (commission keys from run.json):
   node scripts/manus/import-scrubbed-queues.mjs
   # or: npm run assets:import-scrubbed-queues
3. Spot-check a few PNGs in public/assets/07_vocab-pack/img/
4. Re-run in this order (coverage must refresh before scrub):
   npm run discovery && npm run coverageloop && npm run discovery:scrub

## Manual per-sheet (if needed)
  npm run assets:vocab-sheet -- <png> --sheet --grid=3x3 --names=k1,k2,...,k9
  # optional: --white-min=200 --gutter-inset=8 for grey Manus dividers

## Key list
See tmp/manus-shift60-scrubbed-queues/all-keys.txt (${plan.combinedCount} keys)
`);
