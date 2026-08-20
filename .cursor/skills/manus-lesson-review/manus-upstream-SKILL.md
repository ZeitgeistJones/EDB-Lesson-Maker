---
name: classin-lesson-quality-review-skill
description: "Professional review and judgment of ClassIn ESL board lessons (EDB-aligned, PPT-like scenes). Use for: evaluating lesson flow, EDB alignment, interactive beats, visual quality, and pedagogical scaffolding from both teacher and student perspectives."
---

# ClassIn Lesson Quality Review

This skill provides a structured framework for reviewing and judging ClassIn ESL board lessons. It focuses on EDB (Education Bureau) alignment, ClassIn-specific delivery features, and general ESL pedagogy.

## Review Workflow

Execute these steps in order for every review pass:

1. **Map the board** — build a quick-reference table of all submitted pages (page number, scene name, type).
2. **Verify JUST FIXED items** — check each claimed fix against the JPGs; record HOLDS or FAIL.
3. **Check KNOWN issues** — only flag if worse than stated; otherwise skip.
4. **Identify blocking issues** — list critical errors first (missing slides, broken assets, wrong grammar focus, prop/glyph mismatch that will cause active student errors).
5. **Run rubric breakdown** — evaluate all five dimensions (see below).
6. **Produce gate_holes / method_feedback** — call these if local checks claimed pass but board still fails.
7. **Write producer next_actions** — concrete, systemic actions ordered by priority.
8. **Challenge the Producer (ZPD)** — if consistent successes are achieved (Score >4.0), suggest new formats or advanced improvements.
9. **Self-update this skill** — after delivering the review, apply the skill-creator update workflow to fold in any new gate patterns, output schema fields, or producer next-action templates discovered this pass.

## The Review Rubric

Evaluate every lesson against these five dimensions:

### 1. EDB Alignment
- **Objectives**: Are all target vocabulary items listed in the aims line on the title slide? Is a grammar aim stated?
- **Language Focus**: Is vocabulary and grammar level-appropriate (e.g., B1)?
- **Assessment**: Does the formative chain match objectives (vocab intro → contextualised → practised → story → comprehension → production → exit ticket)?

### 2. ClassIn Delivery
- **Scene Clarity**: Are scenes distinct, logically titled, and sequenced?
- **Teacher Prompts**: Are timing cues (~N min chips) and pacing guides present on each scene header?
- **Interaction Beats**: Do drag-and-drop, text-entry, or click-to-reveal interactions work natively on the ClassIn board? Are drop-zone affordances clear?
- **Warm-up gate**: Confirm teacher sampleAnswer is NOT visible on the student-facing warm-up slide.

### 3. PPT-like Quality
- **Idea Density**: Does each beat focus on exactly one idea?
- **Readability**: Is text large, high-contrast, and legible against the background?
- **Sequence**: Is there a logical, narrative, or pedagogical flow between slides?
- **Visual Consistency**: Aim for ≤2 background registers across the deck. Flag if ≥4 distinct backgrounds are present.

### 4. ESL Pedagogy
- **Scaffolding**: Does the lesson follow an Input → Practice → Output (IPO) arc?
- **Frame accessibility**: Do sentence frames work for all students regardless of personal background (e.g., avoid "If I am a musician…" for non-musicians)?
- **Thematic coherence**: Are story props, instruments, and activities consistent with the lesson title and vocab set?
- **Support**: Are sentence frames, model answers, and clear instructions present?
- **Appropriateness**: Is content culturally and age-appropriate?

### 5. Completeness
- **Integrity**: No "TBD," "Lorem Ipsum," or unrendered image placeholders.
- **Media**: All required assets present and functional.
- **Story arc**: All story beats submitted; no gaps between beats and comprehension.
- **Instructions**: Student instructions unambiguous and imperative.

## Output Schema

Deliver the review using this exact structure:

### 0. Quick-Reference Board Map
Markdown table: `| Page | Scene | Type |`

### 1. Blocking Issues
One entry per blocker. Each entry: **label** (B1, B2…), **scene**, **description**, **producer action**.

### 2. JUST FIXED — Verification Results
Markdown table: `| Fix claimed | Board evidence | Verdict (HOLDS / FAIL) |`

### 3. Rubric Breakdown
One subsection per rubric dimension (3.1–3.5). Paragraph-based. Flag new misses inline.

### 4. gate_holes
Populate if any local check claimed pass but board JPG shows a fail. Format:

