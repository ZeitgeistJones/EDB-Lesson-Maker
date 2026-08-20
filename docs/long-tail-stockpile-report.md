# Long-tail stockpile report

Stockpile only. No producer, recipe, Capacity, UI, C1/C2, or renderer wiring. Visual-grammar harvest at `23361b9b` was treated as **existing inventory** and was not regenerated.

## How this was classified

Live exact-key audit (not filename-only fuzzy):

| Universe | Count |
|---|---:|
| `07_vocab-pack` stems | 6736 |
| `09_props` keys | 5382 |
| harvested `keys.json` cells | 1115 |
| `08_backgrounds` keys | 80 |
| Strict probe of 236 long-tail/state/setting/dressing/role/pose/system lemmas | 96 covered / 140 miss |
| Candidates in `scripts/manus/long-tail-keys.mjs` | 259 |

Semantic dedupe: everyday kitchen tools, common whole fruit/veg, H1 poses, H4 roles, H5 lamp/bag/plug, EDB settings classroom→pool, and visual-grammar overlays were **HAVE_ENOUGH / LOW_VALUE**. One example ≠ a family: mailbox flags, paper-fold variants, registered state pairs, and civic **stages** (not vocab icons) were still commissioned.

SAFETY_SKIP uses **word-boundary** matching only. Zero keys skipped at fire.

## Totals

| Metric | Count |
|---|---:|
| Concepts audited (ledger candidates) | 259 |
| Existing coverage (HAVE_ENOUGH) | 81 |
| Strict live-pack hits in the 236-lemma probe | 96 |
| Net-new concepts selected (MANUS_WORTHY) | 172 |
| Variant concepts selected | 9 (kimono/sari/sombrero/turban/dungarees/flip-flop + origami/plane/boat) |
| State-family concepts (core C) | 12 + extra lt5 pairs |
| CODE_LATER | 2 |
| LOW_VALUE | 4 |
| Manus sheets generated | 41 across lt1–lt9 (lt8=2, lt9=6 added as shift fill) |
| PASS (inventory rows after visual QA) | 162 |
| HOLD | 10 |
| Locally recovered sheets (white→black) | 8 |
| Regenerated | 0 |
| Safety skips | 0 |
| Failures (tasks that returned no large PNG) | 0 |

## Per family

| Family | Considered | HAVE | MANUS | CODE | LOW |
|---|---:|---:|---:|---:|---:|
| long-tail-vocab | 83 | 65 | 18 | 0 | 0 |
| variant-banks | 10 | 1 | 9 | 0 | 0 |
| state-families | 17 | 3 | 12 | 0 | 2 |
| setting-drops | 16 | 4 | 12 | 0 | 0 |
| scene-dressing | 14 | 1 | 13 | 0 | 0 |
| role-depth | 9 | 3 | 6 | 0 | 0 |
| story-poses | 9 | 3 | 6 | 0 | 0 |
| obscure-systems | 26 | 1 | 21 | 2 | 2 |
| next-direction | 32 | 0 | 32 | 0 | 0 |
| shift-fill | 43 | 0 | 43 | 0 | 0 |

## Manus tasks

| Wave | Task | Sheets | Concepts |
|---|---|---:|---:|
| lt1-vocab-variants-states | https://manus.im/app/MXtUJuFJjDaQeh8FHNKjTU | 5 | 45 |
| lt2-dressing-obscure-cast | https://manus.im/app/T95mSyBVi59oZxnpi5oUjd | 5 | 40 |
| lt3-thin-settings | https://manus.im/app/VxfjqiYHSgsSYcq5UFRmPc | 6 | 12 |
| lt4-next-direction | https://manus.im/app/edhMajJb2PEmHKwYvGGzp4 | 6 | 32 |
| lt5-extra-states-dressing-obscure | https://manus.im/app/iXg5ZuWj6hyaHqa9Actf89 | 3 | 27 |
| lt6-civic-stages | https://manus.im/app/JjMoFe2sLmoHcWRsTLtJeA | 4 | 8 |
| lt7-play-craft-stages | https://manus.im/app/2W8ForwaWPS3itBpu5vYbN | 4 | 8 |
| lt8-more-states-objects | https://manus.im/app/DCdDBFRcQm8dnuUomH2iEN | 2 | 18 |
| lt9-youth-civic-stages | https://manus.im/app/LFuohG9fhLHHi8FGrnoVuR | 6 | 12 |

