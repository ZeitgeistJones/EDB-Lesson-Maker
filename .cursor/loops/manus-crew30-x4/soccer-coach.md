# manus-crew30-x4 / soccer-coach — pass 4/4 (Track B)

**When:** 2026-08-11  
**Task:** [S3G4yf9Z](https://manus.im/app/S3G4yf9ZJ2AS2PrknJuQio)  
**Verdict:** revise · **Score:** 68 · overall 3.0

## Local smells (pre-Manus)
- hardFailures=[] · M7=1 · matchable=6 dropped=[]
- Activity = sortBins (Things/Ideas), not king — correct for no-hero
- Grammar aim still “opinion / planning” vs naming/completion frames
- Comprehension single Q; fixture had 2 story pages, bake shows story0 only
- Gym-cool flats (basketball corner visible on soccer lesson) — soft theme drift
- warn M1@speaking:0 (20px)

## Manus blockers → proposed producer fixes (NO code this pass)

| Issue | Proposed producer fix (do not duplicate crew30 folds) |
|-------|------------------------------------------------------|
| B1 S73 — “Who has the whistle?” not answerable from baked story text | **New gate:** S73 generator/trace — every comprehension Q must map to one explicit story sentence; reject ungrounded bake. Distinct from trampoline S74 (≥2 Qs floor) which already folded. |
| B2 Story beat incompleteness — fixture 2 beats → bake story0 only | **New receipt:** require fixture beat count ≡ emitted storyN pages before release; forbid silent merge-to-story0. |
| B3 Duration ~50 min chips vs declared 30 | Extend trampoline `timingChip()` fold: **live-scene timing accumulator** that enforces duration budget + drops duplicate wrap from the sum. Do not re-open wideStage/safety-dock. |

## Non-blocking (next_actions / weakest_link)
- Grammar-aim contract: derive from frames (same family as face/castle `grammarAimLine` folds — verify soccer-coach still ships opinion/planning label → gate_holes confirmed)
- Sort bins: attach A1 microframe + rationale bank (“___ is a thing / idea”) — weakest_link Page 9
- Medium: ≥2 source-grounded literal Qs when reading assessment present (S74 already folded elsewhere; enforce here)

## Just-fixed held
- job-coach prop · soccer-ball prop · sortBins not king · M7=1 · numbered pads

## Collision note
Already folded under trampoline/face/castle (do not invent duplicates): S74/S75 floors, PhonicsPolicy omit, timingChip scale for &lt;50, wideStage, dock theme caps, hair/castle dock guarantees. Soccer-coach deltas are **S73 grounding trace**, **story-beat receipt**, and **duration budget accumulator**.

## Assets
None requested — vocab sense lock held (coach/whistle/practice/effort/ball/teamwork).

## Escalation (triage later)
A2 35-min “Community Sports Day” — 2 story beats, 2 grounded Qs, two-round Things/Actions/Ideas sort with spoken frames — ACCEPT|DECLINE for human.
