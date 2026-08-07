---
name: manus-lesson-review
description: >-
  Send an internally good-enough ClassIn board bake to Manus for structured
  visual/pedagogy critique with a pass-off brief (known / just-fixed / gates /
  focus), then ALWAYS fold feedback into the producer and local review checks.
  Use when the user says send to Manus, Manus review, external eyes, or after a
  quality verify pass when the lesson looks ready for ClassIn.
---

# Manus lesson review

Manus is **external eyes** after local gates. Do not spam on every draft.

Manus runs its own upstream skill `classin-lesson-quality-review-skill` (mirror:
[`manus-upstream-SKILL.md`](./manus-upstream-SKILL.md)). Our schema + brief must
match that bar so structured output stays machine-foldable.

## When to send

Only when the bake is **internally good enough**:

- Verify / quality bake wrote JPGs under `tmp/board-bg-verify/<case>/`
- No hollow kit / readiness hard-fail if those gates ran
- Agent or user believes title + activity + vocab are teachable

## Pass-off (always write before send)

Short JSON — template [`scripts/manus/passoff.example.json`](../../../scripts/manus/passoff.example.json):

| Field | Purpose |
|-------|---------|
| `knownIssues` | Owned misses — don’t re-litigate unless worse |
| `justFixed` | Verify these still hold; else Manus fills `method_feedback` |
| `localChecks` | What we claim passed (script names + outcomes) |
| `focus` | This pass’s ask |
| `notes` | Optional one-liner |

Save as `<verify-dir>/manus-passoff.json` (auto-loaded) or `--passoff=scripts/manus/passoffs/….json`.

Schema asks Manus for **`gate_holes`**, **`method_feedback`**, **`just_fixed_results`**,
**`scorecard`** (/5 × 5 dims + overall), and **`zpd_challenges`** (when overall > 4.0).

## What to send

**Board JPGs** + pass-off text, not the binary `.edb`.

Prefer contact + title, newWords, frames, **all storyN beats**, comprehension, activity, wrap when present.
`pickImages` soft-max must never drop a middle story page (gate hole B1 on classical-compose).

## How to run

```bash
npm run manus:review -- tmp/board-bg-verify/<case> --passoff=scripts/manus/passoffs/<case>.json --dry-run
npm run manus:review -- tmp/board-bg-verify/<case> --passoff=scripts/manus/passoffs/<case>.json
# flags also work: --known=a|b --fixed=c|d --gates=e|f --focus=g|h
```

Or MCP `manus_review_bake` with the same fields / `passoff_path`.

Auth: `MANUS_API_KEY` in environment or gitignored `.env`. Never commit or print the key.

## After feedback (REQUIRED — every Manus pass)

Do **not** stop at summarizing Manus. Always:

1. **Dedupe** blockers / `next_actions` (and `gate_holes`) across duplicate tasks.
2. **Log** durable pedagogy misses in [`docs/content-wishlist.md`](../../docs/content-wishlist.md) (or asset wishlist for art).
3. **Fix the producer** for repeating patterns — then regenerate ([fix-the-producer](../../rules/fix-the-producer.mdc)).
4. **Upgrade local checks** from `gate_holes` / `method_feedback` so the same miss fails locally next time (rubric soft codes, verify scripts, dual-lens).
5. **Verdict routing**
   - `pass` → ship / upload EDB  
   - `revise` → apply `next_actions`, rebake, re-send Manus only after a real fix (+ updated pass-off)  
   - `fail` → fix `blocking_issues` first  
6. **ZPD** — if `scorecard.overall > 4.0` (or score ≥ 80 with empty blockers), log `zpd_challenges` as next-loop fuel; do not treat pass as “stop improving the producer.”

Log lines append to `.cursor/ratings/manus-reviews.jsonl`.

### Already learned from classical-compose Manus (2026-08)

| Miss | Producer / check |
|------|------------------|
| Empty comprehension | `normalizeLesson`; S19 |
| Warm sample on board | Warm-up hides sampleAnswer; S20 |
| “Drag toys…” | King hints + speak/write; S21 |
| No aims / weak wrap | Title aims + wrap exit ticket; S22/S23 |
| Title charm on terrace piano | Music pack title charm skipped |
| B1 bare second conditional | Generate prompt CEFR frame rules |
| Story glyphs | PropBank caption fallback before emoji; full StoryArt still preferred when cached; S24 |
| Story beat 3 “missing” | Often a **packet hole**: `pickImages` must attach every `storyN` (S27) — board already had 3 beats |
| inspire starburst ambiguity | Dedicated `inspire.png` (lyre-bulb ivory/gold); verify requires inspire.png not brain; S26 |
| Match caption bake leak | `matchDock` no label; `pieceToPng` never captions matchPiece; verify piece.label; S26 |
| Aims truncated / untaught orphans | Aims = board vocab slice(0,6); S25/S30 |
| Soft match drop zones | Numbered DOM `data-match-pad`; S28 |
| matchPad meta.word → tiny vocab art on cards | `pieceToPng` prefers data:/pad roles over wordArt |
| Timing chips | headers ≥45 min + king/activity chip; S29 |
| Grammar aim honesty | `grammarAimLine()` from frames; S31 |
| Wrap palette break | Navy/slate wrap bookend; S32 |
| Mid-deck ≤2 flats | pickFlat midPool/generic band cap; S34 |
| Story side thrash | always-left prop card; S33 |
| Activity instruction contrast | ink-tagged king title + slate hints; S35 |
| Wrap peer-feedback | Peer check exit line; S36 |
| Wrap exit vocab coverage | Also say: for missing board words; S37 |
| Title aims vs scene | Frosted aims panel + slightly smaller title |

### Manus skill delta (absorbed 2026-08-07)

Upstream skill after J4up self-update + ZPD pass — vs our original flat schema:

| New Manus bar | Our fold |
|---------------|----------|
| Board map → JUST FIXED table → 5-dim rubric → scorecard /5 | Brief + `scorecard` + `just_fixed_results` in `review-schema.mjs` |
| Structured `gate_holes` / `method_feedback` fields | Pipe-string formats in schema descriptions |
| ZPD Level-Up when overall > 4.0 | `zpd_challenges` required array; skill step 6 |
| Heuristic: aims ⊆ taught vocab; caption chips remove inference | S30; remove student match captions |
| Heuristic: ≤2 bg registers / flag ≥4; wrap register | S32 navy wrap; palette still known soft |
| Heuristic: grammar aim matches frames | S31 `grammarAimLine` |

Setup details: [docs/manus-review.md](../../docs/manus-review.md).
