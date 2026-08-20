# manus-crew30-x4 / fruit-market — Track B

**When:** 2026-08-11  
**Task:** [Y737qSbS](https://manus.im/app/Y737qSbSG9sTiaSBDRuRWp)  
**Verdict:** fail · **Score:** 54 · overall 2.7

## Local smells (pre-Manus)
- hardFailures=[] · M7=1 · match pads=6 (≥3) · no phonics page (omit OK)
- Single comprehension Q on bake (S74 miss vs claim)
- Grammar aim still “opinion / planning” vs I see / The ___ is fresh / Please pass frames
- Activity heroProp dock = café/bakery scrap (coffee/bread/croissant…) not apple/banana/carrot/tomato/lemon/grape
- frameTiles present with 6 taught tiles (S75 blank bankability OK on this bake)

## Manus blockers → proposed producer fixes (NO code this pass)
| Issue | Proposed fix |
|-------|----------------|
| B1 Activity dock café/bakery ≠ taught produce | PropBank/target-lock hero dock to the 6 board foods; require observable frame use in production cue |
| B2 Timing chips ~53 min vs 30-min claim | Enforce sum(timing chips) ≤ declared duration; scale chips for short lessons |
| B3 Grammar aim ≠ frames | Derive title `grammarAimLine` from practiced frames (see/naming/request), validate bake text |
| High: S74 single grounded Q | Fixture + generate: ≥2 story-grounded comprehension prompts with evidence spans |
| Soft: stale page-10.jpg attached | Clean verify dir before Manus packet (drop orphan JPGs) |

## JUST FIXED audit (Manus)
- PhonicsPolicy omit — HOLDS
- Match ≥3 + S28 pads — HOLDS
- frameTiles taught tiles — HOLDS
- S74/S75 floor — FAIL (1 Q)
- grammarAimLine honesty — FAIL

## Assets
None new — fruit/veg pack already on New Words; activity needs those same keys in the dock, not café kit.

## Escalation (triage later)
Two-round A1 market-production template: round 1 drag exactly 3 declared foods into basket; round 2 say/write one frame sentence — ACCEPT|DECLINE.
