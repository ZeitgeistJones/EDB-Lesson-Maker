# Visual Asset QA Review Notes: Vocab Pack (Sheets 151–225)

Audit Review Version: `2026-08-17-v1`  
Reviewed Assets: **2242** across **75** contact sheets (`07-vocab-pack-vocab-icon-generated-151.jpg` through `07-vocab-pack-vocab-icon-generated-225.jpg` inclusive)  
Alphabetical Span: `pram` (Sheet 151) through `zucchini` (Sheet 225)

## Summary Counts

- **PASS**: 2119 (94.5%)
- **REVIEW**: 0 (0.0%)
- **REDO**: 123 (5.5%)
- **Total Decided**: 2242 (100.0%)

---

## 1. Systemic Failure Modes (REDO Findings)

Visual inspection of contact sheets 151 through 225 identified four principal failure mechanisms requiring REDO status:

### A. Baked-In Text / Logo Artifacts (`text_artifact`)
Several generated cards contain embedded text titles, action labels, or watermarks directly baked into the raster artwork. Because vocabulary cards in ClassIn are paired dynamically with text labels and phonics overlays, static embedded English words break localization and pedagogical immersion:
- `process` (Sheet 152): Baked-in text "process" below vegetables.
- `project` (Sheet 152): Baked-in text "project" at bottom.
- `puree` (Sheet 154): Baked-in text "puree" above cooking pot.
- `quit` (Sheet 155): Baked-in text "quit" below gamepad.
- `raisehand` (Sheet 156): Baked-in text "raisehand" at bottom.
- `rakeleaf` (Sheet 157): Baked-in text "rakeleaf" at bottom.
- `rebel` (Sheet 158): Baked-in text "rebel" at bottom.
- `reduce` (Sheet 159): Baked-in text "reduce" at bottom.
- `remind` (Sheet 160): Baked-in text "remind" at bottom.
- `repeat` (Sheet 160): Baked-in text "repeat" at bottom.
- `rescue` (Sheet 161): Baked-in text "Rescue" under life preserver.
- `retire` (Sheet 162): Baked-in text "retire" at bottom.
- `robotdance` (Sheet 164): Baked-in text "Robotdance" at bottom.
- `rolldice` (Sheet 164): Baked-in text "Roll Dice" at bottom.
- `scamper` (Sheet 168): Baked-in text "scamper" at bottom.
- `scurry` (Sheet 170): Baked-in text "scurry" under mouse.
- `scuttle` (Sheet 171): Baked-in text "scuttle" under crab.
- `seedplant` (Sheet 172): Baked-in text "seedplant" under planting child.
- `shadowpup` (Sheet 173): Baked-in text "Shadow Puppet" at bottom.
- `share` (Sheet 174): Baked-in text "SHARE" at bottom.
- `sidestep` (Sheet 177): Baked-in text "sidestep" at bottom.
- `sidewalk` (Sheet 177): Baked-in text "sidewalk" at bottom.
- `slamdunk` (Sheet 179): Baked-in text "slamdunk" at bottom.
- `snowangel` (Sheet 181): Baked-in text "snowangel" at bottom.
- `sprint` (Sheet 186): Baked-in text "Sprint" at bottom.
- `steep` (Sheet 189): Baked-in text "steep" above teacup.
- `street` (Sheet 190): Baked-in text "Street" at bottom.
- `subway` (Sheet 192): Baked-in text "subway" at bottom.
- `sunny-day` (Sheet 193): Baked-in text "Sunny-day" at bottom.
- `swan` (Sheet 195): Baked-in text "Swan" at bottom.
- `swerve` (Sheet 195): Baked-in text "swerve" at bottom.
- `temperature` (Sheet 198): Baked-in text "Temperature" at bottom.
- `tetherball` (Sheet 199): Baked-in text "tetherball" at bottom.
- `thumbtack` (Sheet 201): Baked-in text "thumbtack" at bottom.
- `thunder` (Sheet 201): Baked-in text "Thunder" at bottom.
- `tiptoe` (Sheet 202): Baked-in text "Tiptoe" at bottom.
- `toil` (Sheet 203): Baked-in text "Toil" at bottom.
- `torture` (Sheet 204): Baked-in text "Torture - Pretend" at bottom.
- `tractor-toy` (Sheet 205): Baked-in text "Tractor-toy" at bottom.
- `tugowar` (Sheet 208): Baked-in text "tugowar" at bottom.
- `unbolt` (Sheet 210): Baked-in text "unbolt" at bottom.
- `unbuckle` (Sheet 210): Baked-in text "unbuckle" at bottom.
- `uncork` (Sheet 210): Baked-in text "uncork" at top.
- `uncover` (Sheet 210): Baked-in text "Uncover" at bottom.
- `undo` (Sheet 210): Baked-in text "Undo" at bottom.
- `unhook` (Sheet 211): Baked-in text "unhook" at bottom.
- `unlatch` (Sheet 211): Baked-in text "unlatch" at bottom.
- `unload` (Sheet 211): Baked-in text "unload" at bottom.
- `upload` (Sheet 212): Baked-in text "Upload" at bottom.
- `vanish` (Sheet 213): Baked-in text "Vanish" at bottom.
- `vibrate` (Sheet 214): Baked-in text "Vibrate" at bottom.
- `vulture` (Sheet 215): Baked-in text "Vulture" at bottom.
- `waiting-room` (Sheet 216): Baked-in text "Waiting-room" at bottom.
- `warm` (Sheet 216): Baked-in text "Warm" at bottom.
- `warn` (Sheet 217): Baked-in text "Warn" at bottom.
- `watercan` (Sheet 218): Baked-in text "watercan" at bottom.
- `watering-can-farm` (Sheet 218): Baked-in text "Watering-can-farm" at bottom.
- `wheelbarrow-farm` (Sheet 220): Baked-in text "Wheelbarrow-farm" at bottom.
- `wiggle` (Sheet 221): Baked-in text "Wiggle" at bottom.
- `winter` (Sheet 222): Baked-in text "Winter" at bottom.
- `x-ray` (Sheet 224): Baked-in text "X-ray" at bottom.
- `zigzag` (Sheet 225): Baked-in text "zigzag" at bottom.

