# Final Visual Asset Quality Baseline

Closed: `2026-08-18T17:24:02.899375+00:00`
Audit schema version: `2026-08-18-final-baseline-v1`

## Scope

- Inventory remains 14,002 rows with zero generic pending rows.
- This closure used existing durable audit decisions and existing source/derivative evidence only.
- No A1 generation, Manus generation/harvesting/sends, lesson wiring, producer refactors, or production manifest imports were run.
- Raw source/contact sheet rows remain typed as source provenance; production derivative failures are separated from raw-source availability.

## Five-Category Final Disposition

- PASS: 11246 (80.32%)
- REVIEW: 605 (4.32%)
- ART_REDO: 465 (3.32%)
- PIPELINE_REBUILD: 1669 (11.92%)
- SOURCE_CORRUPT: 17 (0.12%)

## Repair Scope

- Pipeline-caused/potentially recoverable rows at 08d38ae8: 2205
- Confirmed recovered / production-good after existing repair evidence: 519
- Still unresolved as PIPELINE_REBUILD: 1669
- Source corrupt/unreadable: 17

## Live Vs Raw-Harvest Quality

- live: 12332 rows; ART_REDO 456 (3.70%), PASS 10504 (85.18%), PIPELINE_REBUILD 767 (6.22%), REVIEW 605 (4.91%), SOURCE_CORRUPT 0 (0.00%)
- raw_harvest: 1670 rows; ART_REDO 9 (0.54%), PASS 742 (44.43%), PIPELINE_REBUILD 902 (54.01%), REVIEW 0 (0.00%), SOURCE_CORRUPT 17 (1.02%)

## Quality By Major Family

- B2/raw settings: 122 rows; ART_REDO 0 (0.00%), PASS 0 (0.00%), PIPELINE_REBUILD 110 (90.16%), REVIEW 0 (0.00%), SOURCE_CORRUPT 12 (9.84%)
- Pre-A1 functional: 342 rows; ART_REDO 9 (2.63%), PASS 223 (65.20%), PIPELINE_REBUILD 105 (30.70%), REVIEW 0 (0.00%), SOURCE_CORRUPT 5 (1.46%)
- background: 128 rows; ART_REDO 0 (0.00%), PASS 125 (97.66%), PIPELINE_REBUILD 3 (2.34%), REVIEW 0 (0.00%), SOURCE_CORRUPT 0 (0.00%)
- heroes: 2068 rows; ART_REDO 0 (0.00%), PASS 1341 (64.85%), PIPELINE_REBUILD 723 (34.96%), REVIEW 4 (0.19%), SOURCE_CORRUPT 0 (0.00%)
- hide/reveal: 64 rows; ART_REDO 7 (10.94%), PASS 47 (73.44%), PIPELINE_REBUILD 7 (10.94%), REVIEW 3 (4.69%), SOURCE_CORRUPT 0 (0.00%)
- letters/literacy: 245 rows; ART_REDO 4 (1.63%), PASS 233 (95.10%), PIPELINE_REBUILD 6 (2.45%), REVIEW 2 (0.82%), SOURCE_CORRUPT 0 (0.00%)
- props: 3858 rows; ART_REDO 0 (0.00%), PASS 2677 (69.39%), PIPELINE_REBUILD 634 (16.43%), REVIEW 547 (14.18%), SOURCE_CORRUPT 0 (0.00%)
- story cast/actions/roles/environments: 433 rows; ART_REDO 94 (21.71%), PASS 301 (69.52%), PIPELINE_REBUILD 34 (7.85%), REVIEW 4 (0.92%), SOURCE_CORRUPT 0 (0.00%)
- vocab: 6742 rows; ART_REDO 351 (5.21%), PASS 6299 (93.43%), PIPELINE_REBUILD 47 (0.70%), REVIEW 45 (0.67%), SOURCE_CORRUPT 0 (0.00%)

## Most Common Genuine ART_REDO Reasons

- text_artifact: 207
- generation_artifact: 77
- weak_contrast: 60
- wrong_concept: 59
- poor_cavity: 31
- ambiguous_concept: 22
- identity_drift: 10
- bad_anatomy: 2
- pair_mismatch: 2
- excess_dead_space: 2
- too_small: 1

