# Visual Asset QA Review Notes: Vocab Pack (Sheets 001 - 075)

**Audit Date:** 2026-08-17  
**Scope:** Review of 75 `pending_visual` vocab contact sheets (`07-vocab-pack-vocab-icon-generated-001.jpg` through `07-vocab-pack-vocab-icon-generated-075.jpg`), covering 2,250 vocabulary icon assets.

---

## 1. Summary Counts

| Category | Total Assets | PASS | REVIEW | REDO |
|---|---|---|---|---|
| `vocab_icon` (Sheets 001–075) | 2,250 | 2081 | 0 | 169 |
| **Total** | **2,250** | **2081** | **0** | **169** |

### Breakdown by Status
- **PASS**: 2081 (92.5%)
- **REVIEW**: 0 (0.0%)
- **REDO**: 169 (7.5%)

---

## 2. Key Failure Modes Identified (REDO Findings)

Across the 2,250 assets evaluated across 75 contact sheets, visual QA identified four main systemic defect types:

### A. Corrupt Tiles / Misaligned Grid Slices (`bad_crop` / `corrupt_tile`)
Multiple contact sheet generation tiles suffered from grid slicing errors where neighboring assets were split across quadrants, severed by horizontal lines, or bisected into disconnected fragments:
- **Sheet 012 / 026**: `barrier` (tile divided into 4 quadrants)
- **Sheet 026 / 005**: `burrito` (severed right margin)
- **Sheet 029 / 030**: `caravan` (severed into 4 quadrants)
- **Sheet 032 / 001**: `ceiling` (quadrant miscrop)
- **Sheet 037**: `cigarette`, `city`
- **Sheet 039**: `clown`
- **Sheet 040**: `cockpit`
- **Sheet 047**: `court`
- **Sheet 062**: `dumpling`
- **Sheet 064**: `ecosystem`, `ecstasy`, `edition`, `efficiency`
- **Sheet 065**: `election`, `electron`, `element`
- **Sheet 066**: `emperor`, `empire`, `encyclopedia`, `enemy`, `engineering`, `englishman`
- **Sheet 067**: `entertainer`, `enthusiasm`, `enthusiast`, `entry`, `environmentalist`, `era`
- **Sheet 068**: `essence`, `eternity`, `examiner`, `excess`, `exchange-rate`
- **Sheet 069**: `expense`, `extreme-sports`
- **Sheet 070**: `eyesight`, `facility`, `failure`, `fairy`
- **Sheet 071**: `fantasy`, `farming`, `farmland`
- **Sheet 072**: `feast`, `fellow`
- **Sheet 073**: `fifth`, `filling`, `film-maker`, `filter`
- **Sheet 074**: `finding`, `fine`
- **Sheet 075**: `first-lady`, `fitness`

### B. Text Artifacts Rendered Directly on Images (`text_artifact`)
Several generation prompts leaked title text, label words, or captions directly into the rendered graphic image:
- `adore`, `appear`, `appoint`, `alight`, `alter`, `awkward`, `back`, `bagleaf`, `bald`, `ban`, `bare`, `baste`, `begin`, `belly`, `bellyflop`, `beloved`, `bent`, `bet`, `bilingual`, `bill`, `bit`, `bitter`, `blanch`, `blind`, `blocktower`, `blood`, `bloom`, `bold`, `bonus`, `bookcase`, `bookshop`, `boss`, `bound`, `braise`, `break`, `breakdance`, `breeze`, `build`, `cannonball`, `cast`, `charades`, `chase`, `clogdance`, `count`, `crane-bird`, `cut`, `dalmatian`, `dash`, `deckchair`, `dedicate`, `define`, `demand` (typo `demanc`), `demonstrate`, `deny`, `depart`, `deprive`, `derive`, `deserve`, `design`, `dodgeball`, `doggypaddle`, `draw`, `drizzle`, `duckgoose`, `eagle`, `emu`, `eraseboard`, `expand`, `fence-gate`, `ferment`, `fillet`, `find`, `fix`.

### C. Severe Semantic Mismatches / Wrong Concept (`wrong_concept`)
Items where the generated image depicted an entirely different concept from the vocabulary word:
- `airdrum` (Sheet 003): shows woman watering plants
- `airguitar` (Sheet 003): shows harvesting garden vegetables
- `airport gate` (Sheet 003): shows wooden farm gate
- `bell-pepper` (Sheet 015): shows sliced pineapple ring
- `bomb` (Sheet 020): shows child with blue water balloon
- `brush-teeth` (Sheet 024): shows disposable razor
- `bust` (Sheet 026): shows boy opening cardboard box
- `cultivate` (Sheet 050): shows yellow cleaning sponge
- `curry` (Sheet 050): shows blue silicone baking mat
- `decay` (Sheet 052): shows boy ringing bell
- `demolish` (Sheet 054): shows children with hand puppets
- `dial` (Sheet 056): shows toddler washing hair in bathtub
- `die` (Sheet 056): shows flower-decorated photo frame
- `drown` (Sheet 061): shows boy woodworking with hand drill
- `erupt` (Sheet 067): shows burglar climbing into window
- `execute` (Sheet 068): shows people walking in winter coats
- `explode` (Sheet 069): shows chef chopping vegetables
- `falafel` (Sheet 070): shows wooden hairbrush
- `farewell` (Sheet 071): shows cow standing in field
- `fax` (Sheet 072): shows boy drinking from mug

### D. Unreadable Abstractions, Blanks & Vanishing Alpha (`unreadable_abstractions`, `blank`, `bad_alpha`)
- `absolute` (Sheet 001): plain blue sphere with no context
- `address-label` (Sheet 002): blank grey rectangle
- `addressee` (Sheet 002): blank envelope
- `aspect` (Sheet 008): plain translucent cube
- `alarm-clock` (Sheet 003): clock face keyed out / hollow ring
- `borrow` (Sheet 021): plain yellow-orange rectangle
- `canal` (Sheet 028): blue trapezoid
- `capital-letter` (Sheet 029): blank tablet notepad with pencil
- `cavity` (Sheet 031): abstract beige blob
- `chime` (Sheet 035): blank white tile
- `clock` & `clock-wall` (Sheet 039): blank hollow rings without hands or numbers
- `coal` (Sheet 040): empty tile with crosshairs
- `complaint` (Sheet 042): flat hand with grey triangle artifact
- `duty-free-bag` (Sheet 063): bag body keyed out, leaving floating handles

---

## 3. Passing Assets Highlights

Over 93% of the vocabulary icons across sheets 001–075 meet the high standard for ClassIn primary educational materials:
- Clean 3D vector and digital illustration style with soft warm lighting.
- High pedagogical clarity, instantly recognizable to both young learners and ESL teachers.
- Clean transparent alpha cutouts without halos or opaque bounding boxes.
