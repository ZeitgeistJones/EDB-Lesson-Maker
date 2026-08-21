# REVIEW_REQUIRED Resolution Procedure

This is the Phase B runbook for resolving the **1,862 verified, unwired
REVIEW_REQUIRED assets** without bulk-activating mixed or relationship-dependent
families.

Machine source of truth:

- `docs/review-required-resolution-inventory.json` — exact queue, reason,
  semantic lane, lineage fields, proof, and wave plan for all 1,862 keys
- `scripts/audit-review-required-resolution.mjs` — reproducible accounting and
  proof generator
- `docs/asset-wiring-migration-inventory.json` — upstream repo-truth inventory
- `scripts/lib/asset-wiring-rules.mjs` — current executable family gates

This procedure does **not** reopen the 859 HOLD backlog. In particular, the
long-tail STOCKPILE LOCK remains in force. Do not request Manus work, generate
new art, perform a board-type audit, or redesign lessons during this pass.

## 1. Exact queue and why it is in review

The upstream inventory contains 2,225 records whose terminal state is
REVIEW_REQUIRED. That broad state is not the Phase B queue:

`2,225 - 309 inventory-only/unverified - 54 already-addressable = 1,862`

The 1,862 split cleanly into three evidence-backed causes:

| Cause | Count | Repo evidence |
|---|---:|---|
| `AGGRESSIVE_MIXED_ROUTE_AND_CELL_QA` | 1,307 | S4 source inventories are stockpile-only / `no_wiring`; one broad rule currently mixes ordinary props, character poses, actions, views, states, fragments, shells, and system parts |
| `REPLACEMENT_CELL_QA_AND_COLLISION_DECISION` | 480 | Every row targets `original_key`, but none has a recorded per-cell replacement verdict; 54 raw sheets must not overwrite the live vocab bank blindly |
| `SPECIALIZED_EPISTEMIC_ROUTE_AND_CELL_QA` | 75 | K2 contains 60 character singles and 15 coordinated two-shots with knowledge-state semantics and no safe generic route |

Detailed, disjoint reasons:

| Family type | Count | Reason |
|---|---:|---|
| Accessibility + manipulatives (E) | 329 | `A11Y_MANIPULATIVE_SPLIT_AND_CELL_QA` |
| Generic-child micro-actions (H) | 108 | `ACTION_POSE_NAMED_ROUTE_AND_CELL_QA` |
| Mia/Leo story poses (P) | 306 | `CHARACTER_POSE_NAMED_ROUTE_AND_CELL_QA` |
| K2 coordinated two-shots | 15 | `COORDINATED_CAST_RELATIONSHIP_AND_CELL_QA` |
| K2 Mia/Leo epistemic singles | 60 | `EPISTEMIC_POSE_NAMED_ROUTE_AND_CELL_QA` |
| Vocab art replacements | 480 | `REPLACEMENT_CELL_QA_AND_COLLISION_DECISION` |
| Professional role-detail props (F) | 276 | `ROLE_DETAIL_PROP_CELL_QA` |
| Story dressing (D) | 180 | `STORY_DRESSING_SPLIT_AND_CELL_QA` |
| Cutaways / alt views / in-use states (K) | 108 | `VIEW_STATE_LINEAGE_AND_CELL_QA` |
| **Total** | **1,862** | Exact queue |

The replacement inventory also preserves its non-exclusive source triggers.
The largest are `text_artifact` 206, `bad_alpha` 90,
`generation_artifact` 77, `bad_crop` 61, `white_plate` 61,
`weak_contrast` 60, and `wrong_concept` 58. These explain why the **current**
art was selected for replacement; they do not prove that a new cell is safe to
publish.

## 2. Terminal disposition contract

The result for each reviewed key must be one of the repo's existing terms:

- **GENERATOR_ELIGIBLE** — imported and addressable, with identity, alpha,
  sharpness, dock, topic, and family gates passing. Mid-obscure kid-interest
  assets are intentional: specificity or low likely frequency is not a reason
  to hold them.
- **SPECIALIZED** — available only through an exact named mechanic, pack,
  character/action route, state/sequence route, or relationship-aware selector.
  It must remain excluded from generic pools.
- **REFERENCE_ONLY** — preserve useful source/relationship evidence, but do not
  make the row selectable. Use this for metadata-only members, not as a vague
  substitute for review.