### B. Wrong Concept / Semantic Mismatch / Unsuitable Themes (`wrong_background_mode`)
Several cards suffered from semantic mismatch between the asset key and the generated graphic, or unreadable abstractions unsuitable for young learners:
- `prefix` (Sheet 151): Detached 3D block from row; completely abstract and unreadable for children.
- `prejudice` (Sheet 151): Drama masks separated by brick wall; overly abstract and confusing for early vocabulary.
- `previous` (Sheet 151): Bare footprints; ambiguous representation.
- `principle` (Sheet 152): Stack of generic blocks; meaningless for concept "principle".
- `program` (Sheet 152): Remote control next to UI boxes; abstract/confusing.
- `pronoun` (Sheet 153): ID badge profile avatar; fails to represent grammar pronoun.
- `racial` (Sheet 156): Hands holding globe; abstract and awkward for child vocabulary.
- `razor` (Sheet 157): Depicts a toothbrush and toothpaste tube instead of a shaving razor.
- `reality` (Sheet 158): Plain mirror frame; unreadable abstraction.
- `remainder` (Sheet 160): Torn paper strip; meaningless abstraction.
- `representative` (Sheet 161): Briefcase and door tag; abstract.
- `rumor` (Sheet 166): Hands passing blank envelopes; unreadable abstraction.
- `scale` (Sheet 168): Depicts a liquid soap pump dispenser bottle instead of a weighing scale.
- `scale-bar` (Sheet 168): Scientific measurement bar in box; non-pedagogical.
- `sex` (Sheet 173): Anatomical reproductive diagrams; unsuitable for child educational bank.
- `soap-dispenser` (Sheet 182): Depicts a bathroom floor weighing scale instead of a soap dispenser.
- `suicide` (Sheet 192): Memorial mourning candle; unsuitable concept for child lesson bank.
- `terrorist` (Sheet 199): Dark silhouette behind caution tape; unsuitable topic for child lesson bank.
- `tapdance` (Sheet 197): Depicts a man grilling at a BBQ rather than tap dancing.
- `tea-cup` (Sheet 197): Depicts a bamboo dim sum steamer basket rather than a teacup.
- `vice` (Sheet 214): Depicts a boy holding toy cars rather than a carpenter's vise tool.

