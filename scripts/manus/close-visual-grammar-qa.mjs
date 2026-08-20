/**
 * Stamp visual-grammar harvest QA and write the durable report.
 *   node scripts/manus/close-visual-grammar-qa.mjs
 */
import fs from 'fs';
import path from 'path';
import { ROOT } from './client.mjs';
import {
  TRACKED_INV_REL,
  TRACKED_REPORT_REL,
  STOCKPILE_REL,
  DERIVED_REL,
  classificationCounts,
  WAVES,
} from './visual-grammar-keys.mjs';

const HOLD_KEYS = new Set(['surf-classroom-mat']);
const RECOVERED_SHEETS = new Set([
  'vg1-p0-core:02.png',
  'vg1-p0-core:03.png',
  'vg1-p0-core:06.png',
  'vg2-p0-stagecraft:03.png',
  'vg2-p0-stagecraft:05.png',
  'vg2-p0-stagecraft:06.png',
  'vg2-p0-stagecraft:07.png',
  'vg-mop-false-safety:01.png',
]);

const RECOVERED_WAVE_SHEETS = {
  'vg1-p0-core': new Set(['S5', 'S6', 'S3']),
  'vg2-p0-stagecraft': new Set(['S3', 'S5', 'S6', 'S7']),
  'vg-mop-false-safety': new Set(['S1']),
};

const NOTES = {
  'surf-classroom-mat': 'HOLD: baked A/B/C letters on the classroom mat. Rest of the foreground-B sheet is usable. Do not regen the whole sheet.',
};

function familyTable(perFamily, items) {
  const rows = [];
  for (const [family, c] of Object.entries(perFamily)) {
    const famItems = items.filter((it) => it.family === family);
    rows.push({
      family,
      candidate: c.candidate,
      HAVE_ENOUGH: c.HAVE_ENOUGH,
      MANUS_WORTHY: c.MANUS_WORTHY,
      LOCAL_TRANSFORM: c.LOCAL_TRANSFORM,
      CODE_LATER: c.CODE_LATER,
      LOW_VALUE: c.LOW_VALUE,
      generated: famItems.length,
      PASS: famItems.filter((it) => it.qa_status === 'PASS').length,
      HOLD: famItems.filter((it) => it.qa_status === 'HOLD').length,
    });
  }
  return rows;
}

