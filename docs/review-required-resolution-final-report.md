# REVIEW_REQUIRED Resolution — Final Phase C Report

## Outcome

The Phase A baseline was 1,862 verified, unwired `REVIEW_REQUIRED` assets.
Phase B activated 2. Phase C resolved another 1,380 baseline rows: 12 became
real, receipt-backed `GENERATOR_ELIGIBLE` assets and 1,368 moved to explicit
fail-closed `HOLD` states with durable semantic intent. The only rows still in
`REVIEW_REQUIRED` are the 480 art-replacement candidates that genuinely require
literal candidate-versus-original visual decisions.

This is not a claim that all held pixels are activated. It is a claim that
their semantics are no longer parked in REVIEW. Bulk PropBank activation still
requires the exact source cell to pass the field-aware keyer and visual QA.

## Baseline: 1,862

Baseline reason counts:

- F role-detail props: 276 — standalone eligibility was clear, but each source
  cell still needed keying and dock QA.
- E accessibility/manipulatives: 329 — mixed standalone aids, reusable
  manipulatives, and exact-mechanic shells needed a semantic split plus cell QA.
- D story dressing: 180 — mixed standalone dressing and composition fragments
  needed a semantic split plus cell QA.
- H child micro-actions: 108 — action poses needed a named non-generic route and
  cell QA.
- K prop cutaways/views/states: 108 — parent/view/state relationships were
  missing and cells needed QA.
- P Mia/Leo story poses: 306 — character-specific poses needed the existing
  `story-cast` route and cell QA.
- K2 epistemic poses: 75 — 30 Mia singles, 30 Leo singles, and 15 atomic
  two-shots needed named packs and relationship-preserving retrieval.
- Art replacements: 480 — every candidate needed literal comparison with its
  `original_key`; the old-art reason code was not evidence that the candidate
  was better.

Top-level grouping: 1,307 aggressive-stockpile rows, 75 K2 rows, and 480 art
replacement rows. Total: 1,862.

The 480 art rows carry overlapping old-art trigger counts, so these counts do
not sum to 480: text artifact 206, bad alpha 90, generation artifact 77, bad
crop 61, white plate 61, weak contrast 60, wrong concept 58, poor cavity 31,
ambiguous concept 22, edge cutoff 19, corrupt 17, identity drift 10, blank 9,
background contamination 6, bad anatomy 2, pair mismatch 2, excess dead space
2, and too small 1.

## Resolution accounting

- `MOVED_TO_GENERATOR_ELIGIBLE`: 14 baseline rows.
  - Phase B: 2 (`silicone-mat`, `hold-shelf-bin`).
  - Phase C: 12 baseline rows from the two proof sheets.
- `MOVED_TO_HOLD`: 1,368 baseline rows.
  - D: 180
  - E: 322
  - F: 269
  - H: 108
  - K: 108
  - P: 306
  - K2: 75
- Intended lanes inside those 1,368 technical holds:
  - 820 `GENERATOR_ELIGIBLE` after future pixel QA.
  - 548 `SPECIALIZED` after future pixel QA and named/exact retrieval checks.
- `STILL_REVIEW_REQUIRED`: 480 art replacements.
- `FAILED`: 0.
- `UNEXPLAINED`: 0.

The activation-receipt ledger has 17 generator-eligible assets: the 2 Phase B
imports plus all 15 Phase C imports. Only 12 of the 15 Phase C imports count as
baseline queue movement; `oven-mitt`, `piping-bag`, and `cutting-board` already
had an exact addressable identity elsewhere and were excluded from the 1,862
verified-unwired baseline.

## Major wins

### 1. The keying producer was fixed

The selected architecture is hybrid:

- Clean black and clean white fields are supported.
- `--field=auto` detects each inset panel's border as black or white.
- `--panel-inset` removes baked divider/card frames before keying.
- Unsupported, gradient, illustrated, or ambiguous borders fail closed at C0.
- Border-connected flood fill preserves interior white and black details rather
  than deleting every field-colored pixel.
- C1/C6/C7 and conditional C9/C10 gates still block unsafe output.
- `--force` and `--stage-all` are not treated as approval.

Real proof:

- White-divider F sheet: all 9 cells were processed; 8 new cutouts were merged,
  while `mixing-bowl` was a dedup skip.
- Black E sheet: 7 cutouts were merged; `white-cane` and
  `communication-board-shell` remained blocked rather than shipping damaged
  silhouettes/plates.
- A dark-gradient sheet failed C0 as unsupported instead of producing corrupted
  cutouts.
- Visual QA composites for both successful sheets were inspected before merge.

The 15 Phase C cutouts are live in `public/assets/09_props/img/` and recorded in
`public/assets/09_props/manifest.json`.

### 2. Clear semantics left REVIEW without unsafe activation

`docs/review-required-resolutions.json` records every non-art decision. The
1,368 unactivated rows are terminal `HOLD`, not `REVIEW_REQUIRED`, and each has
an intended lane plus a concrete blocker. This separates semantic resolution
from pixel approval.

Blank/empty suffixes were not blanket-classified as specialized. That rule
would have over-held ordinary reusable objects such as empty bowls and blank
tools. Only reliably exact-mechanic shells and composition fragments remain
specialized without a family-wide pack. Those 28 rows explicitly require an
exact mechanic route as well as source QA.

### 3. H, P, K, and K2 now have named schemas

The durable specialized pack names are:

- H: `action-poses`
- P: `story-cast`
- K relationship members: `prop-view-state`
- K2 Mia: `epistemic-mia`
- K2 Leo: `epistemic-leo`
- K2 atomic two-shots: `epistemic-two-shot`

`PropBank.isSpecializedPack()` blocks these packs from generic resolution.
`PropBank.namedPack()` is the explicit retrieval surface.

### 4. K relationships are preserved

`docs/prop-view-state-relationships.json` contains all 108 K relationships:

- 77 cutaways
- 20 views
- 9 states
- 2 combined view/state rows

Every row retains `parent_key`, `relation_type`, and `relation_value`.
`variant_of` remains null because camera views, cutaways, and states are not
interchangeable v2 depictions. Merge tooling now preserves relationship fields.

### 5. Art replacement review is now executable and durable

`scripts/build-art-replacement-review.mjs` builds a local side-by-side viewer
for all 480 ordered candidate cells versus their current originals. A completed
verdict requires quality evidence for identity, alpha/background, crop,
sharpness, and text/logo safety, plus a concrete reviewer note.

Verdicts produce durable states through
`docs/art-replacement-resolutions.json`:

- `PASS_REPLACE` → fail-closed `HOLD` until that exact approved lineage is
  safely keyed/imported over `original_key`.
- `HOLD_AMBIGUOUS` → `HOLD` with the concrete unresolved note.
- `JUNK_CANDIDATE` → `JUNK` for the candidate only; the live original stays.
- `SUPERSEDED_BY_APPROVED_LINEAGE` → `REFERENCE_ONLY`; source evidence stays.

No source is deleted. A passing candidate never becomes a `redo-*` teach-word.

## Remaining genuine review

Exactly 480 art-replacement candidates remain. All are currently `PENDING`.
Their unresolved question is concrete and identical in shape: is this ordered
candidate cell a verified improvement over its exact live `original_key`, and
what should happen to the candidate source afterward?

Handback for the visual-review wave:

```text
node scripts/build-art-replacement-review.mjs
open tmp/art-replacement-review/index.html locally
review every candidate, then replace docs/art-replacement-review-decisions.json with the downloaded file
node scripts/build-art-replacement-review.mjs
node scripts/build-art-replacement-review.mjs --require-complete
node scripts/audit-asset-wiring.mjs
node scripts/audit-review-required-resolution.mjs
node scripts/audit-review-required-resolution.mjs --check
```

The review audit derives its expected queue from the decision file's `PENDING`
count, so completed verdicts leave REVIEW without another baseline-constant
architecture change. Approved replacement pixels remain held until safe import;
comparison approval alone does not overwrite live art.

## Generic safety, variant preservation, and retrieval

- Specialized packs fail closed in generic prop resolution, role picks,
  decorative sweeps, and kit assessment.
