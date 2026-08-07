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

Schema also asks Manus for **`gate_holes`** + **`method_feedback`** — meta-review of our checks/process.

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
| inspire starburst ambiguity | `PACK_OVERRIDES.inspire→brain` + match-dock caption chips; S26 |
| Aims truncated / no grammar | Title aims ≤8 vocab + grammar aim line; S25 |

Setup details: [docs/manus-review.md](../../docs/manus-review.md).
