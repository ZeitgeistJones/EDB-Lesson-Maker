# Asset Wiring Migration — Phase B Status (Claude Sonnet 5)

Handoff back to GPT-5.6 Sol. Bulk wave execution per
`docs/asset-wiring-migration-procedure.md`. This is **not** a sign-off —
final validation is Sol's call.

## Baseline confirmed (Wave 0)

Matches the Phase A commit `74ee675e` baseline exactly:

- `inventoried: 3236`, `estimated_unwired: 3154`, `verified_unwired: 2845`,
  `already_addressable: 82`, `harvested_pngs: 5228`
- `npm run test:asset-wiring-proof` → **11/11 pass**
- `test:manifest-lock`, `test:bg-picks`, `verify-offtopic-props.mjs` → pass
- `test:vocab-art` → known baseline failure only: `ball → soccer-ball`
  (per handoff, not touched, not "fixed" by redesign)

## Wave-by-wave result

### Wave 1 — safe generic prop sheets

- Ran `node scripts/import-harvest-stockpile.mjs --dry-run --only=ki`.
  Kid-interest queue was already fully drained by Phase A pre-handoff:
  202/206 sheets `already-imported`. The remaining 4
  (`ki-tabletop-party/S2`, `ki-magic-show-deep/S3`, `ki-baking-cafe/S3`,
  `ki-fencing-club/S1`) turned out to be **already live in HEAD** —
  running the real importer was a confirmed no-op (`merge-staged-props`
  skip-existing held). No new prop rows were produced by this action.
- Picked up **one pre-existing uncommitted row** left by Phase A:
  `ki-magic-spotlight-magic` (already staged, already gated
  `alpha:true`, `srcW/srcH` ≥120, `dockSafe` unset) plus its image file.
  Committed as part of this wave since it's the same
  kid-interest-prop-wiring unit of work, not unrelated WIP.
- **`long-tail-props` (217 logical, 138 harvested PNGs across lt1–lt10)
  is NOT actionable.** `docs/long-tail-stockpile-inventory.json` sets
  `"no_wiring": true`, and `scripts/manus/long-tail-keys.mjs` bakes in
  `STOCKPILE LOCK: raw Manus sheets only. Do not wire, import to
  PropBank, modify renderer, or broaden this list.` These sheets also mix
  prop grids (`black-contact-3x3/2x3/2x2/2x5`) with landscape stage
  backgrounds (`landscape-contact-1x2`, e.g. laundromat/hardware-store/
  marketplace/ferry-deck/florist/recycling-center) — the family rule only
  declares a prop-sheet importer, so a background sub-type would need a
  new rule/importer path. **ESCALATE — do not import.**

### Wave 2 — vocab replacements

- **`art-replacements` (480 raw items, 54 downloaded sheets, all "large")
  is NOT actionable in bulk.** `scripts/manus/request-art-redo-harvest.mjs`
  states "Stockpile only — no import / keying / wiring and no live asset
  overwrite." None of the 480 items carry a `qa_status` or per-cell
  identity/collision decision yet. The procedure requires "visual review
  and an explicit collision decision" before any `original_key` overwrite
  — that review has not happened. **ESCALATE — requires human/Sol visual
  QA pass before any `import-vocab-sheet.mjs` run.**

### Wave 3 — single-scene backgrounds

- `overview-worlds`: dry-run (`--only=ow`) shows **0 pending** — all 135
  discovered sheet PNGs already addressable as `ow-*` scenes.
- `builder-worlds` / `board-enabling` loose sweep (`--also=builder,be`):
  **0 pending** — remaining candidates are `loose-already` (addressable)
  or blocked by the specialized-family gate (`shouldSkipLooseHarvestPath`).
- **`content-worlds` (`--also=cw`) is NOT safe to bulk-import.** The
  heuristic landscape-aspect-ratio importer flags **380** candidate
  images — a large, unexpected jump versus the proof's expectation of
  ≥1. Inspection of `harvested/content-worlds/**` shows many families
  (e.g. `cw-k1-dig-marine`, `cw-d1-ocean-volcano`) have sibling
  `companions/` and `worlds/` subfolders alongside `sheets/`, indicating
  coordinated multi-part relationships the flat `content-worlds` rule
  (single full-page landscape only) does not model. Blind import would
  flatten a specialized relationship into generic `GENERATOR_ELIGIBLE`
  backgrounds, violating "preserve world-zoom/multiview" and "no N×N
  inference." **ESCALATE — do not run `--also=cw` for real.**

### Wave 4 — already-imported specialized banks (verification only)

Confirmed addressable/counts directly against live manifests, no
generic-activation changes made:

| Bank | Count | State |
|---|---:|---|
| `hero-targets` | 750 | SPECIALIZED, addressable |
| `story-cast` | 318 | SPECIALIZED, addressable |
| `hide-reveal` | 40 | SPECIALIZED + HOLD, addressable |
| `ow-bw-*` builder-world scenes | 13 | SPECIALIZED (sequence), addressable |
| `ow-be-*` board-enabling scenes | 18 | SPECIALIZED/REFERENCE_ONLY, addressable |
| `ow-cw-*` content-world scenes | 2 | GENERIC (pre-existing, reviewed) |
| `ow-*` overview scenes (total) | 180 | GENERATOR_ELIGIBLE |
| `ki-*` kid-interest props (total) | 1837 | GENERATOR_ELIGIBLE (gated) |

