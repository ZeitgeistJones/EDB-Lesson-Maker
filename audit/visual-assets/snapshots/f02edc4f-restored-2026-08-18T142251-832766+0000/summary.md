# Visual Asset QA Audit

Audit version: `2026-08-17-v1`
Last migrated: `2026-08-18T14:18:24.563170+00:00`
Audit schema version: `2026-08-18-upstream-repair-v2`

This is a sidecar visual QA audit. It does not mutate production manifests.

## Scope And Completion

- Total indexed assets: 14002
- Live indexed assets: 12332
- Raw-harvest indexed assets: 1670
- Visually decided assets: 14002 (100.0%)
- Remaining pending assets: 0 (0.0%)

## Verdict Counts

- PASS: 11250 (80.3%)
- REVIEW: 623 (4.4%)
- REDO: 2129 (15.2%)
- pending_visual: 0
- flagged_mechanical: 0

## Source-Art Adjusted Quality

- Live-bank visual quality rate: 85.2% (10508/12332 decided)
- Raw-harvest visual quality rate: 44.4% (742/1670 decided)
- Source-art-adjusted quality rate: 91.6% (11575/12641)
- ART_REDO: 465
- PIPELINE_REBUILD: 1686
- HUMAN_REVIEW: 601

## Failure Origin

- `pipeline`: 1686
- `source_art`: 465
- `uncertain`: 601

## Status By Family

- background: PASS 125, REVIEW 3, REDO 0, pending 0
- hero_king_interactive_target: PASS 1341, REVIEW 583, REDO 144, pending 0
- letters_literacy: PASS 233, REVIEW 0, REDO 12, pending 0
- open_closed_hide_reveal_pair: PASS 47, REVIEW 2, REDO 15, pending 0
- prea1_functional: PASS 223, REVIEW 0, REDO 86, pending 0
- prea1_functional_sheet: PASS 0, REVIEW 0, REDO 33, pending 0
- prop_cutout: PASS 2677, REVIEW 28, REDO 1153, pending 0
- role_plate: PASS 4, REVIEW 0, REDO 8, pending 0
- story_action_plate: PASS 150, REVIEW 1, REDO 85, pending 0
- story_cast: PASS 67, REVIEW 3, REDO 14, pending 0
- story_environment_edb_setting: PASS 80, REVIEW 0, REDO 21, pending 0
- vocab_icon: PASS 6303, REVIEW 3, REDO 558, pending 0

## Snapshot Backup

- Restored completed snapshot backup: `audit/visual-assets/snapshots/f02edc4f-restored-2026-08-18T141824-563170+0000`

## Durable Outputs

- `audit/visual-assets/index.jsonl`
- `audit/visual-assets/index.csv`
- `audit/visual-assets/summary.md`
- `audit/visual-assets/upstream-repair-counts.json`
- `audit/visual-assets/upstream-repair-report.md`