- **HOLD** — a real blocker exists: explicit source lock, required
  mechanic/schema absent, unresolved identity or relationship, unsafe source
  awaiting a verdict, or a wave exceeds the uncertainty threshold below.
- **JUNK** — reviewed failed/rejected candidate. Never preserve junk as a
  variant. A junk replacement candidate does not delete or demote the valid live
  original.

`IMPORTED` and `ADDRESSABLE` are factual states, not semantic dispositions.
An addressable row can still be SPECIALIZED.

## 3. Family rules

### F — role-detail props (276)

Family-level route: **GENERATOR_ELIGIBLE candidate**.

Use staged PropBank import for clean standalone tools. Narrow professional
identity is useful, not a defect. Keep useful depictions as `variantOf` where
they are truly interchangeable. Do not merge distinct tools merely because they
share a profession.

### E — accessibility and manipulatives (329)

Family-level route: **split by role**.

- Ordinary aids and manipulatives → GENERATOR_ELIGIBLE candidate.
- Blank communication shells, tiles, and system parts that need a named board
  mechanic → SPECIALIZED.
- Uncommon accessibility objects must not be held for obscurity.

Preserve system membership and any view/state identity.

### D — story dressing (180)

Family-level route: **split by role**.

- Standalone objects → GENERATOR_ELIGIBLE candidate.
- Crops, fragments, blank surfaces, shells, and composition-only dressing →
  SPECIALIZED unless they have a complete independent identity.

An uncertain fragment creates an exception row; it does not freeze the other
objects on the sheet or the whole D family.

### H — generic-child micro-actions (108)

Family-level route: **SPECIALIZED** named action pack.

Preserve actor, direction, action, counterpart, and state. Some cells include
scene fragments or a second person, so generic object/vocab selection is
forbidden.

### P — Mia/Leo story poses (306)

Family-level route: **SPECIALIZED** story-cast retrieval.

Preserve character identity, facing direction, action, emotion, and paired pose.
No generic prop/vocab leakage.

### K — cutaways, alt views, and in-use states (108)

Family-level route: **relationship split**.

- A complete semantic identity such as `apple-cutaway` can be a
  GENERATOR_ELIGIBLE candidate after QA.
- Pure camera views, coordinated cutaways, and before/after or in-use states
  need explicit parent + relationship metadata and stay SPECIALIZED when a
  generic picker would erase the distinction.

Do not encode a camera view or state as a plain `-v2`. `variantOf` is for
interchangeable depictions; view/state relationships are semantic.

### K2 Mia and Leo singles (30 + 30)

Family-level route: **SPECIALIZED** epistemic/story mechanic.

Preserve character, knowledge state, gaze, concealment/message action, and
counterpart family.

### K2 coordinated two-shots (15)

Family-level route: **SPECIALIZED**, atomic two-character assets.

Preserve relative eyeline, actor roles, knowledge asymmetry, and registration.
Never split a two-shot into two unrelated character props.

### Art replacements (480)

Family-level process, but **per-cell verdict required**.

Compare candidate and current live art using `original_key`:

- PASS → overwrite that exact identity through the vocab replacement importer;
  inherit the original identity and eligibility.
- HOLD → no overwrite; record the exact ambiguity or gate failure.
- JUNK → reject the candidate; keep the live original.

Never register `redo-*` as a teach-word or infer cell order when the sheet and
inventory mapping disagree.

## 4. Visual review workflow

Review bounded sheets, never a loose directory sweep.

1. Select one wave/family from the machine inventory.
2. Open the source sheet and its source inventory together. Cell identity comes
   from the recorded ordered list, not visual guessing or filename order.
3. Record for each cell:
   - key and source sheet/cell;
   - identity verdict;
   - disposition;
   - intended bank/pack or replacement `original_key`;
   - alpha/background, crop, sharpness, text/logo, anatomy, and safety gates;
   - variant, parent/view/state, pair, or family relationship;
   - exact exception note when not passing.
4. For prop sheets: stage → inspect QA composite and staged rows → add metadata
   → dry-run merge → merge.
5. For replacements: compare old and new side-by-side before any overwrite.
6. Regenerate both inventories and run all validation commands after each
   bounded merge.

Representative Phase A inspection covered all ten proof types:

| Type | What the local sheet proved |
|---|---|
| F role tools | Standalone tools are viable generic candidates; a white sheet field needs normal keying/gate QA, not a family hold |
| E accessibility | Clear aids are generic candidates while a blank communication-board shell is system-specialized |
| H actions | Cells are actions, sometimes with scene/second-person fragments; named action routing is required |
| K views/states | Cutaways, side profiles, blank states, and in-use states visibly require parent/view/state lineage |
| P story poses | Character-specific compositional poses belong in exact story-cast retrieval |
| D dressing | One sheet mixes standalone objects and blank shells/surfaces, proving the need for role split |
| Art replacements | Plausible new art still cannot authorize overwrite without ordered `original_key` comparison |
| K2 Mia | Gaze, concealment, knowledge, and message semantics require named retrieval |
| K2 Leo | Character and knowledge-state metadata are material, not decorative |
| K2 two-shots | Relative eyeline and role asymmetry carry the teaching meaning; splitting destroys it |

This proof validates classification and workflow. It is not a blanket visual
PASS for every cell in those families.

## 5. Exception policy

Create a per-key exception instead of freezing a whole family when:

- one cell identity is uncertain;
- one cell is badly cropped, keyed, or too small;
- a likely duplicate lacks enough evidence for `variantOf`;
- one view/state parent is unclear;
- one replacement is not better than its original.

Stop the whole bounded wave and escalate when:

- more than 5% of reviewed cells have uncertain identity, cell order, or hard
  gate failures;
- a family needs a new importer or manifest/relationship schema;
- a proposed overwrite is outside `original_key` vocab replacement;
- a change would alter PropBank, VocabArt, SceneBackgrounds, producer semantics,
  or generic eligibility behavior;
- a view/state/pair/two-shot relationship cannot be represented without
  flattening;
- inventory counts move unexpectedly by more than 2%;
- any required validation fails.

Do not use HOLD to hide a known bad cell; use JUNK. Do not use JUNK for a merely
specialized or obscure asset.

## 6. Sonnet 5 bounded waves

Run one wave at a time and commit independently when practical.

1. **R1 — F role-detail props (276):** prove the clean generic prop route.
2. **R2 — E + D (329 + 180):** separate standalone generic objects from
   shells, fragments, surfaces, and system parts.
3. **R3 — H + P (108 + 306):** named action and story-cast packs;
   SPECIALIZED, no generic leakage.
4. **R4 — K (108):** record base/view/state lineage, then split generic
   semantic identities from SPECIALIZED relationships.
5. **R5 — K2 Mia + Leo + two-shots (30 + 30 + 15):** named epistemic route,
   preserving character and coordinated-scene semantics.
6. **R6 — vocab replacements (480):** per-cell old/new comparison and explicit
   collision verdict. This is last because it has the highest overwrite risk.

After every wave, regenerate the resolution inventory. The remaining queue
must equal the prior queue minus newly addressable or explicitly terminal
records; no unexplained disappearance is acceptable.

## 7. Validation commands

Phase A proof and inventory freshness:

```bash
node scripts/audit-review-required-resolution.mjs --check
node scripts/audit-review-required-resolution.mjs --proof
npm run test:asset-wiring
npm run test:asset-wiring-proof
```

After every Phase B wave:

```bash
npm run assets:wiring-audit
node scripts/audit-review-required-resolution.mjs
node scripts/audit-review-required-resolution.mjs --check
node scripts/audit-review-required-resolution.mjs --proof
npm run test:asset-wiring
npm run test:asset-wiring-proof
npm run test:asset-migration-retrieval
npm run test:manifest-lock
npm run test:bg-picks
npm run test:topic-identity
node scripts/verify-offtopic-props.mjs
```

For a staged prop merge:

```bash
npm run assets:merge-staged -- <rows.json> --dry-run --verbose
npm run assets:merge-staged -- <rows.json>
```

Use the existing replacement importer only after recorded old/new review:

```bash
node scripts/import-vocab-sheet.mjs --help
```

Do not guess replacement flags from this procedure; inspect the current
importer interface before an overwrite wave.

## 8. Commit boundary

Phase A commits only docs, scripts, and generated JSON. Phase B may commit
reviewed transformed live assets/manifests produced by the approved importer,
but must never stage harvested PNGs, raw downloads, contact sheets, QA
composites, temporary logs, credentials, or unrelated working-tree changes.

The safe chain remains:

`FAMILY → REVIEW RULE → STAGED IMPORTER → LIVE INDEX → ELIGIBILITY/EXCEPTION`
