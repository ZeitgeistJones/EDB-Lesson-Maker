# Visual Asset QA Review Notes: Vocab Pack (Sheets 076–150)

**Audit Version:** `2026-08-17-v1`  
**Date:** Monday Aug 17, 2026  
**Scope:** Review of 75 `pending_visual` QA contact sheets (`07-vocab-pack-vocab-icon-generated-076.jpg` through `-150.jpg` inclusive) covering **2,250 vocabulary icon assets**.  
**Decisions File:** `audit/visual-assets/decisions-vocab-076-150.jsonl`

---

## 1. Summary Counts

| Category | Total Assets | PASS | REVIEW | REDO | Pass Rate |
|---|---|---|---|---|---|
| **Vocab Icons (Sheets 076–150)** | **2,250** | **2103** | **3** | **144** | **93.5%** |

- **PASS:** 2103 (93.47%)
- **REVIEW:** 3 (0.13%)
- **REDO:** 144 (6.40%)

---

## 2. Recurring Failure Modes (REDO Findings)

Visual inspection of contact sheets 076 through 150 identified several distinct systemic failure patterns:

### A. Baked-In English Text & Title Overlays (`text_artifact`)
A significant portion of failures occurred when the image generator baked the target vocabulary word directly onto the illustration or canvas base:
- `flee` (Sheet 076): Text "flee" printed at bottom.
- `flossdance` (Sheet 077): Text "Flossdance" printed under boy dancing.
- `follow`, `fond`, `foolish`, `forbidden`, `forecast` (Sheet 078): Words printed under subjects.
- `formal`, `former`, `fortunate`, `foursquare` (Sheet 079): Labels embedded at bottom of cards.
- `frequent`, `frighten` ("BOO!"), `frozen` (Sheet 080).
- `full-time`, `future`, `gaga` (Sheet 081).
- `gallop` (Sheet 082), `gay`, `generous`, `genetic`, `geographical` (Sheet 083).
- `giant`, `gifted` (Sheet 084), `goalie` (Sheet 085).
- `hawk`, `hay-bale-icon`, `header` (Sheet 093), `hedgetrim` (Sheet 094).
- `hide`, `hidenseek` (Sheet 095), `hitch`, `holepunch` (Sheet 096).
- `hotpotato`, `hoverboard` (Sheet 098), `hummingbird` (Sheet 099).
- `ice`, `icescoop`, `icicle` (Sheet 100), `jog` (Sheet 106), `julienne` (Sheet 107).
- `kickball` (Sheet 108), `layup` (Sheet 111), `lead` (Sheet 112), `lengthen` (Sheet 113).
- `lighten`, `limbo` (Sheet 114), `magnify` (Sheet 118), `march` (Sheet 119), `marionette` (Sheet 120).
- `mess` (Sheet 122), `monkeybar` (Sheet 125), `moonwalk`, `moor` (Sheet 126), `mowlawn` (Sheet 127).
- `mumble`, `musicalchairs`, `mutter` (Sheet 128), `navigate` (Sheet 129), `ollie` (Sheet 133).
- `oppose` (Sheet 134), `ostrich`, `outgrow` (Sheet 135), `overtake` (Sheet 136).
- `pelican` (Sheet 141), `pivot` (Sheet 145), `playground` (Sheet 147), `pole` (Sheet 148).

### B. Severe Image Splitting & Tile Slicing Artifacts (`artifact`)
Several generation tiles suffer from split panels, dividing cross lines, and floating severed fragments:
- `flavor` (Sheet 076): Stray vertical line and severed mini icon artifact.
- `flu` (Sheet 077), `folk`, `fondness` (Sheet 078), `format`, `formula`, `fortnight` (Sheet 079).
- `gall`, `gallon`, `gap`, `garment` (Sheet 082).
- `gauze-roll`, `gene`, `general`, `gentleman`, `geography` (Sheet 083).
- `gesture` (Sheet 084), `gloves-latex`, `glue` (Sheet 085).
- `har-gow` (Sheet 092), `hockey` (Sheet 096), `ice-pack-aid` (Sheet 100), `incisor` (Sheet 101).
- `indefinite-article` (Sheet 102), `kayak-paddle`, `kebab` (Sheet 107), `king` (Sheet 108).
- `lips` (Sheet 115), `melon` (Sheet 122), `molar` (Sheet 125), `mug` (Sheet 128).
- `olive` (Sheet 133), `panther` (Sheet 138), `pathway` (Sheet 140), `pearl` (Sheet 141), `port` (Sheet 149), `poster` (Sheet 150).

### C. Semantic Mismatches & Wrong Concept Depictions (`wrong_concept`)
Several vocabulary words were generated with completely incorrect subject matter:
- `fluent` (Sheet 077): Depicts water pouring from pitcher (confusing liquid fluid with fluent speech).
- `flunk` (Sheet 077): Mother bandaging scraped knee (first aid instead of failing exam).
- `freak`, `free` (Sheet 079): Carpentry / wormy rotting apple.
- `grandchild`, `grandson` (Sheet 087): Toy building block cube / yellow toy car.
- `guacamole` (Sheet 089): Soap bar in dish.
- `haunt`, `heal`, `heap` (Sheet 093): Child knocking down block tower / saving money in piggy bank / climbing stool.
- `host`, `hostess` (Sheet 098): Empty wooden tray / easel signboard.
- `hummus`, `hush` (Sheet 099): Shampoo bottle / wilting flower.
- `illuminate`, `immerse`, `imprison` (Sheet 101): Connecting power plug / pressing car on dry table / boy playing with blocks.
- `indent` (Sheet 102): Boy sharing apple.
- `killing` (Sheet 108): Burning candle in candlestick holder.
- `lantern-bug` (Sheet 110): Hurricane oil lamp instead of fulgorid insect.
- `lie` (Sheet 113): Blank box.
- `mount` (Sheet 127): Farmer feeding chickens.
- `naan`, `nachos` (Sheet 129): Toilet paper roll / tube of cosmetic lotion.
- `olive-slice` (Sheet 133): Whole green bell pepper.
- `pair` (Sheet 137): Girl watering plant.
- `paper` (Sheet 138): Blank canvas with crosshairs.
- `pineapple-ring` (Sheet 145): Shredded noodles / cheese.
- `pizza-box` (Sheet 145): Sliced black olive rings.
- `pizza-cutter` (Sheet 145): Cardboard takeout pizza box.

---

## 3. Pedagogical Quality Highlights (`PASS`)
The vast majority (**93.5%**) of inspected assets provide clear, colorful, highly engaging vector and illustrative representations suitable for ESL learners and young children, including:
- Concrete objects and animals: `flamingo`, `flea`, `flip-flops`, `fox`, `frog`, `goldfish`, `gorilla`, `hamster`, `hedgehog`, `koala`, `lion`, `marmot`, `narwhal`, `otter`, `peacock`, `platypus`, `polar-bear`.
- Action verbs and everyday concepts: `fold`, `gargle`, `gather`, `giggle`, `knead`, `knit`, `listen`, `mop`, `pack`, `pat`, `peel`, `pinch`, `playdough`, `pour`, `praise`.
- Food, tools, classroom materials, and cultural icons with crisp transparent presentation.
