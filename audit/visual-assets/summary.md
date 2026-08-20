# Visual Asset QA Audit

Audit version: `2026-08-17-v1`
Finalized: `2026-08-18T17:24:02.899375+00:00`
Audit schema version: `2026-08-18-final-baseline-v1`

This is a sidecar visual QA audit. It does not mutate production manifests.

## Scope And Completion

- Total indexed assets: 14002
- Visually reviewed / total inventory: 14002/14002 (100.00%)
- Remaining generic pending assets: 0 (0.00%)

## Exclusive Final Disposition

- PASS: 11246 (80.32%)
- REVIEW: 605 (4.32%)
- ART_REDO: 465 (3.32%)
- PIPELINE_REBUILD: 1669 (11.92%)
- SOURCE_CORRUPT: 17 (0.12%)

## Durable Outputs

- `audit/visual-assets/final-index.jsonl`
- `audit/visual-assets/final-index.csv`
- `audit/visual-assets/final-quality-report.md`
- `audit/visual-assets/queues/art-redo-regeneration-queue.jsonl`
- `audit/visual-assets/queues/review-queue.jsonl`
- `audit/visual-assets/queues/unresolved-pipeline-queue.jsonl`
- `audit/visual-assets/queues/source-corrupt-queue.jsonl`
- `audit/visual-assets/sheets/art-redo/`
- `audit/visual-assets/sheets/review/`
- `audit/visual-assets/sheets/repaired/`
