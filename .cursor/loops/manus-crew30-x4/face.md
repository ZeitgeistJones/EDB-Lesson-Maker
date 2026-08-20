# manus-crew30-x4 / face — pass 2/4

**When:** 2026-08-11  
**Task:** [Ehp2RiDr](https://manus.im/app/Ehp2RiDrKRyo2xMLXA4ikR)  
**Verdict:** revise · **Score:** 65 · overall 3.28

## Local smells
- hardFailures=[] · M7=1
- Warm-up named “eyes” (S57 spirit)
- Phonics page present but A1 magic-e vocab → bank cat/dog

## Manus blockers folded
| Issue | Producer fix |
|-------|----------------|
| B1 off-topic phonics cat/dog | PhonicsPolicy: no bank pad when all topic rows fail CEFR; omit page |
| B2 grammar aim ≠ frames | `grammarAimLine` have/possession |
| B3 hair missing from dock | Interleave face dock + hair guarantee; stronger king hint |

## Assets
None — hair props already in bank; hunters not needed.

## Audit
- `normalize(face, A1)` → null (page omitted)
- Legal CVC phonics still normalizes
