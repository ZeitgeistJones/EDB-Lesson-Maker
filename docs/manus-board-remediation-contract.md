# Manus board remediation contract

Durable rules for **single-board / board-grammar review** loops. Each `BOARD_TYPE_ID` in [`board-type-review-roster.md`](./board-type-review-roster.md) gets its own loop log under `docs/manus-board-loops/<type>.md`. This doc is the shared contract — not a per-grammar exception list.

## Scope

- **One board, one grammar.** Manus reviews a single baked JPG for one `BOARD_TYPE_ID` on one topic/CEFR fixture. See `scripts/manus/review-single-board.mjs`.
- **Dual lens.** Judge (1) this rendered board and (2) what it reveals about the **reusable board grammar** / producer.
- **Not in scope:** whole-lesson review, unseen pages, code implementation by Manus, asset-backlog reopening, or one-off Photoshop that the producer cannot repeat.

## Finding taxonomy

Every finding must be labeled:

| Label | Meaning | Cursor response |
|---|---|---|
| **SYSTEMIC** | Reusable grammar, producer, layout, scale, hierarchy, state machine, or gate | Fix the **producer** (renderer, planner, recipe, local gate), then rebake and re-send on a **rotated topic** |
| **INSTANCE-SPECIFIC** | This topic, this asset choice, this copy line only | Fix via topic fixture, asset swap, or scoped content — only when the grammar already supports the job |

Prefer `next_actions` aimed at the reusable producer, not hand-edited artifacts.

## When remediation is needed

Trigger if **any** of:

1. **Visual / Product Polish &lt; 7/10** (score &lt; 70 or overall &lt; 3.5 — worksheet smell, weak hierarchy, dead space, no child curiosity before teacher explains, action→payoff not visible at projection scale), **or**
2. **Any P0** in:
   - **asset-integrity** — wrong/missing/ghost props, label≠image, dock-unsafe art, answer leak through art
   - **interaction-contract** — learner job, movable set, snap targets, state transitions, or reveal/payoff not executable as rendered
   - **language-scaffold** — frame, countability, CEFR wording, or production prompt misaligned with visible tokens

## Remediation packages (optional)

When critique indicates remediation is needed, Manus **may** deliver a remediation package. Packages are **optional** — Manus may not supply them.

| Deliverable | Purpose |
|---|---|
| **Redesigned board image** | Visual target — layout, hierarchy, scene weight, polish |
| **`asset_manifest.md`** | Named props/backgrounds, roles (hero / dock / wrong / correct / peel), keys or generation briefs |
| **Importable PNGs** | Cutouts/plates Manus authored for this redesign (black-field props where applicable) |
| **`implementation_notes.md`** | Drag/drop/snap zones, state machine (starter → placed → revealed → complete), celebration beat, copy budget, what must **not** change |

**If absent:** Cursor implements **systemic fixes** from critique / `next_actions` only — fix the producer, rebake, run local bake loops. Do not block on waiting for a package.

**If present:** import assets and use the redesign as the visual target; fold interaction into the producer per the rules below.

Manus does **not** implement code. Cursor owns producer work.

## Cursor fold rules (after Manus critique)

1. **Treat critique as the source of truth** — whether or not a package arrived, land **SYSTEMIC** fixes in the producer first ([fix-the-producer](../.cursor/rules/fix-the-producer.mdc)).
2. **If a package is present:** treat the redesign as the target — match layout intent, scene-first weight, and polish level; import assets into normal estate paths (`public/assets/…`, prop bank, vocab art) following existing import/keying rules.
3. **Implement interaction in the producer** — drag/drop, snap, state persistence, reveal, celebration — in the reusable grammar (`edbActivities`, recipe renderer, gates), not as a one-lesson override.
4. **Preserve invariants:**
   - declared **learner job** and **CEFR** level
   - already-valid assets (do not discard good art to chase a new palette)
   - topic binding (no silent theme drift)
5. **No generic reskin** — if the fix is “prettier worksheet,” reject it; the grammar must earn action→payoff.
6. **Local bake loops OK** — rebake, update local gates in `scripts/test-board-grammars.mjs` (or type-specific tests), then optionally re-send Manus.

Log each round in `docs/manus-board-loops/<type>.md` with `SYSTEMIC` / `INSTANCE-SPECIFIC` on `WEAKEST_LINK` and landed producer fixes.

## Graduation (cease the grammar loop)

A board grammar **graduates** when **two consecutive Manus rounds** on **materially different topics** both satisfy:

- **Visual / Product Polish ≥ 7/10** (score ≥ 70 or overall ≥ 3.5), and
- **No P0** (asset-integrity, interaction-contract, language-scaffold)

Then **stop** that grammar’s dedicated Manus loop. Further work is opportunistic (ZPD / escalation homework), not blocking loop budget.

Does **not** graduate on:

- invalid / empty zero-score Manus payloads (treat as transport failure, not evidence)
- same topic repeated twice
- polish pass with lingering P1-only issues if any P0 remains
- producer-only local passes without two qualifying external rounds

Record graduation in the loop log: `STATUS: GRADUATED`, last two topics, round paths, scores.

## Related

- Roster + baseline JPGs: [`board-type-review-roster.md`](./board-type-review-roster.md)
- Per-type round logs: `docs/manus-board-loops/*.md`
- Send script: `scripts/manus/review-single-board.mjs`
- Full-lesson Manus (different mode): `.cursor/skills/manus-lesson-review/SKILL.md`
