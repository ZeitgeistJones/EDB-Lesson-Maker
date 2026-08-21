# REVIEW_REQUIRED Resolution — Phase B (Sonnet 5) Status

Phase A (GPT-5.6 Sol) baseline commit: `be31daac`. This document is the Phase B
execution record and hands back to Sol for final review/routing.

## 0. Headline finding (read this first)

Phase A's family policy (docs/review-required-resolution-procedure.md) is
correct about **semantic identity** for F/E/D — the objects on these sheets
are genuinely standalone, ordinary, and safe. It is **not** correct that this
makes them a "clean" wave to bulk-merge. Actually running the approved
pipeline (`scripts/import-sheet.mjs` → `scripts/merge-staged-props.mjs`) on
real sheets from `harvested/manus-aggressive-stockpile/s4-roles-a11y/`
surfaces a **systemic keying-QA problem**, not a classification problem:

- 6 independent sheets tested across two families (F: `s4f-role-detail-props`
  sheets 01+02, `s4f5-role-detail-continue` sheet 01, `s4f10-role-detail-continue`
  sheet 01; E: `s4e-a11y-manipulatives` sheet 01), 54 cells total.
- **50/54 cells (93%) hard-blocked** on the keyer's own gates (C1 clean
  background, C6 no near-black erosion, C9 no leftover white plate) —
  this is far past the procedure's 5% "stop and escalate" threshold
  (§5 Exception policy).
- Root causes, confirmed by direct visual inspection of the source PNGs, not
  guessing:
  1. **Inconsistent sheet backgrounds across sub-batches**, despite one
     "BLACK FIELD LOCK" brief: some sheets are genuinely pure black
     (`s4f5`/`s4f10`/`s4e`), some are a **plain white field with thin black
     divider lines** (`s4f-role-detail-props/sheets/01.png` — chef tools),
     and at least one is a **dark radial-gradient field with white dividers**
     (`s4f2-role-detail-more/sheets/01.png`). `import-sheet.mjs` has no flag
     for the gradient case, and its `--white` path still fails on the
     divider-line sheet (see below).
  2. **Thin grid divider lines baked into the artwork itself.** Even on
     properly black sheets, the auto-bounds cell-rect inference in
     `scripts/import-prop.mjs` snaps crop edges directly against these
     divider lines (visible as irregular panel sizes, e.g.
     `661×661`/`680×661`/`661×680` instead of a uniform `683×683` — the
     algorithm is treating the divider as "active" content). The crop border
     ring then samples a mix of true background and divider-line pixels,
     which correctly fails C1.
  3. **Thin outline/wireframe objects on black fields lose their own
     silhouette to the keyer** (C6: cooling rack wire grid, star cookie
     cutter outline, whisk wires, cake-turntable rings, piping tips) — the
     object's own black linework is indistinguishable from the
     black background, so keying erases large chunks of the object.
  4. The existing `--no-edge-clean` / `--clean-internal-gutters` / `--white`
     flags do not fix any of the above; I confirmed this by trying all
     combinations on the `chef tools` sheet (see log below). `--stage-all`
     (force-keep) produces cutouts with a visible residual white card/plate
     behind the object on 9/9 cells of that sheet — genuinely unsafe to
     merge, not a false-positive gate.

**This is the primary thing to route to Sol.** It affects the entire
`aggressive-stockpile` S4 harvest stream (F 274, E 329, D 180, H 108, K 108 —
potentially most of 999 remaining aggressive-stockpile keys), not just F.
Fixing it requires either (a) a keyer/pipeline change (out of my scope — it
touches the shared importer used by every future sheet, which is exactly the
"would alter producer semantics" escalation trigger in §5), or (b) much
slower per-cell manual correction/override than the wave plan assumed, or (c)
Manus regeneration of the offending sheets (explicitly prohibited this pass).
None of this is a reason to hold the *family policy* — F/E/D's generic-vs-
specialized split is still correct — it is a reason to hold the *bulk merge
rate* until the keying question is answered.

## 1. What was actually executed this pass

### R1 — F role-detail props: started, evidence-gathering + 2 real merges

- Read every F sub-batch's `keys.json`/`run.json` (real per-cell ordered
  identity — 12 sub-batches, 333 total keys, 274 currently in the Phase B
  queue after Phase A's already-addressable exclusions).
