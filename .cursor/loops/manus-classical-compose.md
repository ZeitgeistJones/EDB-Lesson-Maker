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

Expect: `ok: true`, `storyPageCount: 3`, page-7-story2 on disk, dry-run `images` lists story0+story1+story2.

### 2 — Manus

Prefer **cached** review unless verify rebake clearly needs a second live pass:

- URL: https://manus.im/app/J4up6tWdwZyWUWP5wLq2pG
- verdict: revise · score: 72
- Cached body: `.cursor/loops/manus-classical-compose/last-response.md`
- Log: `.cursor/ratings/manus-reviews.jsonl` (task_id `J4up6tWdwZyWUWP5wLq2pG`)

Live only after producer fixes + updated pass-off:

```bash
npm run manus:review -- tmp/board-bg-verify/classical-compose --passoff=scripts/manus/passoffs/classical-compose.json
```

### 3 — Fix producer (map findings → code)

| Finding | Fix here |
|---------|----------|
| B1 story beat 3 “missing” | `scripts/manus/review.mjs` `pickImages` — attach all `storyN`; verify S27 |
| B2 inspire glyph | `public/lib/vocabIcons.js` PACK_OVERRIDES; `edbActivities` matchDock captions; `buildEdb` captionedArtPng; S26 |
| Aims / grammar | `public/lib/renderLessonPages.js` makeTitle; S25 |
| Frame 2 identity | fixture `scripts/fixtures/classical-compose-lesson.json` |
| Story guitar → piano | same fixture + PropBank caption |
| Timing chips | `header(..., { timing })` in renderLessonPages |
| Pass-off | `scripts/manus/passoffs/classical-compose.json` |
| Soft codes | `scripts/ux-board-rubric.cjs` S25–S27 |
| Wishlist / skill | `docs/content-wishlist.md`, `.cursor/skills/manus-lesson-review` |

### 4 — Audit

```bash
node scripts/verify-classical-compose.mjs
npm run manus:dry -- tmp/board-bg-verify/classical-compose --passoff=scripts/manus/passoffs/classical-compose.json
```

Confirm: 3 story JPGs; inspire ≠ `inspire.png` starburst; dry-run lists all story pages; update **Last run** below.

## Last run

- **When:** 2026-08-07 (manusloop take-the-wheel)
- **Base:** verify **ok** (pre-fix; 3 story pages on disk; pickImages then dropped story2)
- **Manus:** cached revise/72 (`J4up6tWdwZyWUWP5wLq2pG`) — no live re-spam
- **Producer fixes:** pickImages all stories; inspire→brain + caption chips; aims+grammar; frame/story piano; timing chips; S25–S27; passoff; wishlist
- **Audit:** verify **ok** — storyPageCount=3; inspire=`pack:brain.png`; aimsMissing=[]; pickImages includes story0/1/2; timingChipCount=9; hasMatchCaptions=true
