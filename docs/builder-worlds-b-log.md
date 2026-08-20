# Builder worlds — STREAM B (lower half)

Stockpile only. No producer / PropBank / recipe wiring.

- Runner: `scripts/manus/request-builder-worlds-b.mjs`
- Art: `harvested/builder-worlds/<family>/` (PNG — do **not** git-add)
- Tracked: this log + `docs/builder-worlds-b-inventory.json` (local mirror also at `harvested/builder-worlds/b-inventory.json`, gitignored)
- Slot: **1** Manus in-flight under `builder-worlds/` (shared with stream A — B refuses fire if any open run exists)
- Portfolio: lower half of `docs/builder-worlds-portfolio.json` ranked selected set

## Partition

| Family | Rank | Cluster | Play pattern |
|---|---:|---|---|
| bakery-line | 5 | food-service | dough→tray→oven→cool sequence |
| market-stall | 6 | civic-trade | stock stalls under awnings |
| theatre-wings | 7 | perform | dress empty stage with flats/props |
| camping-pitch | 8 | outdoor | pitch tent + ring + trail markers |

Lead (A) owns ranks 1–4: canal-lock, kaiten-belt, beehive-stack, harbor-berth.

## Waves (B fire order)

- bakery-line
- market-stall
- theatre-wings
- camping-pitch

## Kit grammar (every family)

- **base** — one empty full-page landscape play world (~35–50% open band)
- **modules** — board-scale shells / stations kids drag onto the base
- **connectors** — visual join vocabulary (not snap-dependent tiles)
- **tokens** — play-scale objects
- **problems / transform states** — broken↔fixed, empty↔full, messy↔tidy (repair language)

Hard locks: no baked text/letters/numbers/logos; no zoo / amusement / route-tile clones; no Mia/Leo fused; quality default only.

## Novelty notes

- Bakery **shop** stage exists; **production-line** modules do not.
- Marketplace place-wash exists; **stall atoms + awning connectors** do not.
- Theater hall setting exists; **wing/flat kit** does not.
- Forest/camp settings exist; **pitch kit** (pad + peg + collapsed/pitched states) does not.
- Deliberately avoid K5 route tiles, CW biomes, zoo/amusement, recycling-logo risk.

<!-- TOTALS:START -->
## Running totals

| Metric | Count |
|---|---:|
| Tasks | 4 |
| Sheets downloaded | 16 |
| Bases | 4 |
| Modules+connectors | 48 |
| Tokens | 36 |
| Problems/states | 36 |
| RAW | 124 |

## Waves

- **bakery-line** bakery-line — https://manus.im/app/UJyotW6mTuLXfKS2hDCK3Z — sheets 4/4 — cells 31 — done
- **market-stall** market-stall — https://manus.im/app/brppDoNMLNM8fxa3ewzDyb — sheets 4/4 — cells 31 — done
- **theatre-wings** theatre-wings — https://manus.im/app/5MWhbRd4BQRguqpV33wx8b — sheets 4/4 — cells 31 — done
- **camping-pitch** camping-pitch — https://manus.im/app/CkPqqeB2z6VERh6nCEjhjT — sheets 4/4 — cells 31 — done

<!-- TOTALS:END -->

## QA notes

- Stockpile only.
- Free-drag modular — connectors are visual, not REG edge-join tiles.
- Grade: play scale, empty base, no baked labels, problem states readable without text.
- All 4 B families: **16/16** large sheets downloaded (4 each).
- Slot note: first B fire overlapped stream A `canal-lock` because in-flight walk missed `<family>/run.json` (nested-only). Fixed walker before later waves; B itself stayed sequential (1 at a time).
- Sheet filenames from Manus may permute modules/tokens/problems order; keys.json remains source of truth for cell lists.