## Source-Corrupt Provenance

- `raw:sheet:manus-prea1-stockpile:tmp-manus-prea1-stockpile-wave1-instructions-sheets-raw-01-png` -> `tmp/manus-prea1-stockpile/wave1-instructions/sheets/raw/01.png` (Mechanical REDO: PIL could not open image: cannot identify image file 'C:\\dev\\PPT-Lesson-Maker-for-Classin\\tmp\\manu.)
- `raw:sheet:manus-prea1-stockpile:tmp-manus-prea1-stockpile-wave2-tpr-sheets-raw-01-png` -> `tmp/manus-prea1-stockpile/wave2-tpr/sheets/raw/01.png` (Mechanical REDO: PIL could not open image: cannot identify image file 'C:\\dev\\PPT-Lesson-Maker-for-Classin\\tmp\\manu.)
- `raw:sheet:manus-prea1-stockpile:tmp-manus-prea1-stockpile-wave3-relations-sheets-raw-01-png` -> `tmp/manus-prea1-stockpile/wave3-relations/sheets/raw/01.png` (Mechanical REDO: PIL could not open image: cannot identify image file 'C:\\dev\\PPT-Lesson-Maker-for-Classin\\tmp\\manu.)
- `raw:sheet:manus-prea1-stockpile:tmp-manus-prea1-stockpile-wave4-phonology-sheets-raw-01-png` -> `tmp/manus-prea1-stockpile/wave4-phonology/sheets/raw/01.png` (Mechanical REDO: PIL could not open image: cannot identify image file 'C:\\dev\\PPT-Lesson-Maker-for-Classin\\tmp\\manu.)
- `raw:sheet:manus-prea1-stockpile:tmp-manus-prea1-stockpile-wave5-prewriting-sheets-raw-01-png` -> `tmp/manus-prea1-stockpile/wave5-prewriting/sheets/raw/01.png` (Mechanical REDO: PIL could not open image: cannot identify image file 'C:\\dev\\PPT-Lesson-Maker-for-Classin\\tmp\\manu.)
- `raw:sheet:manus-b2-stockpile:tmp-manus-b2-stockpile-wave1-sheets-01-png` -> `tmp/manus-b2-stockpile/wave1/sheets/01.png` (Mechanical REDO: PIL could not open image: cannot identify image file 'C:\\dev\\PPT-Lesson-Maker-for-Classin\\tmp\\manu.)
- `raw:sheet:manus-b2-stockpile:tmp-manus-b2-stockpile-wave10-sheets-01-png` -> `tmp/manus-b2-stockpile/wave10/sheets/01.png` (Mechanical REDO: PIL could not open image: cannot identify image file 'C:\\dev\\PPT-Lesson-Maker-for-Classin\\tmp\\manu.)
- `raw:sheet:manus-b2-stockpile:tmp-manus-b2-stockpile-wave10-sheets-02-png` -> `tmp/manus-b2-stockpile/wave10/sheets/02.png` (Mechanical REDO: PIL could not open image: cannot identify image file 'C:\\dev\\PPT-Lesson-Maker-for-Classin\\tmp\\manu.)
- `raw:sheet:manus-b2-stockpile:tmp-manus-b2-stockpile-wave2-sheets-01-png` -> `tmp/manus-b2-stockpile/wave2/sheets/01.png` (Mechanical REDO: PIL could not open image: cannot identify image file 'C:\\dev\\PPT-Lesson-Maker-for-Classin\\tmp\\manu.)
- `raw:sheet:manus-b2-stockpile:tmp-manus-b2-stockpile-wave3-sheets-01-png` -> `tmp/manus-b2-stockpile/wave3/sheets/01.png` (Mechanical REDO: PIL could not open image: cannot identify image file 'C:\\dev\\PPT-Lesson-Maker-for-Classin\\tmp\\manu.)
- `raw:sheet:manus-b2-stockpile:tmp-manus-b2-stockpile-wave4-sheets-01-png` -> `tmp/manus-b2-stockpile/wave4/sheets/01.png` (Mechanical REDO: PIL could not open image: cannot identify image file 'C:\\dev\\PPT-Lesson-Maker-for-Classin\\tmp\\manu.)
- `raw:sheet:manus-b2-stockpile:tmp-manus-b2-stockpile-wave4-sheets-13-png` -> `tmp/manus-b2-stockpile/wave4/sheets/13.png` (Mechanical REDO: PIL could not open image: cannot identify image file 'C:\\dev\\PPT-Lesson-Maker-for-Classin\\tmp\\manu.)
- `raw:sheet:manus-b2-stockpile:tmp-manus-b2-stockpile-wave5-sheets-01-png` -> `tmp/manus-b2-stockpile/wave5/sheets/01.png` (Mechanical REDO: PIL could not open image: cannot identify image file 'C:\\dev\\PPT-Lesson-Maker-for-Classin\\tmp\\manu.)
- `raw:sheet:manus-b2-stockpile:tmp-manus-b2-stockpile-wave6-sheets-01-png` -> `tmp/manus-b2-stockpile/wave6/sheets/01.png` (Mechanical REDO: PIL could not open image: cannot identify image file 'C:\\dev\\PPT-Lesson-Maker-for-Classin\\tmp\\manu.)
- `raw:sheet:manus-b2-stockpile:tmp-manus-b2-stockpile-wave7-sheets-01-png` -> `tmp/manus-b2-stockpile/wave7/sheets/01.png` (Mechanical REDO: PIL could not open image: cannot identify image file 'C:\\dev\\PPT-Lesson-Maker-for-Classin\\tmp\\manu.)
- `raw:sheet:manus-b2-stockpile:tmp-manus-b2-stockpile-wave8-sheets-01-png` -> `tmp/manus-b2-stockpile/wave8/sheets/01.png` (Mechanical REDO: PIL could not open image: cannot identify image file 'C:\\dev\\PPT-Lesson-Maker-for-Classin\\tmp\\manu.)
- `raw:sheet:manus-b2-stockpile:tmp-manus-b2-stockpile-wave9-sheets-01-png` -> `tmp/manus-b2-stockpile/wave9/sheets/01.png` (Mechanical REDO: PIL could not open image: cannot identify image file 'C:\\dev\\PPT-Lesson-Maker-for-Classin\\tmp\\manu.)

## Evidence And Queues

- Final index JSONL: `audit/visual-assets/final-index.jsonl`
- Final index CSV: `audit/visual-assets/final-index.csv`
- ART_REDO regeneration queue: `audit/visual-assets/queues/art-redo-regeneration-queue.jsonl` (465 rows)
- REVIEW queue: `audit/visual-assets/queues/review-queue.jsonl` (605 rows)
- Unresolved pipeline queue: `audit/visual-assets/queues/unresolved-pipeline-queue.jsonl` (1669 rows)
- Source-corrupt queue: `audit/visual-assets/queues/source-corrupt-queue.jsonl` (17 rows)
- ART_REDO sheets: `audit/visual-assets/sheets/art-redo/` (32 sheets)
- REVIEW sheets: `audit/visual-assets/sheets/review/` (35 sheets)
- Repaired/rejudged evidence sheets: `audit/visual-assets/sheets/repaired/prea1-relations/prea1-relations-samples.jpg`, `audit/visual-assets/sheets/repaired/mnemonic-az/mnemonic-az-samples.jpg`, `audit/visual-assets/sheets/repaired/edb-setting-variants/edb-setting-variants-samples.jpg`, `audit/visual-assets/sheets/repaired/white-light-keyed-objects/white-light-keyed-objects-samples.jpg`, `audit/visual-assets/sheets/repaired/farm-tree-identity/farm-tree-identity-samples.jpg`, `audit/visual-assets/sheets/repaired/black-block-postprocess/black-block-postprocess-samples.jpg`, `audit/visual-assets/sheets/repaired/b2-extracted-cells/b2-extracted-cells-samples.jpg`
- Atomic prewrite checkpoint: `audit/visual-assets/snapshots/final-baseline-prewrite-2026-08-18T171404-413379+0000`

## Validation

- Final dispositions are exclusive and add to 14,002.
- Stable asset IDs are unique.
- No pending_visual or flagged_mechanical rows remain.
- ART_REDO queue contains only final ART_REDO rows.
- SOURCE_CORRUPT rows retain local source path, source role, hash/byte metadata when present, and original notes.