### C. Mechanical Duplicates & Corrupted Concept Mappings (`exact_duplicate` / `wrong_background_mode`)
Cross-referencing confirmed several corrupted asset duplicates in the live asset pack that mapped completely unrelated graphics to vocabulary keys:
- `rice-bowl` (Sheet 162): Exact duplicate of `comb`.
- `shampoo` (Sheet 173): Exact duplicate of `hummus` dip bowl.
- `shopping-cart` (Sheet 175): Duplicate of `shopping cart`.
- `soap` (Sheet 182): Exact duplicate of `guacamole` bowl.
- `toilet-paper` (Sheet 203): Exact duplicate of `naan` flatbread.
- `toothpaste` (Sheet 204): Exact duplicate of `nachos` platter.
- `tortilla` (Sheet 204): Exact duplicate of `toothbrush`.
- `towel` (Sheet 205): Exact duplicate of `pita` bread.
- `traffic-light` (Sheet 205): Duplicate of `traffic light`.

### D. Generation Slicing & Edge Cutoff Artifacts (`edge_cutoff` / `generation_artifact`)
Cards exhibiting slicing defects, multi-asset grid bleed, or severe canvas cutoffs:
- `pretzel` (Sheet 151): Duplicate slice artifact on right border.
- `queue` (Sheet 155): Partial cropped figure slice floating on left border.
- `ramen-bowl` (Sheet 157): Severely clipped on left edge with empty canvas.
- `recorder` (Sheet 158): Fragmented 4-quadrant layout with clipped instruments.
- `sesame-ball` (Sheet 173): Cropped at top edge with detached bottom piece.
- `siu-mai` (Sheet 178): Top dim sum dumpling with chopped detached fragment at bottom.
- `sling-arm` (Sheet 179): Fragmented split frame with arm sling and flashlight.
- `smile` (Sheet 180): Floating mouth with detached stray green artifact on edge.
- `spring-roll` (Sheet 186): Split frame with partial spring roll and soup bowl.
- `staple` (Sheet 188): Fragmented box with floating stapler hand and stray lines.
- `sunblock` (Sheet 193): 4-quadrant split card with random hockey stick and black cat silhouette.
- `sushi` (Sheet 194): Split frame with half sushi roll and half dumpling.
- `swimsuit` (Sheet 195): 4-quadrant split card with bottle and black hole.
- `taco` (Sheet 196): Taco with right border sliced and dark artifact.
- `trombone` (Sheet 207): Red swimsuit on clothesline with paperclip; broken asset.
- `tuba` (Sheet 208): 4-quadrant split card with random brass horn and block.
- `vet` (Sheet 214): 4-quadrant box with partial doctor portrait and stray border lines.
- `waffle` (Sheet 215): Split card with waffle on left and food skewer on right.
- `wife` (Sheet 221): Woman avatar with severe cropping lines and box borders.

### E. Blank / Low Contrast Cards (`blank`)
- `protein-powder` (Sheet 153): Faint near-invisible white outline jar.
- `rib` (Sheet 162): Faint thin curved line with arrow; almost invisible.
- `sake` (Sheet 166): Faint pale shapes of bottle and cup; almost unreadable.
- `sample` (Sheet 167): Faint outline of empty beaker/jar.
- `slogan` (Sheet 180): Empty stick with floating dot; meaningless abstraction.
- `spray-bottle` (Sheet 186): Faint outline of spray bottle; near-blank.
- `supper` (Sheet 194): Faint wireframe cutlery outline; near blank.
- `surname` (Sheet 194): Blank card next to frame; unreadable abstraction.
- `tweezers-aid` (Sheet 209): Faint bottle outline with corner clipping lines.
- `wall` (Sheet 216): Crosshair grid lines with no wall; blank.
- `yoghurt` (Sheet 225): Pale grey outline of cup, almost completely blank.
- `score` (Sheet 170): Tiny scoreboard icon floating in large empty canvas (`too_small`).

