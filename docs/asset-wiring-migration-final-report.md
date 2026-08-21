# Asset Wiring Migration — Final Report

Final validation after Phase A (`74ee675e`) and Phase B (`4b671e74`).
This report closes the asset-wiring pass without generating art, calling Manus,
or committing harvested PNGs.

## Executive decision

The safe migration is complete. The three escalations remain intentionally
closed rather than being forced through an importer:

- **`long-tail-props` → HOLD.** The source says `no_wiring: true` and carries an
  explicit STOCKPILE LOCK. It also mixes prop grids and landscape sheets, so
  treating the whole family as props would be wrong.
- **`art-replacements` → REVIEW_REQUIRED.** All 480 targets are raw replacements
  with no per-cell visual QA or overwrite decision. The live vocab bank is not
  changed.
- **`content-worlds` → SPECIALIZED + REFERENCE_ONLY.** The
  `companions/`, `worlds/`, and `sheets/` structure is a coordinated family.
  The loose background importer is now blocked until a relationship-aware
  inventory/importer exists.

These are safety decisions, not unexplained failures.

## Final accounting

Two views are necessary because `VERIFIED_UNWIRED_BASELINE` is, by definition,
the set that had no exact live address at the Phase A checkpoint, while
`ADDRESSABLE` and `GENERATOR_ELIGIBLE` also describe the wider live banks.

### Migration outcome

| Measure | Final number | Meaning |
|---|---:|---|
| `VERIFIED_UNWIRED_BASELINE` | **2,845** | Unique logical keys with surviving source evidence and no exact live address at Phase A |
| `SUCCESSFULLY_IMPORTED` | **1** | Phase B added `ki-magic-spotlight-magic`; the KI inventory shape did not enumerate that cell in the 2,845 baseline |
| `ADDRESSABLE` | **14,350** live rows | 7,219 props + 261 scenes + 128 flats + 6,742 vocab; **0 missing live files** |
| Addressable inventory overlaps | **82** | Exact inventory keys already live; all 82 files exist |
| `GENERATOR_ELIGIBLE` | **1,955** strict migration-prefix rows | 1,818 dock-safe/sharp `ki-*` props + 137 generic `ow-*` scenes after specialized scene gates |
| `SPECIALIZED` (live/addressable) | **1,151** | 750 hero targets + 318 story cast + 40 hide/reveal + 13 builder scenes + 18 board-enabling scenes + 12 recovered zoom scenes |
| `REFERENCE_ONLY` (live relationships) | **12** | K3 coordinated multi-view families, all addressable through their registered sheet scene |
| `JUNK` | **0** | No source was promoted to junk without a recorded QA decision |
| `FAILED` | **0 migration actions** | No importer failure was hidden or counted as success |

The 1,955 figure is deliberately stricter than “file exists”: 19 `ki-*` rows
remain addressable but fail the current dock-safe/native-size generator gate.
Likewise, builder, board-enabling, and recovered zoom scenes remain addressable
but are excluded from the generic scene ranker.

### Disjoint disposition of the 2,845 baseline

| Terminal disposition | Count | Explanation |
|---|---:|---|
| `HOLD` | **859** | 635 structural/discourse/visual-grammar/horizontal assets + 213 locked long-tail items + 11 registered K1 state families |
| `REVIEW_REQUIRED` | **1,862** | 1,307 aggressive-stockpile items + 480 art replacements + 75 remaining board-enabling items |
| `SPECIALIZED` | **124** | Builder-world sequence assets awaiting their named sequence mechanic, not generic background selection |
| `REFERENCE_ONLY` | **0 remaining** | The 12 K3 reference-only families are already addressable, so they are not in the unwired baseline |
| `JUNK` | **0** | No verified baseline item has a recorded junk verdict |
| `FAILED` | **0** | No unexplained importer failures |
| **Total explained** | **2,845** | Exact reconciliation to baseline |

`UNEXPLAINED_REMAINING_UNWIRED = 0`

The 309 inventory-only rows without surviving source evidence remain outside
`VERIFIED_UNWIRED_BASELINE`; they are not silently presented as recoverable
assets.

## 1. Current wiring architecture

“Wired” still means:

`FAMILY → RULE → IMPORTER → LIVE MANIFEST/INDEX → ELIGIBILITY OR EXCEPTION`

