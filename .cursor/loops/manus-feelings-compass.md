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
node scripts/verify-feelings-compass.mjs --story-art=auto
```
Soft: S42 no feeling-* story props.
New gates (S49, Manus QCVsgMcb): DRAG_SOURCE_COUNT == TARGET_VOCAB_COUNT (dock==6);
comprehension board must show inferential Q (not dropped past slice); creative cards on-board.

## Last run

- **When:** 2026-08-08 (manusloop ×2 — StoryArt validation)
- **Local:** verify ok (fails=[]; soft=[]; feelingDockCount=6; StoryArt 3/3; timingChipCount=11)
- **Manus trail:**
  - pass4 (prev) [3Uc8](https://manus.im/app/3Uc8A7mGCQFSVZLbZPSGq6) pass
  - ×2 pass1 [QCVsgMcb](https://manus.im/app/QCVsgMcb6FhkXQekQSVbuC) pass/90 — StoryArt HOLDS ("consistent Mia design", "visual engagement boost")
  - ×2 pass2 [ERcBCTg7](https://manus.im/app/ERcBCTg788aBRC3BWfhjUs) pass/4.9 — classin_fit.gaps=[]; S49 trio CLEARED; StoryArt HOLDS
- **Fold (pass1):** S49 producer trio — feelings dock capped to taught vocab (12→6, edbActivities.roleplayDockProps); comprehension surfaces inferential Q instead of dropping it (renderLessonPages.makeComprehension); creative prompt 36→30px + box 140→100 so Idea 2 fits. Verify gained S49 gates.
- **Pass2:** clean pass — no new fold needed. Only Low/optional notes (navy variant = S32 intentional; abstract-vocab→scene-image gate = speculative future-topic, logged not implemented).
- **StoryArt:** validated live twice — illustrated S5–S7 panels recurring Mia, scene↔caption fit; disk cache green (`--story-art=auto`, cacheKey sa_c6d870f0). Illustrated panels lifted scorecard (StoryArt "visual engagement boost" strength both passes).
- **Assets:** none generated — StoryArt cache hit; feeling-* pack sufficient
- **Leftover soft:** palette register soft (navy S32 held); ZPD stretch (StoryArt on process/sequence topic; student-authored "My Compass" scene for B1→B2)
- **Next:** optional — generalize StoryArt to a process/sequence topic; consider student-generated content loop
