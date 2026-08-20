# Upstream Asset Derivative Repair Pass

Updated: `2026-08-18T14:22:53.689627+00:00`

## Scope

This pass froze the completed `f02edc4f` visual audit and repaired derivative/audit machinery only. It did not request or generate new art and did not mutate production manifests.

Ignored raw source PNGs are present locally for representative Pre-A1, B2, and EDB harvests. This pass regenerates audit-side affected derivatives and sample sheets only; it does not mutate production manifests or begin broad import/wiring.

## Systemic Defects

- Grid slicing/crop offset: fixed importer support for inferred/manual grid bounds and fail-closed filled-cell validation.
- Raw grid extraction: source sheets are now represented separately from extracted derivatives in audit semantics; missing extraction is `PIPELINE_REBUILD`, not `ART_REDO`.
- EDB settings extraction: source-only diptychs/settings are treated as source role plus extraction state rather than failed production assets.
- White-object alpha destruction: white-mode keying now relaxes colour seeds for thin/light subjects while still flood-filling only border-connected background.
- Naming/positional drift: importer now fails when expected filled cells are absent, preventing silent cell/key shifts.
- Black blocks/post-processing: black-field regression verifies final derivatives have transparent background corners.

## Counts

- PASS/REVIEW/REDO: PASS 11250, REVIEW 623, REDO 2129
- Live rows: 12332; raw-harvest rows: 1670
- PIPELINE_REBUILD: 2205
- ART_REDO: 465
- HUMAN_REVIEW: 601
- Potentially recoverable without generation: 2205
- Confirmed recovered after rebuild in this checkout: 519
- Source-art-adjusted quality rate: 91.6%

## Repaired Sample Sheets

- `prea1-relations`: `audit/visual-assets/sheets/repaired/prea1-relations/prea1-relations-samples.jpg`
- `mnemonic-az`: `audit/visual-assets/sheets/repaired/mnemonic-az/mnemonic-az-samples.jpg`
- `edb-setting-variants`: `audit/visual-assets/sheets/repaired/edb-setting-variants/edb-setting-variants-samples.jpg`
- `white-light-keyed-objects`: `audit/visual-assets/sheets/repaired/white-light-keyed-objects/white-light-keyed-objects-samples.jpg`
- `farm-tree-identity`: `audit/visual-assets/sheets/repaired/farm-tree-identity/farm-tree-identity-samples.jpg`
- `black-block-postprocess`: `audit/visual-assets/sheets/repaired/black-block-postprocess/black-block-postprocess-samples.jpg`
- `b2-extracted-cells`: `audit/visual-assets/sheets/repaired/b2-extracted-cells/b2-extracted-cells-samples.jpg`

## Visual Review

- Focused multimodal review recorded in `audit/visual-assets/upstream-repair-visual-review.md`.
- Reviewer agreed the samples justify splitting pipeline defects from source-art redo; B2 remains limited to audit-side extraction validation, not production import.

## Blocked / Unsafe Items

- Raw source PNG counts available locally: Pre-A1 97, B2 122, EDB 21. Production-manifest rebuild/import is intentionally out of scope.
- B2 representative extraction sheet contains 27 audit-only sliced cells from 3 readable local raw 3x3 sheets.
- B2 skipped 1 unreadable local source PNG(s) before finding readable samples.
- No live goal-net asset exists in `public/assets`; the white/light goal-net case is covered by the focused synthetic regression fixture.
- Broad visual QA and A1 cultivation remain intentionally frozen/out of scope.