- Ran the real pipeline (not a simulation) on 4 sheets / 36 cells with
  correct per-cell names resolved from `run.json.saved[].name` matched to
  `keys.json.sheets[].title` (the sheet's on-disk `NN.png` order does **not**
  match `keys.json`'s internal `S1..Sn` order — this is an important gotcha
  for whoever runs the rest of this: always resolve by title, not index).
- 2 cells passed every gate cleanly and were merged for real:
  - `silicone-mat` (from `s4f5-role-detail-continue`, baker extras sheet)
  - `hold-shelf-bin` (from `s4f10-role-detail-continue`, librarian/coach sheet)
  - Both are in `public/assets/09_props/manifest.json` with `pack: role-tools`,
    `decorative` unset (generic, per the F family route), heuristic
    `relativeScale: 0.22`.
- 34/36 remaining cells in the sampled sheets are HARD-BLOCKED for the
  reasons above — not merged, not silently dropped. They stay
  `REVIEW_REQUIRED` in the resolution inventory (still counted in the 1860
  remaining queue) with the concrete blocker now documented here instead of
  a vague "needs review."

### R2–R6 — not executed (see escalations below); real, useful diagnostic done

I did not bulk-execute R2–R6. Given R1's result (93% real hard-block rate on
a family Phase A's representative sample called "clean"), continuing to
apply the same importer to E/D/H/P/K without first resolving the keying
question would either (a) produce the same near-total block rate for real
effort with near-zero real merges, or (b) tempt a force-through that ships
genuinely defective cutouts (white plate behind object, eroded silhouettes)
into the live PropBank — which the procedure explicitly forbids ("Do not use
HOLD to hide a known bad cell; use JUNK" cuts the other way too: don't force
a cell that visibly fails QA just to post a bigger number).

What I did instead, which is real and useful:

- Spot-checked D-family source naming (`s4ml1-mia-leo-story-poses-dressing`
  sheet 3, "story dressing"): confirms the key-naming convention itself is a
  reliable, already-present machine signal for the split-by-role rule —
  `-blank`/`-empty` suffixed keys (`story-noticeboard-blank`,
  `story-letter-folded-blank`, `story-postcard-blank`,
  `story-picture-frame-blank`, `story-cubby-empty`) are exactly the
  composition-only shells the procedure says must stay SPECIALIZED; the
  unsuffixed keys (`story-classroom-rug`, `story-potted-plant-corner`,
  `story-floor-cushion`, `story-doormat`) are the standalone
  GENERATOR_ELIGIBLE candidates. Same pattern confirmed in E
  (`communication-board-shell` vs. `white-cane`, `hearing-aid`, etc.). This
  is safe to use as an automatic pre-split for E/D once keying is unblocked —
  it does not require inventing new schema, and it matches Phase A's own
  family rule text.