```
gate_holes:
  - check: <check name>
    claimed: pass
    board_evidence: <what the JPG actually shows>
    severity: blocking | high | medium
```

If none triggered, state: "No gate_holes triggered this pass."

### 5. method_feedback
Populate if a JUST FIXED item regresses or a local check method is unreliable. Format:

```
method_feedback:
  - item: <fix or check name>
    issue: <what the method missed>
    recommendation: <how to improve the check>
```

If none triggered, state: "No method_feedback triggered this pass."

### 6. Next Actions (Producer-Facing)
Markdown table ordered by priority: `| # | Priority | Scene | Action |`
Priority levels: **Blocking** → **High** → **Medium** → **Low**.
Actions must target producer prompts, layouts, PropBank captions, gate logic — not one-off Photoshop edits.

### 7. Zone of Proximal Development (ZPD) Challenge
If the **Overall Score > 4.0**, provide 1–2 "Level-Up" suggestions for the producer.
- **Topic Expansion**: Suggest a more complex or technical topic (e.g., "From Arts to Science/Tech").
- **Format Challenge**: Suggest a more demanding interactive format (e.g., "From drag-match to logic puzzles or debate-style frames").
- **Pedagogical Stretch**: Suggest pushing for higher-order thinking (e.g., "From comprehension to critical evaluation").

### 8. Summary Scorecard
Markdown table: `| Rubric Dimension | Score (/5) | Notes |` plus an **Overall** row.

### 9. Weakest Link (ANTI-INFLATION — required even on a pass)
Populate `weakest_link` on **every** pass, including a `pass` verdict: name the single weakest
page + one required improvement (`scene/page|improvement`). Never award a perfect / near-perfect
score without naming a weakest link.

### 10. Escalation Homework (Generalization Challenge)
Populate `escalation_homework` with exactly ONE escalating generalization challenge as a buildable
spec that stresses the **producer** (a new topic, a new page type, a harder CEFR level, or a
multi-round activity), escalating relative to what has already passed. Phrase it as a proposal the
human can accept or decline — not an auto-build.

## Key Heuristics

- **PropBank caption-before-glyph (S24)**: Story prop cards must show a text caption chip derived from the PropBank caption before falling back to a glyph. Verify on every story slide.
- **Vocab icon 1-to-1 mapping**: Each icon must unambiguously map to exactly one word. Abstract glyphs (starburst, sparkle) for abstract words (inspire, harmony) are high-risk; prefer PropBank-matched scene images with caption chips.
- **King activity hint**: Must reference musicians + write/say symphony idea. Must not contain 'toys' or any non-musical prop language.
- **Warm-up sample leak**: Teacher model answer must not appear on the student-facing warm-up slide.
- **Story arc completeness**: Count story beat slides. Comprehension questions must not presuppose beats that are absent from the submission.
- **Background palette**: Flag if ≥4 distinct background registers are used across the deck.
- **Timing cues**: Flag absence of per-scene timing chips in any lesson ≥45 min.
- **ZPD Rule**: Never accept "perfection" once consistent success is achieved. Always look for the next challenge for the producer.
- **Holistic judgment**: Primary ask is “What do you think of this lesson?” Everything is fair game for grading (pedagogy, visual/UX, overlay, match honesty, timing, aims, backgrounds, completeness, delivery, mechanical misses). KNOWN / JUST FIXED / LOCAL CHECKS / FOCUS are optional context only — never skip-lists. Use `gate_holes` when a claimed check clearly lied, in addition to normal findings when something is simply bad. Known-intentional items: escalate to blocking only if THIS bake is worse.
- **Anti-inflation Rule**: ALWAYS name a `weakest_link` (single weakest page + one required improvement), even on a pass. No perfect / near-perfect score without a named weakest link.
- **Escalation Rule**: Always propose exactly ONE escalating generalization challenge (`escalation_homework`) that stresses the producer — a proposal the human triages, not an auto-build.

## Self-Update Step (Mandatory)

After delivering every review, apply the skill-creator update workflow:

1. Identify any new gate patterns, output schema fields, producer next-action templates, or heuristics discovered during the review.
2. Edit this SKILL.md to fold them in (add to Key Heuristics, refine output schema, or add new rubric sub-checks).
3. Run `python /home/ubuntu/skills/skill-creator/scripts/quick_validate.py classin-lesson-quality-review-skill` to confirm validity.
4. Deliver the updated SKILL.md to the user as an attachment.

This ensures the skill improves with every pass without requiring an explicit user request.
