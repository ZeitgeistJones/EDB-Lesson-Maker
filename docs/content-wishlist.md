# Content wishlist (lesson English / pedagogy)

Gaps in **lesson content** — not art. For us (agent + you) when something teaches weird, mismatches CEFR, or the story/questions don’t line up. No teacher-complaint channel; we log what we notice during generates, fixtures, or quality reviews.

**Sister list:** art gaps → [`asset-wishlist.md`](asset-wishlist.md)

**Rules**
- Fix the **producer** when it’s a pattern (prompt, schema, `PhonicsPolicy`, CEFR counts) — then regen
- One-off flukes still get a row so we remember
- Do **not** invent a special-case for one lesson title as the only fix
- `Status`: `open` → `prompt-fixed` / `schema-fixed` → `verified` (or `wont`)

| Date | Issue | Why (topic / level / page) | Likely producer | Status |
|------|-------|----------------------------|-----------------|--------|
| 2026-08-07 | Title charm stacks a musician cutout on a terrace scene that already has a piano — awkward double-instrument title | Classical compose / Manus reviews | `titleCharmSrc` skips charm for music/classical packs | prompt-fixed |
| 2026-08-07 | Story pages ship cheap 🎼 glyph side art instead of real story / prop-side visuals | Same bake — all story panels weak | Story-art picker + theme-emoji fallback / gates | open |
| 2026-08-07 | Reading comprehension page empty despite fixture having questions | Fixture used root `comprehension[]`; renderer only read `story.comprehensionQuestions` — Manus fail/revise | `normalizeLesson` + S19 | schema-fixed |
| 2026-08-07 | Warm-up shows teacher sampleAnswer to students | Honesty / answer leak — Manus | Warm page no longer renders sample; keep JSON for teachers | schema-fixed |
| 2026-08-07 | King activity hint says “Drag toys…” with no language production | Manus ClassIn fit | Theme-aware king hints + speak/write cue; S21 | schema-fixed |
| 2026-08-07 | B1 frames use bare second conditional without scaffold | Manus language_accuracy | Generate-lesson CEFR frame rules | prompt-fixed |
| 2026-08-07 | No visible aims / weak wrap-up exit ticket | Manus EDB alignment | Title aims line + wrap “Today we used” / exit ticket; S22/S23 | schema-fixed |

<!-- Classical compose note (2026-08-07): Activity dock + skipKing piano-on-piano fixed (f21ca03). Manus dual reviews LbVd…/oEDh… folded into producer 2026-08-07. Story glyphs still open. -->

## How to add a row

When you see bad English/teaching and can’t (or shouldn’t) auto-fix it in this turn:

1. Append one row above (dedupe first).
2. If it’s a repeating pattern, also note the `root` in the quality verdict / chat so the next pass can change the prompt or gate.
3. After a producer fix, mark `prompt-fixed` / `schema-fixed`, then `verified` once a regen looks right.

## Common issue types (examples)

- Story text vs comprehension / creative questions don’t match
- Vocab or story language too hard/easy for the chosen CEFR level
- Phonics word irregular or wrong for the level (also enforced by `PhonicsPolicy` — log if Gemini keeps fighting the gate)
- Sentence frames / activity templates without a usable `___` blank
- Speaking samples that don’t fit the topic
- Duplicate or near-duplicate vocab that makes matching pointless