A PNG on disk is only RAW. IMPORTED requires a live row; ADDRESSABLE additionally
requires the referenced file; GENERATOR_ELIGIBLE additionally requires current
selector, identity, sharpness, family, and safety gates.

## 2. Baseline and estimate reconciliation

The planning estimate was approximately 5,100 warehouse PNGs. Repo truth is
5,228 harvested PNGs but only 3,236 unique inventoried logical keys. Contact
sheets contain many cells, duplicate recovery inventories repeat keys, 309 rows
have no surviving source evidence, and 82 inventory keys were already
addressable. This produces the verified baseline of 2,845.

## 3. Why anything remains unwired

Every remaining verified item has a declared reason:

- a required renderer/mechanic does not exist;
- a source-level no-wiring lock is active;
- identity, subtype, or visual QA is unresolved;
- a coordinated relationship would be flattened by the generic importer; or
- the item is an ordered builder sequence rather than a generic background.

Raising the imported count by bypassing those conditions would reduce product
correctness.

## 4. Variants were not collapsed

No variant rows or files were deleted or renamed. PropBank still preserves
explicit `variantOf` metadata and `-v2`/`-v3` identity bands. The audit
de-duplicates only repeated inventory claims for the same logical key; it does
not merge distinct poses, views, states, or files.

## 5. SPECIALIZED assets did not leak into generic pools

The final phase added enforcement, not just documentation:

- `hero-targets`, `story-cast`, and `hide-reveal` are excluded from generic
  `PropBank.resolve()` pools while exact/named mechanic lookups remain available.
- `builder-world`, `board-enabling`, and recovered `world-zoom` completion scenes
  are excluded from generic `SceneBackgrounds.rank()`.
- long-tail and content-world loose import routes are disabled by executable
  family rules.

The dedicated retrieval suite confirms generic DOG, INSTRUMENT, SURF, CREATOR,
and MUSIC picks do not return a specialized pack.

## 6. Family, state, and story relationships survived

Hero targets remain a 750-row named bank, story cast remains a 318-row named
bank, and hide/reveal remains a 40-row specialized/held bank. Registered K1
families are classified from the relationship registry as same-camera state
ladders, not viewpoints. The audit now gives relationship metadata authority
over weaker path-shape inference.

## 7. Multi-perspective relationships survived

All 12 K3 coordinated families remain REFERENCE_ONLY + SPECIALIZED and
addressable. `be-k3-classroom` still resolves to
`ow-be-multi-view-environments-k3-07-01` with REG_A registration. No K3 sheet was
flattened into four unrelated generic scenes.

## 8. World-zoom chains survived

`docs/world-zoom-relationships.json` still contains 10 zoom chains and preserves
the distinction between SAME_WORLD and COMPATIBLE. The canal builder plates
remain an ordered builder sequence, not camera variants. No N×N overview/interior
links were inferred.

## 9. The 12 recovered zoom scenes are correct

Verified:

- 9 recovered families;
- exactly 12 imported scenes;
- all 9 families graded REG_A;
- all 12 parent overviews exist;
- all 12 scene files are addressable;
- all 12 appear in the relationship registry; and
- all 12 are blocked from generic scene ranking while remaining available to a
  relationship-aware caller.

No scene was remanufactured or re-imported.

## 10. Generator-facing retrieval spot checks

`npm run test:asset-migration-retrieval` passes **22/22** checks:

| Requested check | Result |
|---|---|
| DOG | `animal-dog` through VocabArt |
| INSTRUMENT | `flute` through VocabArt |
| SURF | `beach-surfboard` through VocabArt |
| CREATOR | `ki-creator-ring-light` through VocabArt |
| MUSIC | `cello` through VocabArt |
| FARM | generic scene `farm` |
| TOWN OVERVIEW | `ow-wave11-town-s1-main-street-block` |
| CLASSROOM MULTI-VIEW | registered K3 family, REG_A, addressable |
| STORY | 318 story-cast rows and StoryScene loaded |
| REGISTERED SCENE | 11 K1 state families on `specialized_hold` |
| BUILDER | 4 canal-lock plates plus `canal-waterworks-zoom` |
| MYSTERY | three non-answer-revealing hints returned |

