---
name: asset-gap-discovery
description: >-
  Open-world asset gap discovery: expand picturable ESL concepts outside the
  curated dictionary from domain banks, then score with the same strict pack
  matching as coverageloop. Use when the user says discovery, discovery gaps,
  open-world gaps, asset-gap-discovery, or wants concepts beyond the known
  dictionary universe. Does not commission Manus art or auto-merge the dict.
---

# asset-gap-discovery

**Discovery = open world. coverageloop = known universe.**

| Pipeline | Universe | Question |
|---|---|---|
| `npm run coverageloop` | Curated dictionary ∩ pack | Which **known** words still need art? |
| `npm run discovery` | Domain banks outside the dict | Which **new** picturable concepts are missing? |

## Commands

```bash
# (Re)seed domain JSON banks under scripts/data/discovery-universe/
npm run discovery:seed

# Full open-world scan (≥5 rounds) — includes semantic provenance scrub
npm run discovery

# Gaps-only JSON buckets (still writes ranked-gaps.txt)
npm run discovery:gaps

# Three Manus-ready queues (broad / specialized / needsReview) — does NOT send Manus
npm run discovery:scrub

# Commission scrubbed broad + specialized (skips needsReview + hug/kids/parents/circle)
npm run manus:scrubbed-queues          # dry-run plan
npm run manus:scrubbed-queues:send     # spends Manus credits

# Picturable ACTION VERBS (white 3×3, Perfect-11) — pack-exact missing only
npm run manus:picturable-verbs         # wave1 dry-run
npm run manus:picturable-verbs:send
npm run manus:picturable-verbs-w2      # wave2 dry-run
npm run manus:picturable-verbs-w2:send
npm run manus:picturable-verbs-w3      # wave3 dry-run
npm run manus:picturable-verbs-w3:send
# Import later: same white vocab sheet path as scrubbed queues → 07_vocab-pack

# After Manus PNGs land (white 3×3 vocab → 07_vocab-pack)
npm run assets:import-scrubbed-queues
# Then refresh in THIS order (scrub reads coverageloop gaps):
npm run discovery && npm run coverageloop && npm run discovery:scrub
```

### Semantic provenance (producer gate)

Before demand / cross-domain points count, each `concept ↔ topic` pair is graded
`strong | reasonable | weak | invalid` (`scripts/lib/discovery-semantic-provenance.mjs`).

Only **strong/reasonable** raise `topicCount`. Weak/invalid pairs do not.
If a candidate has no valid provenance → `needsReview` (not the Manus queue).

Bank-sweep no longer round-robins onto unrelated titles; orphans go to
`{domain} inventory` without demand credit.

Cluster saturation lightly demotes later items from the same niche when ranking.


## What it does

1. Loads pack-blind domain banks (`scripts/data/discovery-universe/*.json`)
2. Runs ≥5 specialty rounds (habitats/food → trades/medical → archaeology → labs/music → factories/emergency)
3. Builds cumulative candidates with provenance `{ word, topics[], topicCount, domainCount }`
4. Classifies with **only** `scripts/lib/pack-exact-match.mjs` (no aliases / PropBank / glyphs)

**topicCount (hardened):** counts unique *meaningful* base-domain topics where the word
actually belongs (token/tag match or bank-sweep home), plus at most **2** meaningful
cross-product topics. Flavor-only fillers and habitat×food concept dumps do **not**
inflate ranking. `rawTopicAttachments` is provenance-only.

| Bucket | Rule |
|---|---|
| alreadyKnownCovered | in curated dict AND verified canonical pack |
| knownGap | in curated dict AND no verified pack |
| newCoveredConcept | not in dict AND verified canonical pack |
| newDiscoveryGap | not in dict AND no verified pack |
| needsReview | fails picturable heuristics (`abstract`, `multi-sense`, frames, junk, …) |

**needsReview gates (Track B3):** `failsHeuristics` in `asset-gap-discovery.mjs` sends abstract/process lemmas, a small multi-sense junk set (`plane`/`press`/`mold`/`phillips`/…), function words, and digit/underscore noise to `needsReview` so they do not rank as discovery gaps. Clear dual-reads that stay kid-picturable (`bat`, `cap`, `heart`, `drum`) are **not** blocked. Pottery **glaze** and kitchen **yeast** stay discoverable (not abstract). `seed-discovery-universe.mjs` mirrors the same deny list at bank write (`SEED_DENY`) so reseeds do not reintroduce that junk.

## Outputs

- `tmp/asset-discovery/latest.json` — totals, buckets, ranked gaps, round stats, recommendations
- `tmp/asset-discovery/ranked-gaps.txt` — one `newDiscoveryGap` per line
- `tmp/asset-discovery/history.jsonl` — append-only run log

`recommendedDictionaryAdditions` is a **suggestion list only**. Never auto-merge into `scripts/data/esl-picturable-source.json`.

| `readiness` | Meaning |
|---|---|
| `dict-promotion` (`readyForDictMerge: true`) | `newCoveredConcept` — verified pack art, not in dict; OK to consider for source merge |
| `art-queue-only` (`readyForDictMerge: false`) | `newDiscoveryGap` — high-signal gap for art queue; **not** ready to merge as a dict word |

Dict-promotion rows are listed first. Do not treat art-queue rows as dictionary additions.

## Manual promote (curated extras)

High-confidence `newCoveredConcept` only (skips needsReview, gaps, ambiguous, niche):

```bash
npm run discovery:promote          # dry-run → tmp/asset-discovery/promote-covered-report.json
npm run discovery:promote:apply   # append into esl-picturable-source.json extras
node scripts/build-picturable-dictionary.mjs
npm run coverageloop
```

## Out of scope

- Changing coverageloop / dictionary coverage behavior
- Firing Manus or commissioning art
- Auto-editing the curated picturable source