- Confirmed the P-family naming (`cast-mia-*-happy`, `cast-leo-*-happy`)
  already matches the **existing, live** `pack: 'story-cast'` +
  `decorative: true` mechanism (`public/lib/propBank.js`,
  `scripts/test-asset-migration-retrieval.mjs`'s `isSpecializedPack`) used by
  prior, already-merged Mia/Leo poses. Routing new P cells through
  `merge-staged-props.mjs --scales=...` with `pack=story-cast` +
  `decorative:true` on the staged rows reuses a precedented, already-tested
  SPECIALIZED mechanism — no new importer/schema needed for P. (H and K2
  need a judgment call from Sol; see escalations.)
- Confirmed the HOLD backlog is **863** records by direct count of
  `terminal_state === 'HOLD'` in `docs/asset-wiring-migration-inventory.json`
  (procedure text says 859; I did not chase the 4-record discrepancy — it is
  small, doesn't change any wave, and re-litigating the HOLD backlog is out
  of scope per instructions). Breakdown below (§4). Not reopened, not touched.

## 2. Accounting

```
Baseline (Phase A, commit be31daac): REVIEW_REQUIRED verified-unwired queue = 1862
MOVED_TO_GENERATOR_ELIGIBLE (real merge, real validation)  = 2   (F: silicone-mat, hold-shelf-bin)
STILL_REVIEW_REQUIRED (this pass)                          = 1860
UNEXPLAINED                                                = 0
```

Family-level queue after this pass (`docs/review-required-resolution-inventory.json`,
regenerated and `--check`-clean):

| Family | Baseline | Now | Moved | Reason still open |
|---|---:|---:|---:|---|
| F role-detail-props | 276 | 274 | 2 | Keying hard-block ~93% on real sample; needs pipeline fix or per-cell manual correction before further bulk merge |
| E accessibility/manipulatives | 329 | 329 | 0 | Same keying hard-block confirmed on 1 real sheet (9/9 blocked); role-split-by-suffix ready to apply once unblocked |
| D story dressing | 180 | 180 | 0 | Same S4 stream — not pipeline-tested this pass, but shares source/style with F/E; role-split-by-suffix ready |
| H generic-child micro-actions | 108 | 108 | 0 | Not started. Same S4 stream (keying risk likely applies); also needs Sol confirmation on SPECIALIZED pack name/schema |
| P Mia/Leo story poses | 306 | 306 | 0 | Not started. Naming confirms it reuses the existing `story-cast` pack — lower schema risk than H, but same keying risk |
| K cutaways/alt views/in-use states | 108 | 108 | 0 | Not started. Needs parent/view/state relationship metadata before any split — no relationship schema found in repo yet (see escalation) |
| K2 Mia/Leo epistemic (singles×60 + two-shots×15) | 75 | 75 | 0 | Not started. Same schema gap as K, plus two-shot atomicity constraint |
| Art replacements | 480 | 480 | 0 | Not started. Requires literal per-cell old-vs-new visual comparison against `original_key`; no automated diff tool exists in the repo — see escalation |
| **Total** | **1862** | **1860** | **2** | |

Validation run after the 2 merges (all green):

```
npm run assets:wiring-audit        -> inventoried 3236, verified_unwired 2843, already_addressable 84, proof_pass true
node scripts/audit-review-required-resolution.mjs --check   -> PASS (baseline updated 1862->1860, F 276->274, addressable 54->56)
node scripts/audit-review-required-resolution.mjs --proof   -> proof_pass true
npm run test:asset-wiring          -> PASS
npm run test:asset-wiring-proof    -> PASS
npm run test:asset-migration-retrieval -> 22/22 PASS (unchanged from Phase A)
npm run test:manifest-lock         -> PASS
npm run test:bg-picks              -> PASS
npm run test:topic-identity        -> PASS
node scripts/verify-offtopic-props.mjs -> ok:true
```

I updated the hardcoded baseline constants in
`scripts/audit-review-required-resolution.mjs` (`EXPECTED_QUEUE`,
`aggressive-stockpile::F` expected count, `excluded-already-addressable`)
from the Phase A snapshot to the new, explained totals — this is exactly
what §6 of the procedure calls for after a wave ("regenerate... no
unexplained disappearance is acceptable"); the two moved keys are fully
accounted for above and in the commit.

## 3. Escalations to Sol (do not resolve myself — architecture/risk calls)

1. **Keying pipeline vs. S4 harvest art quality (blocks bulk F/E/D/H/P/K).**
   Question: is the fix (a) tune/extend `scripts/import-prop.mjs` (new flag
   for divider-line sheets, a background-color sniff instead of requiring
   `--white` to be passed manually, and a policy for outline-heavy objects),
   (b) accept a much slower per-cell `--stage-all` + manual visual + `--force`
   workflow at real human-QA pace, or (c) something else? I did not touch
   the shared importer because it changes producer semantics for every
   future sheet import, which is an explicit escalation trigger.
2. **H, K2 SPECIALIZED storage.** P already reuses the live `story-cast`
   pack. H (named action poses) and K2 (epistemic singles + two-shots) have
   no existing pack/schema precedent I could find (`hero-targets` and
   `hide-reveal` are the only other precedented SPECIALIZED packs, and
   neither semantically fits). Is reusing the same `decorative:true` + new
   pack-name mechanism (e.g. `pack: 'action-pose'`, `pack: 'epistemic-mia'`,
   `pack: 'epistemic-leo'`, `pack: 'epistemic-2shot'`) with **no**
   `decorativeHints` entry (so it never surfaces through the generic
   topic-matched decorative sweep in `propBank.js`) an acceptable reuse of
   existing infra, or does Sol want a dedicated relationship-aware schema
   before any H/K2 cells are imported? This is exactly the ">2 change would
   alter... producer semantics" trigger, so I'm not deciding it myself.
3. **K relationship/lineage schema.** I could not find any existing
   parent/view/state relationship manifest analogous to
   `docs/world-zoom-relationships.json` for prop-level (non-background) view/
   state families. Per §5, "a family needs a new importer or
   manifest/relationship schema" is an explicit stop-and-escalate condition.
   K (108) needs this schema defined before any cell — even an obviously
   clean `apple-cutaway`-style one — can be safely split from its
   SPECIALIZED siblings.
4. **Art replacement (480) comparison tooling.** The procedure requires a
   recorded old-vs-new visual PASS/HOLD/JUNK per cell against `original_key`.
   There is no automated image-diff or side-by-side viewer in the repo
   (checked `scripts/import-vocab-sheet.mjs --help` per §7 — it imports, it
   does not compare). Doing this properly for 480 cells is a real, slow,
   per-cell human-visual-QA task, not something safe to batch-approximate
   from the `reason_codes` alone (the procedure explicitly says those codes
   describe the *old* art's defect, not the candidate's quality). I did not
   start this wave. Recommend Sol either confirm a lighter-weight comparison
   method or accept that R6 will be the single most labor-intensive
   remaining wave.

## 4. HOLD backlog (859/863 existing — not reopened, no recovery pass)

Counts by top-level lock, straight from `docs/asset-wiring-migration-inventory.json`
(`terminal_state === 'HOLD'`), for reference only:

| Lock | Count |
|---|---:|
| visual-grammar | 233 |
| long-tail-props | 217 |
| a2-structural | 157 |
| a1-structural | 104 |
| b2-discourse | 55 |
| b1-discourse | 53 |
| horizontal-harvest | 33 |
| board-enabling-registered-states | 11 |
| **Total** | **863** |

(Procedure text cites 859; I did not re-derive or reconcile the 4-record gap
— out of scope, does not affect any Phase B wave, no HOLD row was touched.)

## 5. Commit(s)

- `be31daac` — Phase A handoff (procedure + inventory), pre-existing.
- This pass: real F merges (`silicone-mat`, `hold-shelf-bin`) +
  regenerated `docs/asset-wiring-migration-inventory.json` +
  regenerated `docs/review-required-resolution-inventory.json` +
  updated baseline constants in
  `scripts/audit-review-required-resolution.mjs` + this status doc.
  Nothing under `harvested/` was staged. No `tmp/` QA composites were staged.
  Pre-existing unrelated working-tree changes (`docs/kid-interest-shift60-*`,
  `docs/overview-worlds-*`, various `scripts/manus/*`, root `tmp-*` files,
  `HARVESTED_GIT_PURGE_LOCK.txt`) were **not** touched or committed by this
  pass — they predate this session and are out of scope.

## HANDOFF TO GPT-5.6 SOL — FINAL REVIEW

- **Remaining REVIEW_REQUIRED families**: all 8 remaining families, 1860
  total (F 274, E 329, D 180, H 108, P 306, K 108, K2 75, replacements 480).
  See §2 table for concrete per-family blockers/questions.
- **Largest real move this pass**: 2 keys, F family, GENERATOR_ELIGIBLE
  (`silicone-mat`, `hold-shelf-bin`) — small in count, but each is a fully
  real, pipeline-verified, test-passing merge, not a metadata relabel.
- **Known escalations** (need your call, not mine): (1) keying pipeline vs.
  S4 art-quality mismatch blocking bulk F/E/D/H/P/K merge rate — the biggest
  one; (2) SPECIALIZED pack/schema for H and K2 (P is precedented, low risk);
  (3) missing prop-level view/state relationship schema for K; (4) missing
  comparison tooling for the 480 art replacements.
- **Validation status**: all commands in procedure §7 pass, including
  `test:asset-migration-retrieval` still 22/22 (no specialized-pool leakage
  introduced), `test:manifest-lock`, `verify-offtopic-props`.
- **Commit SHAs**: base `be31daac`; this pass's commit follows immediately
  after this file in the same commit (see repo log).