`test:asset-wiring-proof` 11/11 still passes after Wave 1–4 actions.

### Wave 5 — holds/exceptions inventory (no action taken)

Confirmed still correctly held by `scripts/lib/asset-wiring-rules.mjs`
(`genericEligibility: false`, `importers: []`) and, where present, an
explicit `no_wiring: true` flag in the source inventory:

| Family | Logical | `no_wiring` flag | Notes |
|---|---:|---|---|
| `a1-structural` | 104 | — (rule-blocked) | needs named renderer/mechanic |
| `a2-structural` | 157 | — (rule-blocked) | needs named renderer/mechanic |
| `b1-discourse` | 53 | true | discourse/argument visuals |
| `b2-discourse` | 55 | true | discourse/argument visuals |
| `prea1-structural` | — | — (rule-blocked) | instruction/TPR/phonology |
| `board-enabling-registered-states` (K1) | — | — (rule-blocked) | same-camera state ladders, not viewpoints |
| `board-enabling-multi-view` (K3) | 12 | — (reference-only, verified addressable) | already addressable, verify-only |
| `board-enabling` fallback | 86 | — (rule-blocked) | fails closed, unclassified sub-families |
| `horizontal-harvest` | 33 | true | closed stockpile |
| `visual-grammar` | 233 | true | needs named slots |
| `aggressive-stockpile` (streams D/H/K/P untouched; E/F partially wired by Phase A) | 1361 total, 54 imported | s4/s4-mia-leo sub-batches: true | mixed props/scenes/overlays; remaining slices need per-family split + review before any importer touches them |
| `unclassified-harvest` | 309 | n/a | no family rule yet; fails closed by design |
| `world-zoom-completions` | 12 | n/a | already REG_A, addressable, verified only |

No holds were converted to generic eligibility. Nothing here was
imported, remanufactured, or requested from Manus.

## What changed in this session

- Regenerated `docs/asset-wiring-migration-inventory.json` (repo-truth
  audit; counts unchanged from Phase A baseline).
- Committed one already-staged kid-interest prop row
  (`ki-magic-spotlight-magic`) plus its image, left uncommitted by Phase A.
- Added this status doc.
- **Did not** touch, stage, or commit `docs/kid-interest-shift60-*`,
  `docs/overview-worlds-*` (they contain in-flight Manus
  generation/harvest bookkeeping from a separate, still-running process —
  out of scope per "no Manus, no new art" and "never commit unrelated
  pre-existing working-tree changes").
- **Did not** run any `scripts/manus/request-*` / `fire-*` / `poll-*`
  script. No new art was generated or requested.

## Escalations for Sol (stop-family criteria met)

1. **`long-tail-props`** — explicit `no_wiring: true` + in-source
   "STOCKPILE LOCK: do not wire" comment; also mixes prop and background
   sub-types under one family rule. Needs either an explicit unlock
   decision + a background sub-rule, or stays held.
2. **`art-replacements`** — 480 raw, zero visually reviewed / zero
   collision decisions recorded. Needs Sol (or a human) to actually look
   at the 54 sheets and mark PASS/HOLD per cell against `original_key`
   before any `import-vocab-sheet.mjs` run. This is a live-manifest
   overwrite path — highest blast radius in the whole backlog.
3. **`content-worlds`** — loose heuristic importer returns 380 candidates
   (proof only expects ≥1); family has `companions/`/`worlds/`
   subfolders implying relationships the current flat rule can't
   express. Needs a dedicated inventory + relationship rule before any
   import, generic or otherwise.
4. **`aggressive-stockpile`** — 1361 logical, only 54 imported (all in
   streams E/F). Streams D/H/K/P (108–331 each) are untouched; the S4/
   S4-mia-leo sub-batches are explicitly `no_wiring: true`. Same
   review-before-wire gate as long-tail-props applies.

## Remaining unexplained / for Sol to validate

- `verified_unwired` stayed at **2845** — expected, since every family
  with real pending PNGs is currently gated behind visual review that
  Phase B correctly declined to bypass. The count will only move once
  Sol (or a human) clears one of the four escalations above.
- The generic per-record inventory walker in
  `scripts/audit-asset-wiring.mjs` under-reports `kid-interest`,
  `overview-worlds`, and (partially) `builder-worlds` in the family
  summary table (their `waves`/`families`-keyed JSON shape doesn't match
  the walker's `items|cells|assets` collection heuristic), even though
  the dedicated `--proof` checks correctly confirm them addressable.
  Not fixed here (would be an audit-script architecture change, out of
  bounds for "follow established pattern only") — flagging for Sol in
  case a future accounting pass wants it tightened.

## Validation commands run (all pass except the known baseline failure)

```
npm run assets:wiring-audit
npm run test:asset-wiring
npm run test:asset-wiring-proof   # 11/11
npm run test:manifest-lock
npm run test:bg-picks
npm run test:vocab-art            # known baseline FAIL: ball → soccer-ball
node scripts/verify-offtopic-props.mjs
```
