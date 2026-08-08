# Asset coverage map — prop pack (`09_props`)

Read-only scan of `public/assets/09_props/manifest.json` on **2026-08-08**, bucketed by
`pack` and cross-referenced against the ESL B1 topics we've been generating (Manus
batches 1–3). Purpose: steer future batches, stop us regenerating mature packs, and
show where a lesson genuinely has nothing to draw from.

> Snapshot: **943 props across 31 packs** (the manifest was being actively written by
> another worker when this was scanned — counts are a point-in-time read and may drift a
> few rows). Source dump: `tmp/manifest-buckets.txt`.

## Legend
- **MATURE** — deep pack, actively over-covered. **Do not regenerate.** Only add a named gap.
- **COVERED** — enough breadth to build a lesson without a fallback.
- **THIN** — coverage exists but is scattered (mostly `(no-pack)` singletons) or shallow; a small top-up sheet would help.
- **MISSING** — no real prop support; a lesson on this topic falls back to emoji/scene.

---

## MATURE — hands off (regenerating these is wasted spend)

| Pack | Count | Notes |
|------|-------|-------|
| `castle` | 81 | Full medieval build kit (walls, towers, banners, knights). Fantasy/story is set. |
| `gashapon` | 77 | Prize/toy capsules — doubles as the **toys-games** pack. |
| `space` | 73 | Hero modules + sharp docks (shift-added). Space is done. |
| `animals` | 66 (+10 kenney) | Farm/zoo/pet/ocean animals, many with `-b` variants. |
| `aquarium` | 58 | Ocean/reef build kit (fish, coral, shells, wrecks). Covers **ocean**. |
| `tree` | 55 | Nature/park build kit (canopies, branches, critters). |
| `music` | 51 | Instruments + musicians + compose desk. Covers **musical-instruments**. |
| `dollhouse` | 33 | Room furniture — covers **house-furniture** with the `(no-pack)` home set. |

These 8 packs are ~63% of all props. If a future batch proposes "more castle / more space /
more animals," push back unless it names a specific missing item.

---

## COVERED — solid, build-ready

| Topic (batch list) | Pack(s) | Count | Status |
|--------------------|---------|-------|--------|
| weather | `weather` | 20 | COVERED — sun→tornado, hot/cold, snowman. |
| animals / farm animals / ocean animals | `animals` | 66 | MATURE. |
| sports | `sports` + `sport-*` | 28 | Over-covered (two naming waves: `sport-` and `sports-`). |
| space | `space` | 73 | MATURE. |
| musical-instruments | `music` | 51 | MATURE. |
| house-furniture | `dollhouse` + home `(no-pack)` | 33+ | COVERED. |
| ocean | `aquarium` | 58 | MATURE. |
| fantasy | `castle` + `storytelling` (5) + gashapon dragon/unicorn/wand | 86+ | MATURE via castle. |
| toys-games | `gashapon` | 77 | MATURE. |
| clothing | `clothes` | 20 | COVERED (boots→swimsuit, gloves/tie/belt). |
| food-meals | `food` | 16 | COVERED. |
| kitchen | `kitchen` (13) + `cooking` (6) | 19 | COVERED. |
| garden | `garden` | 14 | COVERED. |
| science-lab | `science` | 14 | COVERED. |
| tools | `tools` | 14 | COVERED. |
| camping | `camping` | 12 | COVERED. |
| train-station | `station` | 12 | COVERED. |
| hospital / health | `hospital` (11) + dental & medical `(no-pack)` | 30+ | COVERED (dental is very deep). |
| jobs / community helpers | `jobs` | 22 | COVERED (chef→vet, +helmets/badges). |
| family / people | `family` (16) + `face-*` kit `(no-pack)` | 40+ | COVERED. |
| feelings | `feelings` | 16 | COVERED. |
| transport / vehicles | `vehicles` (16) + `transport` (6) | 22 | COVERED (two waves — see note). |

---

## THIN — coverage is scattered; a small targeted sheet would pay off

