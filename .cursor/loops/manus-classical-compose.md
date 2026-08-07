# manus-classical-compose

type: manusloop  
case: classical-compose  
repo: `C:\dev\PPT-Lesson-Maker-for-Classin`

Re-runnable with no chat history: `/manusloop run manus-classical-compose`

## Product intent

ClassIn ESL producer for “Composing a Classical Masterpiece” / fixture retitle “Writing a Symphony for the Orchestra”. Fix **machinery** (prompts, pickers, gates, verify) so Manus misses don’t recur — not one-off PNG edits.

## Stages

### 1 — Base

```bash
node scripts/verify-classical-compose.mjs
npm run manus:dry -- tmp/board-bg-verify/classical-compose --passoff=scripts/manus/passoffs/classical-compose.json
```

Expect: `ok: true`, `storyPageCount: 3`, page-7-story2 on disk, dry-run `images` lists story0+story1+story2, `hasMatchPads` + `matchPadDomCount` = vocab size, no `matchDockCaptions`, schema_keys include scorecard/zpd_challenges.

### 2 — Manus

Prefer **cached** review unless verify rebake clearly needs a second live pass:

- URL: https://manus.im/app/USYeNZYJPBBG83desbukbT
- verdict: pass · score: 98
- Cached body: `.cursor/loops/manus-classical-compose/last-response.md`
- Log: `.cursor/ratings/manus-reviews.jsonl` (task_id `USYeNZYJPBBG83desbukbT`)
- Upstream skill mirror: `.cursor/skills/manus-lesson-review/manus-upstream-SKILL.md`

Prior cached (pre-pad): https://manus.im/app/J4up6tWdwZyWUWP5wLq2pG · revise/72

Live only after producer fixes + updated pass-off:

```bash
npm run manus:review -- tmp/board-bg-verify/classical-compose --passoff=scripts/manus/passoffs/classical-compose.json
```

### 3 — Fix producer (map findings → code)

| Finding | Fix here |
|---------|----------|
| B1 story beat 3 “missing” | `scripts/manus/review.mjs` `pickImages` — attach all `storyN`; verify S27 |
| B2 inspire glyph | `public/lib/vocabIcons.js` PACK_OVERRIDES; clear icons (no student captions); S26 |
| Aims / grammar | `makeTitle` aims⊆board + `grammarAimLine`; S25/S30/S31 |
| Frame 2 identity | fixture `scripts/fixtures/classical-compose-lesson.json` |
| Story guitar → piano | same fixture + PropBank caption |
| Timing chips | `header(..., { timing })` in renderLessonPages; S29 duration≥45 |
| Soft drop zones | `makeVocab` numbered `data-match-pad`; S28 |
| matchPad → tiny vocab art | `pieceToPng` prefer data:/pad roles before wordArt |
| Wrap palette break | wrap preferFlat=!musicTitle + navy THEME; S32 |
| Mid-deck flat fan-out | `pickFlat` midPool/generic band ≤2; S34 |
| Story L/R thrash | `makeStoryPage` always left; S33 |
| Activity instruction contrast | ink-tagged king title + slate hint; S35 |
| Wrap peer exit | peer-check line; S36 |
| Pass-off / schema | scorecard + just_fixed_results + zpd_challenges |
| Soft codes | `scripts/ux-board-rubric.cjs` S25–S36 |
| Wishlist / skill | `docs/content-wishlist.md`, `.cursor/skills/manus-lesson-review` |

### 4 — Audit

```bash
node scripts/verify-classical-compose.mjs
npm run manus:dry -- tmp/board-bg-verify/classical-compose --passoff=scripts/manus/passoffs/classical-compose.json
```

Confirm: 3 story JPGs; inspire ≠ `inspire.png` starburst; dry-run lists all story pages; numbered pads; no caption chips; update **Last run** below.

## Last run

- **When:** 2026-08-07 (shift21 — live Manus + S33–S37 fold)
- **Base:** verify ok after S33–S37 (midFlat≤2, story L lock, ink hints, peer exit, no match captions, king timing, wrap Also say)
- **Manus:** live https://manus.im/app/LgtXoJYhXfR7hxq6rf75wR · revise/84 · scorecard 4.2 — body `.cursor/loops/manus-classical-compose/last-response.md`
- **Producer fixes:** matchPiece no caption bake; king timing chip; wrap Also say + peer; midPool≤2; story always-left; S33–S37 gates
- **Audit:** verify ok; manus:dry schema_keys scorecard/zpd; test:bg-picks passed
- **Next live Manus:** after this bake ships (re-send to confirm B1–B3 HOLDS)
