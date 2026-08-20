---
name: coverageloop
description: >-
  Run Coverage@Demand asset scan. Default: curated dictionary ∩ pack exact keys
  with canonical file verification (honest Manus queue). Use --mode=topics for
  legacy VocabArt topic ladder. Use when the user says coverageloop, /coverageloop,
  asset coverage, Coverage@Demand, or wants a ranked vocab art gap list.
---

# coverageloop

**Default = curated dictionary ∩ pack (canonical).**

- Source of truth: `scripts/data/esl-picturable-source.json`
- Built dict: `scripts/data/esl-picturable-dictionary.json`
- Exact/plural pack keys only; file stem must match key (or whitelist)
- Gaps ranked by demand frequency / reuse / usefulness — not shortest-first

## Commands

```bash
# Seed / refresh curated source (structured extract of words[] + cores only)
node scripts/seed-picturable-source.mjs

# Rebuild flat dictionary + frequency maps
node scripts/build-picturable-dictionary.mjs

npm run coverageloop
# same
npm run coverageloop -- --mode=dictionary

# Legacy topic ladder
npm run coverageloop -- --mode=topics
```

## Scoring (dictionary mode)

| bucket | meaning |
|---|---|
| verifiedCovered | exact/plural key AND file stem === key (or whitelist) |
| unverifiedCovered | exact key but file points elsewhere — not in headline % |
| rankedGaps | no exact pack key — Manus candidates, priority-sorted |

**Coverage@Demand** = `verifiedCovered / dictionarySize`

## Related: open-world discovery

For concepts **outside** the curated dictionary, use `npm run discovery`
(`.cursor/skills/asset-gap-discovery`). coverageloop stays the known-universe
Coverage@Demand scan; discovery does not change this pipeline.

## Residual gap triage

After a dictionary-mode run, classify `rankedGaps` into producer actions at
`tmp/asset-coverage/known-gap-triage.md` (commission / other-pack-key / drop-deny / near-synonym).
Do not loosen pack-exact-match; triage does not edit the dictionary.

Growing the known universe from discovery (pack-verified, not-in-dict) uses
`npm run discovery:promote` — see `.cursor/skills/asset-gap-discovery`.

## Out of scope

- Playwright / board bake
- Firing Manus (identify only)
- Open-world concept mining (see asset-gap-discovery)
