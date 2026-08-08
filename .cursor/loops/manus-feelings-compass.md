# manus-feelings-compass

type: manusloop  
case: feelings-compass  
repo: `C:\dev\PPT-Lesson-Maker-for-Classin`

Re-runnable: `/manusloop run manus-feelings-compass`

## Product intent

Abstract-vocab stress test away from classical/music. Feelings B1 board:
face-blank king + feeling-* dock; aims⊆board vocab; second-conditional honesty;
no match answer captions; full story packet; two-round Feelings Lab (S41) with
Round 2 If…would (S45); leading feeling captions (S44); wrap timing (S46).

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
| Check→checkmark story | feelings prefer + stop words; caption leads with feeling |
| One-shot activity | Two-round Feelings Lab (S41) + If…would Round 2 (S45) |
| Round→castle-*-round | KIT_STOP + curated stage before kit (S43) |
| Write/say no strip | feelingsKing prodWrite under hint (S44) |
| Wrap no timing | makeWrap ~3 min chip (S46) |
| Manus null review | structured_success requires value; post-stop retries |
| Navy wrap / OCR frames | Reject (S32 / false OCR) |

### 4 — Audit
```bash
node scripts/verify-feelings-compass.mjs
```
Soft: S42 no feeling-* story props.

## Last run

- **When:** 2026-08-07 (manusloop ×4 complete)
- **Local:** verify ok (fails=[]; timingChipCount=11)
- **Manus trail:**
  - pass1 [JkBr5](https://manus.im/app/JkBr5MesJWVgnGGtXrgHM8) blocked
  - pass2 [kS8Er](https://manus.im/app/kS8ErN7ZPkUtJ8iNWu38oc) fail/90
  - pass3 [LSSgv](https://manus.im/app/LSSgv4Kc5Tigura7fph87F) pass/99
  - pass4 [3Uc8](https://manus.im/app/3Uc8A7mGCQFSVZLbZPSGq6) pass/4
- **Fold:** S41–S46 producer + generate-lesson feelings block; reject wrap recolor + OCR
- **Assets:** none generated — existing feeling-* / vocab pack
- **Leftover soft:** palette register soft (Manus ≤2 mid-deck holds locally via S34)
- **StoryArt:** disk cache + verify `--story-art=auto` + S47; fill-missing; feelings+classical caches green
- **Folded soft:** S48 receptive Aims (`talk and read`) when story.pages
- **Next:** Manus re-review when home/credits; optional third-topic StoryArt illustrate