function main() {
  const invPath = path.join(ROOT, TRACKED_INV_REL);
  const inv = JSON.parse(fs.readFileSync(invPath, 'utf8'));
  const items = [];
  for (const [waveId, wave] of Object.entries(inv.waves || {})) {
    const recoveredSheets = RECOVERED_WAVE_SHEETS[waveId] || new Set();
    for (const it of wave.items || []) {
      const hold = HOLD_KEYS.has(it.key);
      it.qa_status = hold ? 'HOLD' : 'PASS';
      it.recovered_locally = recoveredSheets.has(it.sheet_id) || waveId === 'vg-mop-false-safety';
      it.regenerated = false;
      it.qa_note = hold
        ? NOTES[it.key]
        : it.recovered_locally
          ? 'PASS after local recovery (white-to-black, label crop, or mop compose). Imperfect-but-usable kept.'
          : 'PASS after visual QA. Imperfect-but-usable kept; no quota padding.';
      items.push(it);
    }
    wave.holds = (wave.items || []).filter((it) => it.qa_status === 'HOLD').map((it) => it.key);
  }

  const derived = JSON.parse(fs.readFileSync(path.join(ROOT, DERIVED_REL, 'manifest.json'), 'utf8'));
  const counts = classificationCounts();
  const pass = items.filter((it) => it.qa_status === 'PASS').length;
  const hold = items.filter((it) => it.qa_status === 'HOLD').length;
  const recovered = items.filter((it) => it.recovered_locally).length;
  const sheets = Object.values(inv.waves || {}).reduce((n, w) => n + (w.sheets || []).length, 0);

  inv.running_total = {
    ...counts,
    original_manus_worthy: counts.MANUS_WORTHY,
    pass,
    hold,
    locally_recovered: recovered,
    regenerated: 0,
    safety_skipped: 0,
    sheets_downloaded: sheets,
    tasks_used: Object.values(inv.waves || {}).filter((w) => w.task_id).length,
    silhouette_created: derived.silhouette_created,
    lineart_created: derived.lineart_created,
    existing_coloring_skipped: derived.existing_coloring_skipped,
    manual_art_needed: derived.manual_art_needed,
  };
  inv.qa_closed_at = new Date().toISOString();
  inv.updated_at = inv.qa_closed_at;

  const json = JSON.stringify(inv, null, 2);
  fs.writeFileSync(invPath, json);
  fs.writeFileSync(path.join(ROOT, STOCKPILE_REL, 'inventory.json'), json);

  const famRows = familyTable(counts.perFamily, items);
  const md = `# Visual-grammar stockpile report

Stockpile only. No live generator wiring, pedagogy, renderer, UI, or CEFR changes.

## Totals

| Metric | Count |
|---|---:|
| P0 candidates considered | ${counts.considered} |
| HAVE_ENOUGH | ${counts.HAVE_ENOUGH} |
| MANUS_WORTHY net-new | ${counts.MANUS_WORTHY} |
| LOCAL_TRANSFORM (system) | ${counts.LOCAL_TRANSFORM} |
| CODE_LATER | ${counts.CODE_LATER} |
| LOW_VALUE | ${counts.LOW_VALUE} |
| Manus sheets generated | ${sheets} |
| PASS | ${pass} |
| HOLD | ${hold} |
| Locally recovered items | ${recovered} |
| Regenerated | 0 |
| Silhouette derivatives | ${derived.silhouette_created} |
| Line-art derivatives | ${derived.lineart_created} |
| Existing coloring skipped | ${derived.existing_coloring_skipped} |
| Manual-art-needed derivatives | ${derived.manual_art_needed} |

## Per family

| Family | Considered | HAVE | MANUS | CODE | LOW | Generated | PASS | HOLD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
${famRows.map((r) => `| ${r.family} | ${r.candidate} | ${r.HAVE_ENOUGH} | ${r.MANUS_WORTHY} | ${r.CODE_LATER} | ${r.LOW_VALUE} | ${r.generated} | ${r.PASS} | ${r.HOLD} |`).join('\n')}

## Paths

- Durable stockpile: \`${STOCKPILE_REL}/\`
- Derivatives: \`${DERIVED_REL}/\`
- Inventory: \`${TRACKED_INV_REL}\`
- P1 shortlist: \`docs/visual-grammar-p1-shortlist.md\`

## Top 5 visual-language systems that were absent or weak

1. **Comics / action / effect grammar** — almost no reusable speed lines, impacts, puffs, sparkles-as-overlays, or sensory swirls. The live bank had objects (confetti, a shopping burst), not action grammar.
2. **Illustrated interaction affordances** — hundreds of containers, almost no ghost destinations, snap halos, sockets, wells, or hang/insert grammar.
3. **Modular foreground / depth / occlusion + neutral stages** — full backgrounds are deep; grass/desk/stage-lip edges and topic-neutral rugs/platforms were missing.
4. **Mystery presentation devices** — hide/reveal *containers* are deep; torn-paper, fog, keyhole portals, scratch panels, and peek states were not.
5. **Field atmosphere overlays** — H3 had compact rain/snow/night atoms; light/heavy rain fields, mist, sun rays, sunset wash, and heat shimmer were not a reusable overlay kit.

## QA notes

- False safety skip originally dropped \`draped\` / \`drape\` because substring \`rape\`. Filter is now word-boundary. Those two keys were mopped on a 1x2 sheet and locally composed to black field.
- Several Manus sheets arrived on white plates. Local white-to-black recovery was applied where it did not eat grey art.
- \`vg1\` foreground-A (\`08.png\`) was left on the original white plate: grey roads/sidewalks were destroyed by flood-fill. Art is still usable with white keying.
- Comics C had baked key labels; labels were cropped off locally.
- One HOLD: \`surf-classroom-mat\` has baked A/B/C letters. Do not regenerate the whole sheet.
- Line-art derivatives are silhouette-outline coloring versions, not noisy edge-detection. Ten sources were too holey/noisy and were recorded as MANUAL_ART_NEEDED instead of shipping garbage.
- P1 systems and three thin theme kits were classified only. Not manufactured.

## Manus tasks

- VG1: https://manus.im/app/YEPQ4V6boTvP4nhUPVtajL
- VG2: https://manus.im/app/me7VwcYzRFEGo2EJbkzTdL
- Mop: https://manus.im/app/Aonym5SM47Vfz3HNKLFGwX
`;

  const reportPath = path.join(ROOT, TRACKED_REPORT_REL);
  fs.writeFileSync(reportPath, md);
  console.log(JSON.stringify({
    pass,
    hold,
    recovered,
    sheets,
    report: TRACKED_REPORT_REL,
    inventory: TRACKED_INV_REL,
  }, null, 2));
}

main();