## Durable paths

- Stockpile: `harvested/manus-long-tail-stockpile/`
- Inventory: `docs/long-tail-stockpile-inventory.json`
- Keys: `scripts/manus/long-tail-keys.mjs`
- Runner: `scripts/manus/request-long-tail-harvest.mjs`

## TOP 10 most interesting obscure gaps found

1. **Food anatomy leftovers** — husk / kernel / cob / rind / egg-white; pack had whole foods and `yolk`, not parts.
2. **Plant-protein + grain bowls** — tofu, tempeh, quinoa, couscous, lentil, chickpea exact misses.
3. **Cultural garment still-lifes** — kimono, sari, sombrero, turban, dungarees, flip-flop.
4. **Paper-fold sibling set** — crane / airplane / boat as a craft family.
5. **Registered everyday states beyond H5** — padlock, glass, balloon, flashlight, banana, shoelace, fold, chip-cup.
6. **Civic setting drops EDB never listed** — laundromat, hardware, marketplace, ferry deck, florist, recycling, then bakery/barbershop/pharmacy/marina.
7. **Mess / lost-item dressing** — crumbs, spill, stain, leftovers, tear, wrinkle, tangled earphones, muddy print.
8. **Life-cycle + habitat micro-objects** — chrysalis, spawn, lichen, succulent, sea-urchin, anthill, spiderweb, formicarium, wormery.
9. **Accessibility geometry** — curb-cut, wheelchair-ramp, split footprints (Manus merged L/R — HOLD).
10. **Simple-machine leftovers + textile tools** — piston, inclined plane, coil spring, spinning wheel, drop spindle, pinking shears.

## TOP 5 new asset classes that were thinner than expected

1. Ingredient-part / leftover anatomy vs whole-food saturation
2. Matched object-state pairs after H5’s three cells
3. Isolated story mess / lost-item dressing
4. Civic/service **stages** (vocab icons existed for museum/attic/garage; interaction floors did not)
5. Print / track / accessibility fragments

## TOP 5 areas that now look saturated

1. Common kitchen tools (ladle, colander, rolling pin, …)
2. Mainstream whole fruit/veg
3. Pre-A1–B2 visual-OS stockpiles + visual-grammar overlays
4. Horizontal H1 poses / H4 core roles / H5 three state pairs
5. EDB setting list classroom → swimming pool

## HOLD (do not treat as ready cutouts)

- `cob` — whole ear, not bare cob
- `egg-white` — wrong still-life
- `nectarine` — peachy
- `horseshoe` — magnet-like
- `footprint-left` / `footprint-right` — merged cell
- `recycling-center-a/b` — baked recycling pictograms
- `clinometer` — metronome drawn instead
- `pose-cross-street` — baked STOP letters

## QA notes

- Several Manus sheets arrived on white plates. Local `scripts/sheet-white-to-blackfield.mjs --in-place` on 8 sheets (lt1 02–04, lt2 01/04/05, lt4 01/03). `.orig.png` kept beside them.
- Numbered `01.png` order is **filename sort**, not S1–Sn. Use each wave `keys.json` + raw names.
- Extra unrequested cells (beans/potatoes, duplicate states, extra mailbox, ferry third panel, extra pose cells) are ignored — not PASS, not regenerated.
- lt5 dressing sheet visually matches requested dressing atoms (sticky note, paperclip chain, faucet drip, leaf pile, bootprint, sprout, wilted bouquet, tangled earphones, steam kettle).
- lt6 bakery and lt7 bowling reads as usable interaction stages with open floor.

## Next best stockpile direction if Manus is still cheap

Blank **classroom manipulatives and access systems**: braille cell with no letters, rekenrek / cuisenaire, white cane, canal-lock stage, observatory deck, clothing states already started (zip/button/umbrella). Skip another fruit bowl. Split-footprint mop if we need L vs R as two keys.
