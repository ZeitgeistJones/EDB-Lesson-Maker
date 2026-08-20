# Visual Asset QA Review Notes: Story Cast, Action Plates, Role Plates, Pairs & Letters

**Audit Date:** 2026-08-17  
**Scope:** Review of 44 `pending_visual` QA contact sheets covering 641 assets across 5 categories: `story_cast`, `story_action_plate`, `role_plate`, `open_closed_hide_reveal_pair`, and `letters_literacy`.

---

## 1. Summary Counts

| Category | Total Assets | PASS | REVIEW | REDO |
|---|---|---|---|---|
| `story_cast` | 84 | 67 | 3 | 14 |
| `story_action_plate` | 236 | 150 | 1 | 85 |
| `role_plate` | 12 | 4 | 0 | 8 |
| `open_closed_hide_reveal_pair` | 64 | 47 | 2 | 15 |
| `letters_literacy` | 245 | 233 | 0 | 12 |
| **Total** | **641** | **501** | **6** | **134** |

---

## 2. Category Findings & Detailed Notes

### 2.1 `story_cast` (84 assets, 4 sheets)
- **Status:** 67 PASS, 3 REVIEW, 14 REDO
- **Key Issues Identified:**
  - **White Uniform Alpha Vanishing:**
    - `cast-doctor-idle-happy` & `cast-doctor-idle-neutral`: Doctor's white coat completely keyed out/vanished on white background.
    - `cast-chef-idle-happy` & `cast-chef-idle-neutral`: Chef's white uniform and torso completely keyed out/vanished.
    - `cast-waiter-idle-happy` & `cast-waiter-idle-neutral`: Waiter's white shirt/apron eroded into floating head/vest.
    - `cast-referee-idle-happy` & `cast-referee-idle-neutral`: Referee's white/striped jersey completely erased.
    - `cast-worker-idle-happy` & `cast-worker-idle-neutral`: Construction worker's white pants completely missing.
    - `cast-cashier-idle-happy` & `cast-cashier-idle-neutral`: Cashier's legs/pants eroded into hollow holes.
  - **Identity Drift & Character Mismatches:**
    - `cast-officer-idle-happy`: Dressed in civilian tan blazer instead of police uniform (identity drift from `cast-officer-idle-neutral` in blue uniform).
    - `cast-customer-idle-happy` vs `cast-customer-idle-neutral`: Inconsistent outfits/characters (tan jacket vs blue sweater).
  - **Artifacts:**
    - `cast-kid3-idle-happy`: Large vertical grey wall artifact on right edge.
    - `cast-kid3-idle-neutral`: White halo / rough alpha border.
  - **Passes:**
    - `Leo` (all 16 poses across brush, catch, climb, draw, drink, eat, idle, kick) and `Mia` (all 21 poses across brush, catch, climb, draw, drink, eat, idle, kick, run, swim) maintain highly consistent character design and clean alpha cutout.
    - `Farmer`, `Parent`, `Shopper`, `Teacher`, `Vendor`, and `Zookeeper` maintain consistent character design and clean cutouts.
    - `gicon-fossil` and `gicon-trilobite` are clean black icon cutouts.

### 2.2 `story_action_plate` (236 assets, 10 sheets)
- **Status:** 150 PASS, 1 REVIEW, 85 REDO
- **Key Issues Identified:**
  - **Over-Aggressive White Keying / Body Vanishing on White:**
    - `cast-doctor-*` (12 items): All 12 action poses suffer from vanished white lab coats.
    - `cast-chef-*` (12 items): All 12 action poses suffer from vanished white uniforms.
    - `cast-waiter-*` (12 items): All 12 action poses suffer from shredded white aprons/shirts.
    - `cast-referee-*` (12 items): All 12 action poses suffer from vanished white/striped jerseys.
    - `cast-worker-*` (12 items): All 12 action poses suffer from missing/hollow white pants.
    - `cast-cashier-*` (12 items): All 12 action poses suffer from severed/hollow legs.
  - **Customer Identity Drift & Artifact Contamination (Sheet 002):**
    - `cast-customer-listen-happy` displays the purple clerk character instead of customer.
    - `cast-customer-hold-neutral`, `reach-happy`, `reach-neutral`, `talk-happy`, `walk-happy`, `walk-neutral` contain floating severed arm/limb artifacts on canvas edges.
    - `cast-customer-talk-neutral` shows the tan blazer customer seated instead of standing.
  - **Top Bar Artifacts on Leo Action Plates (Sheets 004 & 005):**
    - `cast-leo-listen-happy`, `cast-leo-reach-happy`, `cast-leo-sit-happy`, `cast-leo-talk-happy` have a thick black horizontal bar artifact across the top edge.
  - **Kid3 Artifact:**
    - `cast-kid3-hold-happy` contains a large rectangular grey wall artifact on the right edge.
  - **Passes:**
    - `Mia` (all 24 action plates across hold, jump, listen, push, reach, sit, talk, walk): Perfect consistency, clean cutouts, emotion and action match.
    - `Leo` (20 clean action plates without the top-bar artifact).
    - `Clerk`, `Farmer`, `Officer`, `Parent`, `Shopper`, `Teacher`, `Vendor`, and `Zookeeper` (all 12 action poses each): Clean cutouts, matching actions and emotions.

