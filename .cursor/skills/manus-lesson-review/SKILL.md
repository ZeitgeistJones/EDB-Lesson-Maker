---
name: manus-lesson-review
description: >-
  Send an internally good-enough ClassIn board bake to Manus for structured
  visual/pedagogy critique, then ALWAYS fold feedback into the producer and
  local review checks before the next bake. Use when the user says send to
  Manus, Manus review, external eyes, or after a quality verify pass when the
  lesson looks ready for ClassIn.
---

# Manus lesson review

Manus is **external eyes** after local gates. Do not spam on every draft.

## When to send

Only when the bake is **internally good enough**:

- Verify / quality bake wrote JPGs under `tmp/board-bg-verify/<case>/`
- No hollow kit / readiness hard-fail if those gates ran
- Agent or user believes title + activity + vocab are teachable

Known open issues from `docs/content-wishlist.md` may be passed as `--known=` so Manus focuses on new misses.

## What to send

**Board JPGs**, not the binary `.edb`:

- Prefer `contact.jpg` when present
- Always include title, newWords, frames, story0, activity, comprehension, wrap when present

## How to run

```bash
npm run manus:review -- tmp/board-bg-verify/<case> --title="Lesson Title" --level=B1 --duration=60
```

Optional known issues (pipe-separated): `--known="title charm overlay|story glyph"`.

Or MCP: prefer `manus_review_bake` with `{ "dir": "tmp/board-bg-verify/<case>", "title": "..." }`.

Auth: `MANUS_API_KEY` in environment or gitignored `.env`. Never commit or print the key.

## After feedback (REQUIRED — every Manus pass)

Do **not** stop at summarizing Manus. Always:

1. **Dedupe** blockers / `next_actions` across duplicate tasks (keep the higher-signal pass).
2. **Log** durable pedagogy misses in [`docs/content-wishlist.md`](../../docs/content-wishlist.md) (or asset wishlist for art).
3. **Fix the producer** for repeating patterns — prompts (`api/generate-lesson.js` / `server.js`), render (`renderLessonPages.js`), recipes, gates — then regenerate. Never Photoshop one PNG as the only fix ([fix-the-producer](../../rules/fix-the-producer.mdc)).
4. **Upgrade local checks** so we catch the same miss without Manus next time:
   - Soft codes in [`scripts/ux-board-rubric.cjs`](../../../scripts/ux-board-rubric.cjs) (S19–S23 pedagogy)
   - Dual-lens bullets in [board-quality-loop](../board-quality-loop/SKILL.md)
   - Verify scripts / readiness when measurable
5. **Verdict routing**
   - `pass` → ship / upload EDB  
   - `revise` → apply `next_actions` to machinery, rebake, re-send Manus only after a real fix  
   - `fail` → fix `blocking_issues` first  

Log lines append to `.cursor/ratings/manus-reviews.jsonl`.

### Already learned from classical-compose Manus (2026-08)

| Miss | Producer / check |
|------|------------------|
| Empty comprehension | `normalizeLesson` lifts root `comprehension` → `story.comprehensionQuestions`; S19 |
| Warm sample on board | Warm-up no longer renders `sampleAnswer` to students; S20 |
| “Drag toys…” | King hints name pieces + require speak/write; music-specific cue; S21 |
| No aims / weak wrap | Title aims line + wrap exit ticket; S22/S23 |
| Title charm on terrace piano | Music pack title charm skipped |
| B1 bare second conditional | Generate prompt CEFR frame rules |
| Story glyphs | Still open on wishlist — story-art path |

Setup details: [docs/manus-review.md](../../docs/manus-review.md).
