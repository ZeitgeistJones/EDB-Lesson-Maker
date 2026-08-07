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

### 2 — Manus

```bash
npm run manus:review -- tmp/board-bg-verify/classical-compose --passoff=scripts/manus/passoffs/classical-compose.json
```

Cached body: `.cursor/loops/manus-classical-compose/last-response.md`

### 3 — Fix producer (map findings → code)

| Finding | Fix here |
|---------|----------|
| inspire stand-in | dedicated `inspire.png` + verify requires it (not brain) |
| orchestra story stands | `storyFallbackVisual` musician-* first; S38 |
| skipKing no write area | frosted write strip; S39 |
| peer clipped | peer above cards + wrapPeerOnBoard gate |
| caption chips re-ask | reject — S26 / passoff knownIssues |

### 4 — Audit

```bash
node scripts/verify-classical-compose.mjs
```

## Last run

- **When:** 2026-08-07 (manusloopx2 pass 1/2)
- **Base:** verify ok after assetgap (inspire.png; musician-piano story1)
- **Manus:** live https://manus.im/app/RWiYXgfxTfhAFVLakM8rC8 · revise · score 4 · scorecard overall 4.0 — body `.cursor/loops/manus-classical-compose/last-response.md`
- **Producer fixes:** S38 orchestra musicians; S39 skipKing write strip; peer on-board; keyed inspire alpha; reject caption-chip reopen
- **Audit:** verify ok (story2=musician-conductor, prodWrite, wrapPeerOnBoard)
- **Pass 2:** pending rebake + live Manus
