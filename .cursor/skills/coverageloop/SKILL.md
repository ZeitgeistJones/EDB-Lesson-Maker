---
name: coverageloop
description: >-
  Run Coverage@Demand asset scan (VocabArt.planFor / PropBank, sync only). Use when
  the user says coverageloop, /coverageloop, asset coverage, Coverage@Demand, or
  wants a ranked vocab art gap list without baking boards or firing Manus.
---

# coverageloop

Trendable **Coverage@Demand** benchmark. Identifies pack/prop/glyph gaps for Manus
or in-house — does **not** commission art and does **not** run the board UX bake.

## Commands

```bash
npm run coverageloop
npm run assets:coverage          # alias → coverageloop

# Parallel shards (5 agents — no shared latest.json clobber)
npm run coverageloop -- --shard=1/5
npm run coverageloop -- --shard=2/5
npm run coverageloop -- --shard=3/5
npm run coverageloop -- --shard=4/5
npm run coverageloop -- --shard=5/5

# Filters / custom out
npm run coverageloop -- --topics=soccer-coach,beach,hospital
npm run coverageloop -- --out=tmp/asset-coverage/shard-1.json

# After shards finish
npm run coverageloop:merge
```

## What to do

1. Run `npm run coverageloop` (or a `--shard=N/5` if parallel).
2. Read stdout **Coverage@Demand** (global + per topic). Never expect 100% — trend it.
3. Dump / summarize **ranked gaps** (word, topic, why, art type guess) from
   `tmp/asset-coverage/latest.json` or `tmp/asset-coverage/shard-N.json`.
4. Stop. Hand gaps to a human / wishlist. Do **not** full UX bake. Do **not** fire
   Manus with must-have lists from this loop.

## Scoring

| bucket | meaning |
|--------|---------|
| strong | VocabArt pack or prop |
| ok | curated glyph only |
| gap | none / dropped |
| deny | propPolicy deny — **excluded from denominator** |

`Coverage@Demand = (strong + ok) / (words − deny)`

## Outputs

- Full run: `tmp/asset-coverage/latest.json` + append `history.jsonl`
- Shard run: `tmp/asset-coverage/shard-{N}.json` + `history-shard-{N}.jsonl`
- Merge: `npm run coverageloop:merge` → `latest.json` + history line

## Out of scope

- Playwright / board quality bake
- Visual judge / quality:judge
- Manus commission (identify only)
- `quality: high` eyeball loops
