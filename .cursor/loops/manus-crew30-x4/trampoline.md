# manus-crew30-x4 / trampoline — pass 1/4

**When:** 2026-08-11  
**Task:** [MZJkXah7](https://manus.im/app/MZJkXah76S6LA6ckZa8KfP)  
**Verdict:** revise · **Score:** 64 · overall 3.2

## Local smells (pre-Manus)
- hardFailures=[] · M7=1
- Single visible comprehension Q (StoryIntegrity dropped "Where does Mia practice?" — sample invented backyard)
- King hint clipped under wide trampoline
- 12-piece gym dock (skateboard/dumbbell/frisbee)

## Manus blockers folded
| Issue | Producer fix |
|-------|----------------|
| B1 frame blank / grammar aim | S75 `frameBlankBankable` + generate prompt + sequencing `grammarAimLine` + fixture frames |
| B2 dock theme + S21 cue clip | trampoline dock → 6 safety props; `wideStage` gutter/y |
| B3 duration vs chips | `timingChip()` scales for duration&lt;50 |
| B4 thin comprehension | S74 ≥2 grounded Qs + grounded samples in generate + fixture |

## Assets
None requested beyond existing safety props — logged no new art (hunters own bank).

## Audit
- StoryIntegrity on fixed fixture → 3/3 Qs kept
- frameBlankBankable: noun-only "until I ___" fails; new fixture passes
- Gates: S74/S75 in boardReadiness

## Escalation (triage later)
Two-stage Safety & Planning Lab with target-prop lock + justify round — ACCEPT|DECLINE for human.
