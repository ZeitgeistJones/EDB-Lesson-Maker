# Builder-worlds portfolio (stockpile only)

Modular **play systems** for future ClassIn boards — not theme-noun dumps.
Art partition: `harvested/builder-worlds/` (PNG/JPG — **do not git-add**).
Tracked: `scripts/manus/request-builder-worlds.mjs`, this doc, `docs/builder-worlds-portfolio.json`, `docs/builder-worlds-log.md`.

No producer wiring. Slot: **1 of 4** global Manus under `harvested/builder-worlds/` (shared A+B — max 1 in-flight).

**Partition:** Stream A (`request-builder-worlds.mjs`) = ranks 1–4. Stream B (`request-builder-worlds-b.mjs`) = ranks 5–8.

## Estate audit (before scale Manus)

| Bank | Class | Note |
|---|---|---|
| BE-K5 town→country route tiles/base | ALREADY_DEEP / in-flight | Modular path system owned by board-enabling; do **not** clone another route kit |
| CW A+B empty biomes + habitat companions | ALREADY_DEEP | Pond/wetland/rainforest/mangrove/reef/tide/grass/tundra — ecosystem worlds exist |
| Aggressive S1 forest/desert/beach/**zoo**/river/cave/island settings | ALREADY_DEEP | Place washes, not modular builders |
| Aquarium / museum / playground settings | ALREADY_DEEP | Room/stage plates; not modular kits |
| CW CDE cutaways (ocean/volcano/buildings/dam/bridge…) | ALREADY_DEEP / PARTIAL | Scene cutaways + object cutaways (S4) — not modular builders |
| Aggressive S4 object cutaways (apple/house/bus…) | ALREADY_DEEP | Still-life cross-sections |
| CW C systems (water/waste/power/food/logistics/city) | PARTIAL | Illustrated systems scenes; thin modular atoms |
| CW c10 network/emergency **route** worlds | PARTIAL | Route *illustrations*, not joinable tile kits (K5 owns modular) |
| JKLM orchestra / dig / marine lab / timeline stages | ALREADY_DEEP | Unique play surfaces already stocked |
| PropBank cast + S4 Mia/Leo + king-stage heroes | ALREADY_DEEP | People/poses/heroes — skip redraw |
| Marketplace / bakery / ferry / marina civic stages | PARTIAL | Empty shop stages exist; **modular stall / berth / belt atoms** still MISSING |
| Builder-world modular kits (this stream) | MISSING | Bases + modules + connectors + tokens + problem overlays |

**Skipped-as-deep (do not manufacture):** route tiles, habitat biomes, zoo enclosure clones, object/building cutaway still-lifes, orchestra wedges, Mia/Leo poses, classroom noun dumps, tiny fasteners.

## Novelty rule (selection)

Prompt-named families (and trivial swaps): **zoo / amusement / route / habitats / cutaways**.

- Selected portfolio: **8 families**
- Prompt-named among selected: **0**
- Novelty % (not prompt-named): **100%**
- Zoo + amusement + route combined share: **0%** (minority satisfied)

## Brainstorm (≥25) — play pattern test

*If theme nouns were scrubbed, would the interaction still be distinctive?*

| # | Candidate | Play pattern (nouns off) | Fate |
|---|---|---|---|
| 1 | Canal lock corridor | Sequence vessel through gated chambers | **SELECT** |
| 2 | Harbor berth apron | Assign craft to slips + load/unload | **SELECT** |
| 3 | Kaiten / circulating dish belt | Circulate plates along a loop; serve/claim | **SELECT** |
| 4 | Beehive stack frames | Stack boxes/frames; inspect contents | **SELECT** |
| 5 | Market stall arcade | Stock awning shells with crates/goods | **SELECT** |
| 6 | Theatre stage wings | Set flats/props on empty stage | **SELECT** |
| 7 | Camping pitch kit | Place tent pad + ring + trail markers | **SELECT** |
| 8 | Bakery production line | Advance dough→tray→oven→cool states | **SELECT** |
| 9 | Ferry loading apron | Queue vehicles onto ramp lanes | RANKED / runway |
| 10 | Ship cargo hold | Stow crates into bay with nets | RANKED / runway |
| 11 | Pet kennel run | Assign animals to stalls | RANKED / runway |
| 12 | Restaurant place-setting | Set plates/cups/cutlery on table pads | RANKED / runway |
| 13 | Library shelf bay | Reshelf books into empty bays | RANKED / runway |
| 14 | Greenhouse grow shelves | Transplant trays onto shelf levels | RANKED / runway |
| 15 | Weather wardrobe line | Hang outfits under weather overlays | RANKED / runway |
| 16 | Puppet booth | Swap scenery cards + puppets | KILL visual-weak / niche |
| 17 | Treehouse platforms | Connect levels with ladders/rope | KILL needs physics/snapping feel |
| 18 | Bridge span tiles | Join piers/spans for crossing | KILL ClassIn-fiddly + overlaps K5 REG |
| 19 | Airport jet-bridge | Dock plane to finger | KILL fiddly scale + brand-airport feel |
| 20 | Zoo enclosure kit | Put animals in pens | KILL ALREADY_DEEP + prompt-named |
| 21 | Dino zoo / safari park | Same as zoo with skins | KILL trivial swap |
| 22 | Amusement ride plaza | Place rides on plaza pads | KILL prompt-named + brand imitation risk |
| 23 | Habitat biome builder | Populate empty biomes | KILL ALREADY_DEEP A+B |
| 24 | Town route tile pack | Join path tiles | KILL K5 owns |
| 25 | Object cutaway wall | Cross-section still-lifes | KILL ALREADY_DEEP S4/CDE |
| 26 | Recycling sort line | Sort into bins | KILL logo/mark risk (cw-c2 HOLD) |
| 27 | Space mission pad | Launch / control panels | KILL brand-sci-fi + weak ESL payoff |
| 28 | Castle wall builder | Stack battlements | KILL branded imitation / weak language |
| 29 | Parking garage ramps | Park cars on levels | KILL route-adjacent + fiddly |
| 30 | Classroom seating planner | Arrange desks | KILL ordinary / fiddly |

