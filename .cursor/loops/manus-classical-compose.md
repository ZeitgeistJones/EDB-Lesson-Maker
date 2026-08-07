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
| musician dock soft | spare-room +12% (no DOCK_MIN bump) |
| match pads soft | larger DOM pads |
| second conditional label | grammarAimLine; S31 |
| king hint contrast / caption terracotta | frosted kingHintCard + charcoal chips; S40 |

### 4 — Audit
```bash
node scripts/verify-classical-compose.mjs
```
Gates through S40.

## Last run

- **When:** 2026-08-07 (manusloop RUN_COUNT=1)
- **Pass:** https://manus.im/app/bNsAKJdTgbQNTAe6qSFQwr · **pass** · score **100** · overall **5.0** · all just_fixed HOLDS · no gate_holes
- **Pre-send soft:** musician dock +12% spare-room + larger match pads
- **Post-Manus fold:** second-conditional grammar label (S31); frosted king hint + charcoal story captions (S40)
- **Assets:** none (Manus did not call missing/wrong art; assetgap locate: no critical gaps)
- **Audit:** verify ok (fails=[])
- **ZPD logged (not built):** two-round peer eval + composer’s-choice instrument constraint
- **Assetgap:** skipped generate burst — no critical gaps