### 2.3 `role_plate` (12 assets, 6 sheets)
- **Status:** 4 PASS, 0 REVIEW, 8 REDO
- **Key Issues Identified:**
  - **Duplicates:** `castle-banquet-plate`, `castle-banquet-plate-v2`, `castle-breastplate`, `castle-breastplate-v2` are exact duplicates of `cas-banquet-plate` and `cas-breastplate`.
  - **Edge Cutoff:** `picnic-plate`, `resto-plate`, and `resto-plated-meal` have their bottom circular edges cut off flat against the image bounding box.
  - **Opaque White Plate:** `geo-tectonic-plates` is an opaque white rectangular plate rather than a transparent cutout.
  - **Passes:** `cafe-plate`, `cas-banquet-plate`, `cas-breastplate`, and `gem-heating-plate` are clean transparent props.

### 2.4 `open_closed_hide_reveal_pair` (64 assets, 11 sheets)
- **Status:** 47 PASS, 2 REVIEW, 15 REDO
- **Key Issues Identified:**
  - **White Plate Invisible Assets:** `kenney-bg-book-closed`, `kenney-bg-book-open`, `kenney-bg-lock-closed`, `kenney-bg-lock-open` are white silhouettes on white plates.
  - **Severed/Hollow Cutouts:** `hide-backpack-closed`, `hide-backpack-open`, and `hide-sofa-open` have severe alpha erosion/hollow holes.
  - **Pair Mismatches & Tool Misclassifications:**
    - `bind-leather-hide` (animal skin) is mismatched with `bind-open-book`.
    - `kit-bottle-opener`, `kit-can-opener` and duplicates are tools on white plates rather than hide-reveal states.
    - `kenney-block-door-open` is too small with excessive dead space.
  - **Passes:**
    - Matching pairs verified together: `hide-barrel-*`, `hide-basket-*`, `hide-bed-*`, `hide-bin-*`, `hide-box-*`, `hide-bush-*`, `hide-chest-*`, `hide-crate-*`, `hide-cupboard-*`, `hide-curtain-*`, `hide-door-*`, `hide-drawer-*`, `hide-envelope-*`, `hide-gift-box-*`, `hide-locker-*`, `hide-shelf-*`, `hide-table-*`, `hide-tent-*`, and `shop-*-sign`.
    - Cover flaps: `cover-blue`, `cover-flap`, `cover-green`, `cover-orange`, `cover-purple`.

### 2.5 `letters_literacy` (245 assets, 13 sheets)
- **Status:** 233 PASS, 0 REVIEW, 12 REDO
- **Key Issues Identified:**
  - **Wrong Glyphs in Arrow Uppercase (Sheet 002):**
    - `letter-arrow-upper-o`: Displays glyph for 'N'.
    - `letter-arrow-upper-p`: Displays glyph for 'O'.
  - **Wrong Glyphs / Corruption in Trace Lowercase (Sheet 006):**
    - `letter-trace-lower-i`: Inverted black background plate.
    - `letter-trace-lower-l`: Displays glyph for 'j'.
    - `letter-trace-lower-m`: Displays glyph for 'k' on inverted black background plate.
    - `letter-trace-lower-n`: Displays corrupt multi-letter tile with 'l' and 'r'.
    - `letter-trace-lower-o`: Displays broken stroke fragments.
    - `letter-trace-lower-p`: Displays glyph for 'o' on inverted black background plate.
    - `letter-trace-lower-q`: Displays glyph for 'p'.
    - `letter-trace-lower-r`: Displays broken 'q' and 'l' fragments.
    - `letter-trace-lower-s`: Contains stray dot artifact.
    - `letter-trace-lower-w`: Contains severed stroke fragments on left.
  - **Passes (Instructional Letters & Literacy Props):**
    - `letter-arrow-lower-*` (26 lowercase), `letter-arrow-upper-*` (24 valid uppercase).
    - `letter-plain-lower-*` (26 lowercase), `letter-plain-upper-*` (26 uppercase).
    - `letter-stroke-lower-*` (26 lowercase), `letter-stroke-upper-*` (26 uppercase).
    - `letter-trace-upper-*` (26 uppercase), `letter-trace-lower-*` (16 valid lowercase).
    - Phonics tiles `kenney-letter-*` (26 tiles A-Z), color tiles `tile-*` (4), `mini-whiteboard` (1), `sound-box`/`sound-boxes` (2), `pencil`, `eraser-block`, `pointer-stick`, `word-strip`.