## Ranking (selected + runway)

Scores 1–5: play × reuse × distinctiveness × language × hard-to-recreate-later × Manus suitability. **Total /30**.

| Rank | Family | Play | Reuse | Distinct | Lang | Hard later | Manus | Total | Cluster |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | canal-lock | 5 | 4 | 5 | 5 | 5 | 5 | **29** | water-works |
| 2 | kaiten-belt | 5 | 4 | 5 | 5 | 5 | 4 | **28** | food-service |
| 3 | beehive-stack | 5 | 4 | 5 | 4 | 5 | 5 | **28** | nature-craft |
| 4 | harbor-berth | 5 | 5 | 4 | 5 | 4 | 5 | **28** | waterfront |
| 5 | bakery-line | 5 | 5 | 4 | 5 | 4 | 5 | **28** | food-service |
| 6 | market-stall | 4 | 5 | 3 | 5 | 4 | 5 | **26** | civic-trade |
| 7 | theatre-wings | 4 | 4 | 4 | 4 | 4 | 5 | **25** | perform |
| 8 | camping-pitch | 4 | 4 | 4 | 4 | 4 | 5 | **25** | outdoor |
| 9 | ferry-apron | 4 | 4 | 4 | 4 | 4 | 4 | 24 | waterfront |
| 10 | cargo-hold | 4 | 4 | 4 | 4 | 4 | 4 | 24 | logistics |
| 11 | kennel-run | 4 | 4 | 3 | 4 | 3 | 5 | 23 | care |
| 12 | place-setting | 4 | 5 | 2 | 5 | 3 | 5 | 24 | food-service |

## Selected manufacture portfolio (depth first)

| ID | Family | Play pattern | Why novel vs estate | Manus brief outline |
|---|---|---|---|---|
| `bw-canal-lock` | Canal lock corridor | Open/close gates; move boat chamber→chamber | No modular lock atoms; CDE has dam *cutaway* only | 1 empty lock corridor base; chamber/gate modules; water-level overlays; boat tokens; stuck-gate / leak problems |
| `bw-kaiten-belt` | Circulating dish belt | Plates travel a loop; kids claim/serve | No belt-loop builder; cafe settings are rooms | 1 belt-loop base; curve/straight belt modules; dish tokens; spill/empty-plate problems |
| `bw-beehive-stack` | Beehive stack | Stack boxes; pull frames; inspect | No hive modular kit; bee vocab is tokens only | 1 apiary pad base; box/frame modules; bee/comb tokens; cracked-frame / swarm-cloud overlays |
| `bw-harbor-berth` | Harbor berth | Berth boats; load crates | Marina *stage* exists; berth-slip modules do not | 1 quay base; slip/pier modules; bollard/rope connectors; boat+crate tokens; oil-spill / loose-line problems |
| `bw-bakery-line` | Bakery line | Sequence bake states along counters | Bakery *shop stage* exists; production-line modules do not | 1 kitchen-line base; counter/oven modules; dough-state tokens; burn/spill overlays |
| `bw-market-stall` | Market stall arcade | Stock stalls under awnings | Marketplace stage is a place wash | 1 arcade base; stall shells; awning connectors; produce/crate tokens; empty-stall / fallen-awning problems |
| `bw-theatre-wings` | Theatre wings | Dress empty stage with flats/props | Theater setting is empty hall; wing kit missing | 1 stage base; flat/wing modules; prop tokens; wrong-curtain / missing-prop overlays |
| `bw-camping-pitch` | Camping pitch | Pitch tent + ring + markers | Forest/camp settings exist; pitch kit missing | 1 clearing base; tent-pad modules; peg/rope connectors; camp tokens; rain-puddle / fallen-tent problems |

## Kit anatomy (every selected family)

1. **Base** — one full-page landscape play floor (empty enough to receive modules).
2. **Modules** — large board-scale pieces (not miniature fasteners).
3. **Connectors** — board-scale joins (gates, bollards, awning poles, belt curves) — visual abut, **no** snap physics.
4. **Tokens** — furniture / population / goods at play scale (black-field).
5. **Problem / repair overlays** — broken, spill, missing, stuck states (black-field).

Locks: black-field cutouts; no baked text/logos; quality default; stockpile only.

## Fire order

**Stream A:** 1. `canal-lock` → 2. `kaiten-belt` → 3. `beehive-stack` → 4. `harbor-berth`

**Stream B:** 5. `bakery-line` → 6. `market-stall` → 7. `theatre-wings` → 8. `camping-pitch`

Stop if quality fails (wrong field, tiny bits, fused people, baked text). Prefer remop / deepen a strong kit over shallow theme swaps. Only one of A/B may hold the builder-worlds Manus slot at a time.

## Runway (not fired this stream)

ferry-apron, cargo-hold, kennel-run, place-setting, library-shelf, greenhouse-shelves, weather-wardrobe — only after selected 8 are meaningfully stocked.
