# manus-classical-compose

type: manusloop  
case: classical-compose  
repo: `C:\dev\PPT-Lesson-Maker-for-Classin`

Re-runnable: `/manusloop run manus-classical-compose`

## Product intent

ClassIn ESL producer for classical-compose / “Writing a Symphony for the Orchestra”. Fix machinery, not one-off PNGs.

## Stages

### 1 — Base
```bash
node scripts/verify-classical-compose.mjs
```

### 2 — Manus
```bash
npm run manus:review -- tmp/board-bg-verify/classical-compose --passoff=scripts/manus/passoffs/classical-compose.json
```
Body: `.cursor/loops/manus-classical-compose/last-response.md`

### 3 — Fix map
| Finding | Fix |
|---------|-----|
| inspire stand-in | dedicated inspire.png |
| orchestra stands | musician-* prefer; S38 |
| no write strip | skipKing prod write; S39 |
| peer clipped | peer above cards + on-board gate |
| caption chips re-ask | reject (S26) |

### 4 — Audit
```bash
node scripts/verify-classical-compose.mjs
```

## Last run

- **When:** 2026-08-07 (manusloopx2 complete — 2/2)
- **Pass 1:** https://manus.im/app/RWiYXgfxTfhAFVLakM8rC8 · revise · score 4 · overall 4.0 → folded S38/S39 + peer on-board
- **Pass 2:** https://manus.im/app/3Jr6xcP5fCbDXVupySAJ8V · **pass** · score 99 · overall 4.96 · all just_fixed HOLDS · no gate_holes
- **Audit:** verify ok
- **ZPD logged:** abstract vocab stress test; two-round production (wishlist open)
- **Soft defer:** music dock +10–15% scale (risk dropping thin musicians)
