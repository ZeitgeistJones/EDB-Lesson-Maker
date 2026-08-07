---
name: manus-lesson-review
description: >-
  Send an internally good-enough ClassIn board bake to Manus for structured
  visual/pedagogy critique, then apply next_actions to the producer. Use when
  the user says send to Manus, Manus review, external eyes, or after a quality
  verify pass when the lesson looks ready for ClassIn.
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
- Always include title, newWords, frames, story0, activity when present

## How to run

```bash
npm run manus:review -- tmp/board-bg-verify/<case> --title="Lesson Title" --level=B1 --duration=60
```

Or MCP tools (if `manus` server is registered): `manus_create_task` → poll `manus_poll_task` → `manus_confirm` if waiting.

Auth: `MANUS_API_KEY` in environment or gitignored `.env`. Never commit or print the key.

## After feedback

1. `verdict: pass` → ship / upload EDB  
2. `revise` → apply `next_actions` to **producer machinery** (prompts, skills, layout), rebake, re-send only after a real fix  
3. `fail` → fix `blocking_issues` first  

Log lines append to `.cursor/ratings/manus-reviews.jsonl`.

Setup details: [docs/manus-review.md](../../docs/manus-review.md).