| Topic | What exists today | Gap |
|-------|-------------------|-----|
| **office-stationery** | `(no-pack)` singletons: pencil, eraser, eraser-block, sticky-note, file-folder, magazine-file, clipboard, pencil-pot, mini-whiteboard | No pack, no stapler/scissors/tape/paperclip/calculator/folder-tray/desk-lamp. A 4×4 office sheet would consolidate. |
| **drinks** | food-juice-box, food-milk, milk-carton, plastic-cup, water-bottle, sports-water-bottle | No hot drinks (tea/coffee/mug), soda can, bottle, glass, straw, jug. |
| **bags-accessories** | backpack, bag-satchel, suitcase(+vintage), gashapon-handbag, clothing gloves/belt/tie/sun-hat, glasses, hat-beanie, scarf | Scattered `(no-pack)`. No purse, wallet, watch, jewelry, umbrella-as-accessory, sunglasses (weather-sunglasses only). |
| **winter** | weather snow/snowflake/snowman/cold, season-winter, clothes coat/scarf/boots, tree-canopy-winter | Coverage exists but scattered — no sled, mittens, ice skates, hot-cocoa, icicle, snowball as a set. |
| **restaurant** | `cafe` (1: cafe-counter-stage), `food` (16), cafeteria `(no-pack)`: lunch-tray, napkin-stack, plastic-cup, fork/spoon | Only 1 `cafe` prop. No menu-prop, plate, bowl-served, waiter tools, till, table setting. |
| **fruits-veg** | food apple/banana/orange/grapes, garden-cactus/sunflower/rose | Fruit-only + food-style. No vegetables (carrot, tomato, potato, broccoli, corn) as props. |
| **hobbies** | game-controller, camera, music pack, sports pack, kite | Diffuse — no dedicated hobby objects (paintbrush art, chess, knitting, gardening-as-hobby, photography kit). |
| **beach** | aquarium set, sport-surfboard/sand-bucket, weather-sunglasses | As a *prop* topic it's thin: no beach ball (gashapon only), towel, sunscreen, bucket+spade set, deckchair, flip-flops. |
| **farm (structures)** | animals tagged `farm` (59), vehicle-tractor, gashapon-tractor | Animals are deep but no farm *structures/objects*: barn, silo, hay bale, fence, scarecrow, tractor-as-prop, egg basket. |
| **daily-routines** | `routines` (4: brushing-teeth, packing-bag, reading-bed, waking-up) | Only 4. Shallow for a routines/time unit. |
| **time / calendar** | wall-clock, stopwatch, hourglass, station-clock, kitchen-timer, station-pocket-watch | Present but scattered `(no-pack)`; no calendar, alarm-clock, watch-face set. |

---

## MISSING — a topic lesson here has essentially no prop support

| Topic | Why it's missing | Suggested batch |
|-------|------------------|-----------------|
| **city-buildings (modern)** | Only `castle` (medieval). No house/apartment/shop/school/hospital/skyscraper building props. | 4×4 city buildings sheet (house, flat, shop, school, hospital, bank, library, station). |
| **tech-gadgets** | Only game-controller, remote-control, camera, dh-phone-rotary scattered. | 4×4 tech sheet (laptop, phone, tablet, headphones, TV, smartwatch, console, charger). |
| **art-craft** | school-art-palette + dh-easel only. | 4×4 craft sheet (paintbrush, scissors, glue, crayons, paper, palette, clay, easel). |
| **bathroom-toiletries** | dh-bathtub + dental toothbrush/toothpaste only. | 4×4 bathroom sheet (sink, toilet, towel, soap, shower, mirror, toothbrush-cup, shampoo). |
| **body-parts** | face-kit covers the face; no full-body part props (arm, leg, hand, foot). | Consider a labeled body diagram instead of cutouts. |
| **shopping / money** | supermarket is a *background* only; gashapon-coin/moneybag are toys. | 4×4 shopping sheet (cart, basket, till, price tag, coins, notes, receipt, bag). |

---

## ESL B1 topics beyond the batch list worth a coverage check
These weren't in the batches-1–3 list but come up in B1 units; noting so a future scan doesn't
assume they're handled:
- **directions / prepositions** (arrows exist: arrow-pointer, pointer-stick — probably enough)
- **nature / plants** beyond garden (tree pack covers a lot)
- **classroom** (school=5 + globe/backpack/pencil `(no-pack)` — borderline COVERED)
- **money / finance** (see shopping above — MISSING as props)
- **jobs** already deep (22) — no action.

---

## Two data-quality flags for the producer (not urgent, not this shift)
1. **Duplicate naming waves.** `sport-*` (11) and `sports-*` (17) coexist; `vehicle-*` (16) and
   `transport-*` (6) overlap conceptually. Not broken, but the picker/dedup should treat these as
   one topic so a future batch doesn't re-add a third "car."
2. **174 `(no-pack)` props.** A big chunk of real coverage (home, dental, face-kit, hair, park,
   playground, cafeteria) has no `pack` tag, so a naive "which packs are thin?" scan *understates*
   coverage. When the manifest-owner is free, back-filling `pack` on these would make future
   coverage scans (and demand tooling) accurate. Logged here rather than fixed — manifest is
   collision-locked this shift.

---

## Bottom line for the next Manus batch
- **Skip:** castle, space, animals, aquarium, tree, music, gashapon, sports, weather, clothes,
  jobs, feelings, family, hospital/dental, kitchen, science, tools, camping, station, garden,
  vehicles, food. These are done.
- **Top-up (small sheets):** office-stationery, drinks, bags-accessories, winter set, restaurant,
  fruits-veg (veg), farm structures, daily-routines, beach props.
- **Net-new (highest value):** city-buildings, tech-gadgets, art-craft, bathroom-toiletries,
  shopping/money.
