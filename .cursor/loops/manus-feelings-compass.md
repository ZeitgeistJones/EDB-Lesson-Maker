# manus-feelings-compass

type: manusloop  
case: feelings-compass  
repo: `C:\dev\PPT-Lesson-Maker-for-Classin`

Re-runnable: `/manusloop run manus-feelings-compass`

## Product intent

Abstract-vocab stress test away from classical/music. Feelings B1 board:
face-blank king + feeling-* dock; aims⊆board vocab; second-conditional honesty;
no match answer captions; full story packet.

## Stages

### 1 — Base
```bash
node scripts/verify-feelings-compass.mjs
```

### 2 — Manus
```bash
npm run manus:review -- tmp/board-bg-verify/feelings-compass --passoff=scripts/manus/passoffs/feelings-compass.json
```
Body: `.cursor/loops/manus-feelings-compass/last-response.md`

### 3 — Fix map
| Finding | Fix |
|---------|-----|
| Face parts on feelings dock | Stop pad with non-feeling kit/tag resolve |
| Make-a-face hint leak | feelingsKing hint before faceKing |
| Classical flats on feelings | TOPIC_SETS feelings → board-face |
| Emotion prop resolve | PROP_ALIASES worried→feeling-worried etc. |

### 4 — Audit
```bash
node scripts/verify-feelings-compass.mjs
```

## Last run

- **When:** 2026-08-07 (shift30 — new topic + Manus fold)
- **Local:** verify ok (fails=[])
- **Manus:** https://manus.im/app/SsdpWA76twR2U5WF3MLMHg · **revise** · score **41** · overall **4.0** · all just_fixed HOLDS
- **Fold:** B2 story check→checkmark → feelings prefer + stop words; reject B1 (OCR commas) + B3 (navy wrap = S32)
- **Assets:** existing feeling-* + vocab pack — no generate
- **ZPD logged:** richer emotion terms; two-round Feelings Lab
- **Next:** `/manusloop run manus-feelings-compass` after story prop confirm