- Named retrieval is required for H/K/K2/P mechanic assets.
- No specialized sample carried `GENERATOR_ELIGIBLE`.
- All 17 activated assets have live files and activation receipts.
- All 1,368 new holds have concrete blockers and no `REVIEW_REQUIRED` state.
- All 108 K decisions have matching relationship IDs; no parent points to
  itself and no relationship was flattened into `variantOf`.
- Retrieval suite: 23/23 passed, including specialized-pack leakage checks.
- Off-topic prop verification passed.
- Background picker and topic-identity suites passed.
- Manifest lock/concurrent merge suite passed.
- Wiring audit is current and proof-clean.

## Random sample and quality audit

The resolution builder stores a deterministic pseudo-random sample using seed
`phase-c-2026-08-20`: 3 keys from each of 9 semantic families, 27 rows total.
The sample was checked for:

- intended generic versus specialized lane;
- named pack presence where a family-wide pack exists;
- false generic exposure;
- blanket suffix over-hold;
- activation without a live file/receipt;
- missing K relationship;
- relationship flattening.

Result: no failed invariant. The over-hold check caused one correction before
sign-off: blank/empty D/E objects are now generic candidates unless they are
actual exact-mechanic shells or composition fragments.

Random pixel quality checks used the white F and black E QA composites. Eight
white-sheet and seven black-sheet outputs were accepted visually. Two unsafe
black-sheet cells stayed blocked. No harvested PNG and no temporary QA composite
was committed.

## HOLD summary

The pre-existing HOLD backlog was not reopened. Phase B measured 863 rows:
visual-grammar 233, long-tail-props 217, a2-structural 157, a1-structural 104,
b2-discourse 55, b1-discourse 53, horizontal-harvest 33, and
board-enabling-registered-states 11.

The procedure's older 859 figure differs by 4. That historical discrepancy was
summarized only; it was not used as a recovery pass.

The 1,368 Phase C semantic activation holds are a separate set created from the
1,862 REVIEW baseline. They preserve clear intent while refusing unsafe pixels.

## Model usage

- Phase B: Sonnet 5, commit `bed76d0a`.
- Phase C: GPT-5.6 Sol.
- No Manus calls, no new art generation, no lesson redesign, no board-type
  audit, and no reopening of the historical HOLD backlog.

## Durable outputs

- `scripts/import-prop.mjs`
- `scripts/import-sheet.mjs`
- `scripts/merge-staged-props.mjs`
- `scripts/build-review-required-resolutions.mjs`
- `scripts/build-art-replacement-review.mjs`
- `scripts/audit-asset-wiring.mjs`
- `scripts/audit-review-required-resolution.mjs`
- `scripts/test-asset-migration-retrieval.mjs`
- `public/lib/propPolicy.json`
- `public/lib/propBank.js`
- `docs/review-required-activation-receipts.json`
- `docs/review-required-resolutions.json`
- `docs/prop-view-state-relationships.json`
- `docs/art-replacement-review-decisions.json`
- `docs/art-replacement-resolutions.json`
- `docs/asset-wiring-migration-inventory.json`
- `docs/review-required-resolution-inventory.json`
- `tmp/art-replacement-review/index.html` (generated local review surface; not
  committed)

## Validation

- Resolution and relationship ledgers: current.
- Art replacement decision structure: 480 valid, 480 pending.
- Art replacement durable overlays: current, 0 completed so far.
- Review queue proof: 480 verified-unwired rows, all art replacements.
- Asset wiring proof: passed across 11 proof families.
- Asset migration retrieval: 23/23 passed.
- Manifest locking: passed.
- Background picks: passed.
- Topic identity: passed.
- Off-topic props: passed.
- Changed script syntax checks: passed.

## Commits

- `be31daac` — reproducible REVIEW_REQUIRED resolution handoff.
- `bed76d0a` — Phase B real merges and keying blocker escalation.
- `947c151d` — Phase C keyer, schemas, relationships, replacement tooling,
  receipt-backed imports, and durable resolution ledgers.
- Phase C final sign-off report and dynamic pending-count audit — this report's
  commit.

REVIEW_REQUIRED_BASELINE: 1862
RESOLVED_THIS_PASS: 1382
STILL_GENUINELY_REVIEW_REQUIRED: 480
UNEXPLAINED: 0