The first run exposed two real retrieval gaps: a low-resolution surfboard won
before a sharp peer, and a complete multi-word identity (`ring-light`) was not
treated as a tight match. VocabArt now retries bounded identity peers after a
sharpness rejection and accepts complete multi-word suffix identities. Both
checks now pass.

## 11. False semantic mappings

`verify-offtopic-props.mjs` and `test:topic-identity` pass. The final retrieval
suite also caught `dog house → city-house`; an explicit `dog-house`/`doghouse`
alias now resolves to `dh-doghouse`. No false semantic mapping remains in the
final spot-check set.

This is not a claim that every possible natural-language phrase has been
exhaustively tested. It is a claim that the requested representative paths and
the existing off-topic/topic-identity suites pass.

## 12. Performance

No material degradation was introduced:

- generic scene filtering is a constant-time metadata check per already-scanned
  scene;
- specialized prop filtering is a constant-time set membership check per
  already-filtered prop;
- VocabArt retry is capped at four attempts and only runs when the first
  identity hit fails the existing sharpness/safety gate; and
- live manifest counts and file checks remain unchanged.

No dedicated wall-clock benchmark existed in this migration brief, so this is a
bounded-complexity and regression-test conclusion, not a synthetic benchmark
claim.

## 13. Long-tail escalation resolution

Final state: **HOLD**.

The executable rule now matches the source contract: mixed stockpile, no
importers, `genericEligibility: false`. Unlocking it later requires two explicit
subtype rules—prop-grid and landscape-scene—and a recorded decision to remove
the source-level STOCKPILE LOCK. Existing live key collisions such as
`sticky-note` or `umbrella-stand` are pre-existing live assets, not evidence
that the locked sheets were safely imported.

## 14. Art-replacement escalation resolution

Final state: **REVIEW_REQUIRED**.

The 480 queued targets and 54 downloaded sheets remain raw. Zero targets have a
recorded per-cell visual QA/collision verdict. The replacement importer remains
the correct eventual path, but no `original_key` overwrite is allowed until a
review records PASS/HOLD for each cell. No live vocab file was overwritten.

## 15. Content-world escalation resolution

Final state: **SPECIALIZED + REFERENCE_ONLY**.

The flat generic background rule was unsafe because coordinated companions and
worlds cannot be represented as independent scenes. The rule now has no
importer and blocks loose harvest scanning. A future unlock needs a dedicated
inventory that records world family, world role, companion role, and explicit
relationships. The two previously reviewed `ow-cw-*` live scenes remain valid
existing exceptions.

## 16. Validation, exceptions, and sign-off

Passing final checks:

- `npm run test:asset-wiring`
- `npm run test:asset-wiring-proof` — 11/11 family proofs
- `npm run test:asset-migration-retrieval` — 22/22 checks
- `npm run test:manifest-lock`
- `npm run test:bg-picks`
- `npm run test:topic-identity`
- `npm run test:hero-theme`
- `node scripts/verify-offtopic-props.mjs`

Known non-migration baseline failures, reproduced in a clean detached
`4b671e74` worktree:

- `test:vocab-art`: existing `ball → soccer-ball` expectation;
- `test:mystery-hints`: 7 stale recipe-precedence assertions; and
- `test:story-integrity`: existing `grounded choir Q kept` assertion
  (`actual 2`, `expected 1`).

Because the same failures occur on clean Phase B before the final changes, they
are not counted as migration failures. They should be repaired in a separate
test/recipe pass rather than hidden inside asset accounting.

Final sign-off:

- no unsafe overwrite;
- no generic activation of locked/relationship-dependent families;
- no harvested PNG commit;
- no Manus call;
- no new art;
- no unexplained verified-unwired item; and
- no further writing or board-review phase started.

## MODEL USAGE SUMMARY

- **GPT-5.6 Sol — Phase A:** architecture audit, baseline reconciliation,
  taxonomy, executable family rules, representative proof, and migration
  procedure.
- **Claude Sonnet 5 — Phase B:** bounded family waves, safe live verification,
  one staged KI prop completion, and escalation handoff.
- **GPT-5.6 Sol — Final phase:** escalation decisions, selector isolation,
  retrieval repairs, relationship-aware audit correction, final accounting,
  validation, and this report.
- **Manus:** not used in the final phase. No art was requested, generated,
  downloaded, or reviewed here.