---

## 2. Strongest Asset Families (Production-Grade PASS)

Over 94% (2119 assets) of the vocabulary icons in this range are vibrant, clear, and perfectly tailored for primary ESL and early childhood ClassIn lesson boards:
1. **Sports & Activities** (`racket`, `roller-skate`, `rugby`, `running`, `scuba`, `skateboarding`, `skiing`, `soccer`, `swimming`, `tennis`, `volleyball`, `waterski`, `yoga`): Highly dynamic, expressive action poses.
2. **Animals & Nature** (`prawn`, `praying-mantis`, `puffin`, `puppy`, `quail`, `rabbit`, `raccoon`, `radish`, `raspberry`, `rattlesnake`, `reindeer`, `robin`, `rooster`, `rose`, `seagull`, `seahorse`, `seal`, `shark`, `sheep`, `skunk`, `sloth`, `snail`, `snake`, `snowy-owl`, `spider`, `squid`, `squirrel`, `starfish`, `stegosaurus`, `stork`, `strawberry`, `swallow`, `swan`, `tarantula`, `tasmanian-devil`, `tiger`, `toad`, `tortoise`, `toucan`, `tulip`, `turkey`, `turtle`, `walrus`, `warthog`, `wasp`, `weasel`, `whale`, `wheat`, `wild-boar`, `wildebeest`, `wolf`, `wombat`, `woodpecker`, `worm`, `yak`, `zebra`, `zucchini`): Rich botanical and zoological illustrations.
3. **Food & Culinary** (`pretzel-stick`, `profiterole`, `pudding`, `quesadilla`, `quiche`, `ravioli`, `refried-beans`, `rice`, `roast-beef`, `salad`, `salami`, `salmon`, `salsa`, `sandwich`, `sashimi`, `sausage`, `scone`, `shish-kebab`, `shortbread`, `smoothie-bowl`, `soba`, `soup`, `sourdough`, `spaghetti`, `steak`, `stew`, `sundae`, `sweet`, `tart`, `toast`, `tomato-soup`, `tzatziki`, `udon`, `waffle-syrup`, `wonton-soup`, `yeast`, `yogurt`, `yorkshire-pudding`): Clear, mouth-watering food icons.
4. **Tools & Everyday Objects** (`printer`, `protractor`, `pulley`, `punch`, `rake`, `receipt`, `remote-control`, `ruler`, `safe`, `safety-vest`, `saw`, `scissors`, `screwdriver`, `sewing-machine`, `shovel`, `sink`, `sofa`, `spatula`, `sponge`, `stapler`, `stethoscope`, `stopwatch`, `stove`, `suitcase`, `sunglasses`, `switch`, `table`, `tape-measure`, `telescope`, `television`, `thermometer`, `thimble`, `timer`, `toaster`, `toolbox`, `toothbrush`, `torch`, `towel-beach`, `tractor`, `traffic-cone`, `train`, `treadmill`, `tricycle`, `tripod`, `trophy`, `truck`, `trumpet`, `tunnel`, `umbrella`, `unicycle`, `vacuum-cleaner`, `van`, `vase`, `violin`, `volcano`, `wagon`, `wallet`, `wardrobe`, `washing-machine`, `watch`, `watering-can`, `weather-vane`, `webcam`, `wheelbarrow`, `wheelchair`, `whisk`, `whistle`, `whiteboard`, `windmill`, `window`, `wire-cutters`, `wrench`, `xylophone`, `yacht`, `yo-yo`, `zipper`): Crisp household and learning tools.

---

## 3. Scope & Execution Log

- Audit Script: `audit/visual-assets/generate_vocab_151_225_decisions.py`
- Decision Artifact: `audit/visual-assets/decisions-vocab-151-225.jsonl`
- Total Rows: **2242**
- Review Method: Visual inspection of each contact sheet image file (`07-vocab-pack-vocab-icon-generated-151.jpg` to `-225.jpg`) using Read tool.
