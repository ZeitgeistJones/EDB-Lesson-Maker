# Horizontal Harvest Shortlist

Post-B2 reconnaissance only. Vertical CEFR is complete through B2; this report looks for high-ROI horizontal visual gaps that would help generated lessons across Pre-A1-B2. It does not propose C1/C2 work, producer wiring, renderer changes, Manus firing, or viability tests.

## 1. Current horizontal-bank strengths

- **Vocab still-life coverage is now broad.** `public/assets/07_vocab-pack/index.json` has 6,742 indexed keys. The current vocab-image audit showed 661/730 successes overall and only 9 board-slice failures across 524 board words, so the remaining ROI is not another broad vocab harvest.
- **Props are dense.** `public/assets/09_props/manifest.json` has 5,382 production prop rows, including 750 `hero-*` stage/container surfaces, 318 `cast-*` rows, 208 `letter-*` literacy rows, 40 `hide-*` open/closed pairs, 20 `story-env-*` cutouts, and 15 `*plate*` rows.
- **Containers and open/closed mechanics are strong.** The hero bank already covers boxes, bags, cases, bins, doors, gates, baskets, trays, fridges, booths, trucks, buses, trains, dollhouses, aquariums, and many open/closed variants. Examples: `hero-box-open`, `hero-backpack-open`, `hero-fridge-open`, `hero-bakery-case-open`, `hero-dollhouse-open`, `hero-aquarium-tank-open`, `hide-box-open`, `hide-curtain-open`, `hide-locker-open`.
- **Core actions are covered for the recurring child cast.** `cast-leo-*` and `cast-mia-*` each have 20 action types: `brush`, `catch`, `climb`, `draw`, `drink`, `eat`, `hold`, `idle`, `jump`, `kick`, `listen`, `push`, `reach`, `run`, `sit`, `swim`, `talk`, `throw`, `walk`, `wave`.
- **Generic story composition exists.** `docs/story-scenes.md` locks 8 reusable templates in `public/lib/storyScene.js`: `charObject`, `dialogue`, `exchange`, `action`, `group3`, `travel`, `heroFocus`, `locationActivity`. The direction is composable pieces, not one bespoke still per paragraph.
- **Interaction shells and grammar/reading/listening relations are already banked.** Pre-A1/A1/A2/B1/B2 stockpiles include instruction/feedback tokens, sentence rails, QA boards, text skins, listening detail boards, conversation turns, route/map parts, reading skins, procedure/status tokens, discourse relation visuals, B1 narrative complications, and B2 argument/mediation/perspective visuals.
- **Background places are broad.** `public/assets/08_backgrounds/manifest.json` includes school, home, medical, transport, commercial, sport, nature, fantasy, music, fire/police, and quiet flat sets. Full-scene settings are not a main gap.

## 2. Biggest remaining reusable visual weaknesses

1. **Composable human interaction beyond "one child holds/talks/listens".** The bank has excellent single-child action coverage for Mia/Leo and generic 7-pose sets for roles, but fewer clean cross-level interaction pieces: comfort, apologize, invite, knock/enter, search/pick-up, wait-in-line, ask-permission.
2. **A few everyday child-world roles are missing as cast, not vocab icons.** Teacher, parent, doctor, cashier, vendor, zookeeper, farmer, officer, etc. exist, but recurring school/community roles like `nurse`, `dentist`, `librarian`, `bus-driver`, and `grandparent` are not equivalently available as story/action cast.
3. **A small number of stage surfaces would unlock many activity lessons.** The bank has 750 hero targets, but not every high-use "put/build/sort/feed/pack" surface is equally shippable. Open kitchen workbench/mixing stage, wardrobe/costume closet, lost-and-found shelf/box, and a neutral packing suitcase are higher ROI than more boxes.
4. **Reusable story overlays are thinner than full settings.** We have many scenes and B1/B2 relation mini-scenes, but fewer transparent composable overlays such as rain/snow/wind/night/busy/celebration/lost-found that can modify any setting without commissioning a whole new background.
5. **Some banked cast/role assets are at risk because of QA, not because concepts are absent.** `audit/visual-assets/notes-story-roles-letters.md` flags white-uniform alpha erosion and identity drift for `cast-doctor-*`, `cast-chef-*`, `cast-waiter-*`, `cast-referee-*`, `cast-worker-*`, `cast-cashier-*`, and some `cast-customer-*` rows. These should be mopped before asking for duplicate roles.

## 3. Top harvest lanes ranked by ROI

1. **Story interaction poses/pairs** — highest ROI. They improve story pages, speaking prompts, roleplay, problem/solution beats, and B1/B2 discourse without changing the CEFR ladder.
2. **Interactive stage/surface gaps** — high ROI but smaller list. Only manufacture surfaces that unlock many real activity recipes.
3. **Reusable environment/state overlays** — high ROI if generated as transparent overlays, not full background variants.
4. **Everyday child-world cast roles** — medium-high ROI. Keep to roles that appear across many lessons, not obscure jobs.
5. **Object state pairs** — medium ROI, mostly reuse existing. Only a few state distinctions are worth new art.
6. **Vocab gap top-ups** — low priority for this horizontal pass. Use only lesson-demand gaps that remain after semantic reuse and PropBank fallback.

## 4. Recommended lanes

### Lane A/E: Composable Character Interaction

Current coverage:
- Strong: `cast-mia-*` and `cast-leo-*` have 20 actions each; 16 other cast roles have 7 generic actions each (`hold`, `idle`, `listen`, `reach`, `sit`, `talk`, `walk`).
- Reuse existing: `prea1-tpr-*`, `prea1-instr-*`, `a2-social-*`, `b1-action-*`, `b1-conversation-*`, and `b2-*speaker*`/`presentation-*` relation mini-scenes cover many instruction and discourse moves.
- Genuine gap: child-friendly interaction moments that are neither a single isolated pose nor an abstract relation diagram.

MANUS_WORTHY concepts:
- `interaction-kneel-pick-up-item` — child kneels/bends to pick up a dropped object; useful for lost/found, classroom cleanup, kindness, prepositions.
- `interaction-search-under-table` — child looks/searches under or behind a simple object; useful for where/is-it, lost object, mystery, prepositions.
- `interaction-knock-and-enter` — child knocks at/open doorway with another child inside; useful for home/school/community roleplay.
- `interaction-comfort-friend` — one child gently comforts a worried friend; useful for feelings, problem/solution, B1/B2 social response.
- `interaction-apologize-to-friend` — child apologizes with empty speech bubble/gesture; useful across A2 social, B1 repair, classroom stories.
- `interaction-invite-friend` — child offers invitation/beckons friend toward activity; useful for plans, parties, playdates, clubs.
- `interaction-ask-permission` — child asks adult/peer with polite hand + blank bubble; useful for classroom, trips, roleplay.
- `interaction-wait-in-line` — 2-3 children in queue, no signs/text; useful for bus, cafeteria, tickets, shops.
- `interaction-peer-check-together` — two children compare one picture/object and agree/check together; useful for wrap, pair-work, B1/B2 mediation.

Estimated generation: 9 cells, ideally one 3x3 black-field sheet. Expected reuse: very high across story pages and speaking/activity prompts. Batch practicality: high; all are kid-safe, concrete, and can share one style.

### Lane D/H: Interactive Stages And Surfaces

Current coverage:
- Strong: `hero-*` has 750 rows; major open/closed containers are deep (`box`, `bag`, `case`, `basket`, `door`, `gate`, `booth`, `truck`, `bus`, `train`, `dollhouse`, `aquarium`).
- Strong: A1/A2 stockpiles already include many blank shells and transaction skins (`a1-cafe-shop-shell`, `a1-request-basket-shell`, `a2-trans-cafe-counter-skin`, `a2-trans-borrow-return-desk-skin`).
- Genuine gap: a few neutral, reusable stage heroes that are not just another container and not code-drawn rectangles.

MANUS_WORTHY concepts:
- `stage-kitchen-workbench-mixing-bowl` — large black-field kitchen counter/mixing bowl stage with open empty areas for ingredients/tools. Matters because `docs/asset-wishlist.md` still lists kitchen/bakery king hero as open.
- `stage-wardrobe-costume-closet-open` — open wardrobe/closet stage for dress/build/choose clothing/costume lessons. Reuses across clothes, weather, theatre, home.
- `stage-lost-and-found-shelf-box` — friendly shelf/box surface for sorting found items; reusable for school, transport, community, possession.
- `stage-packing-suitcase-open` — open suitcase with empty compartments; reusable for travel, weather, trips, plans, prepare/forget.
- `stage-library-checkout-desk` — borrow/return desk with book well; only if existing `a2-trans-borrow-return-desk-skin` proves too shell-like for heroProp. Otherwise REUSE_EXISTING.

Estimated generation: 4-5 landscape/hero cells. Expected reuse: high for activity pages. Batch practicality: medium; stage heroes need scale and empty drop space, so one-per-cell or small sheet is safer than dense grids.

### Lane G/E: Environment State And Story Overlays

Current coverage:
- Strong: full backgrounds cover many places; B1 has `b1-complication-rain-starts`, `b1-complication-place-closed`, `b1-complication-item-missing`, `b1-outcome-problem-solved`, etc.
- Weakness: many are mini-scenes in raw stockpiles, not transparent overlay atoms that can modify any setting.

MANUS_WORTHY concepts:
- `overlay-rain-cloud-puddle` — transparent rain/puddle complication overlay.
- `overlay-snow-cold-wind` — transparent snow/wind/cold overlay for winter/weather.
- `overlay-night-dim-window` — transparent night/darkness cue without a new full background.
- `overlay-busy-crowd-small` — small crowd/queue cluster for "busy/crowded" states.
- `overlay-celebration-bunting-confetti` — celebration state for endings/rewards/parties.
- `overlay-closed-door-barrier` — closed/unavailable place cue without readable signs.
- `overlay-lost-item-spotlight` — empty spot/search glow for missing item mechanics.
- `overlay-found-item-sparkle` — found/resolved item cue.

Estimated generation: 8 cells, one black-field 4x2 or 3x3 sheet. Expected reuse: high if imported as transparent props/overlays. Batch practicality: high, but prompts must forbid text/signs.

### Lane B: Everyday Child-World Cast Roles

Current coverage:
- Strong: 18 cast families exist, including `teacher`, `parent`, `doctor`, `cashier`, `customer`, `clerk`, `vendor`, `farmer`, `officer`, `zookeeper`, `waiter`, `chef`, `worker`, `referee`, `shopper`, plus Mia/Leo/kid3.
- Risk: several existing white-uniform roles need mop/re-key before reuse.
- Genuine gap: a small set of roles that recur in child lessons but are not obscure jobs.

MANUS_WORTHY concepts:
- `cast-nurse-neutral-happy` — school nurse/clinic support; pairs with health lessons without using doctor for everything.
- `cast-dentist-neutral-happy` — dental lessons currently use props/doctor-adjacent assets; dentist cast is recurring.
- `cast-librarian-neutral-happy` — library/reading/borrow-return lessons.
- `cast-bus-driver-neutral-happy` — transport, travel, directions, safety.
- `cast-grandparent-neutral-happy` — family/home/stories; high child-world reuse.
- `cast-classmate-neutral-happy` — generic peer/friend beyond named Mia/Leo, useful for group and social scenes.

Estimated generation: 6 roles x 2 poses/emotions if kept as portraits = 12 cells. If action plates are required, do not create a full matrix yet; start with `idle`, `talk`, `listen`, `hold`, `reach`, `walk`, `sit` only after role portraits prove useful. Expected reuse: medium-high. Batch practicality: medium; character consistency matters more than density.

### Lane C: Object State Pairs

Current coverage:
- Strong: Pre-A1 relations already include `open/closed`, `full/empty`, `clean/dirty`, `hot/cold`, `wet/dry`, `fast/slow`, `heavy/light`, `broken/fixed`.
- Strong: production heroes have many open/closed variants.
- Genuine gap: only a few state distinctions create reusable lesson mechanics.

MANUS_WORTHY concepts:
- `state-light-on-off-lamp` — resolves current `light`/lamp weakness noted in `docs/asset-wishlist.md`; useful for home, electricity, instructions, night/day.
- `state-packed-unpacked-bag` — supports prepare/forget/travel/school routines; can reuse suitcase stage if generated.
- `state-plugged-unplugged-device` — useful for classroom tech/household instructions if kept child-safe and text-free.

Estimated generation: 3 pairs = 6 cells. Expected reuse: medium. Batch practicality: high. Do not expand this into a state-pair catalog.

### Lane J: Lesson-Demand Prop/Vocab Gaps

Current coverage:
- `tmp/vocab-image-audit/report.md` shows low board-slice failure: 9 failures out of 524 board words.
- `roller-coaster` now resolves in the vocab index, so the old audit note is no longer a live harvest need.
- Remaining sampled misses such as `recommendation`, `nonfiction`, and `driver-seat` are low horizontal ROI or text/code-later.

MANUS_WORTHY concepts:
- `vocab-crust` — simple bread/pizza crust still-life; food lessons reuse.
- `vocab-tentacle` — octopus tentacle still-life; aquarium/ocean/science reuse.
- `vocab-check-up` — doctor check-up still-life/scene token, but only if it survives board adaptation repeatedly; otherwise use existing clinic/doctor assets.

Estimated generation: 3 cells. Expected reuse: low-medium. Batch practicality: high, but this should trail the interaction/stage waves.

## 5. Master shortlist

Recommended Manus-worthy concepts to manufacture, in priority order:

1. `interaction-kneel-pick-up-item`
2. `interaction-search-under-table`
3. `interaction-knock-and-enter`
4. `interaction-comfort-friend`
5. `interaction-apologize-to-friend`
6. `interaction-invite-friend`
7. `interaction-ask-permission`
8. `interaction-wait-in-line`
9. `interaction-peer-check-together`
10. `stage-kitchen-workbench-mixing-bowl`
11. `stage-wardrobe-costume-closet-open`
12. `stage-lost-and-found-shelf-box`
13. `stage-packing-suitcase-open`
14. `overlay-rain-cloud-puddle`
15. `overlay-snow-cold-wind`
16. `overlay-night-dim-window`
17. `overlay-busy-crowd-small`
18. `overlay-celebration-bunting-confetti`
19. `overlay-closed-door-barrier`
20. `overlay-lost-item-spotlight`
21. `overlay-found-item-sparkle`
22. `cast-nurse-neutral-happy`
23. `cast-dentist-neutral-happy`
24. `cast-librarian-neutral-happy`
25. `cast-bus-driver-neutral-happy`
26. `cast-grandparent-neutral-happy`
27. `cast-classmate-neutral-happy`
28. `state-light-on-off-lamp`
29. `state-packed-unpacked-bag`
30. `state-plugged-unplugged-device`
31. `vocab-crust`
32. `vocab-tentacle`
33. `vocab-check-up`

Conditional / inspect before manufacturing:
- `stage-library-checkout-desk` — REUSE_EXISTING first via `a2-trans-borrow-return-desk-skin`; generate only if it is not hero-stage usable.

## 6. Classification totals

Scope: 101 high-likelihood candidates considered across the requested lanes, not an exhaustive universe.

- **MANUS_WORTHY: 33** — listed in the master shortlist.
- **REUSE_EXISTING: 39** — existing action poses, relation tokens, state pairs, open/closed containers, text skins, scene backgrounds, B1/B2 relation mini-scenes, and many vocab icons.
- **CODE_LATER: 17** — rectangles, cards, rails, labels, grids, timers, scoreboards, checkboxes, table layouts, writing surfaces, generic arrows, and dynamic text. This matches `docs/b2-code-later.json`, where 179 B2 proposals were intentionally deferred as renderer structure.
- **LOW_VALUE: 12** — obscure jobs, extra open/closed variants, decorative scene variants, one-off topic props, abstract B1/B2 concepts with no honest still-life, and full background state variants where overlays would suffice.

## 7. Recommended harvesting waves

### Wave H1: Interaction 3x3

9 cells:
`interaction-kneel-pick-up-item`, `interaction-search-under-table`, `interaction-knock-and-enter`, `interaction-comfort-friend`, `interaction-apologize-to-friend`, `interaction-invite-friend`, `interaction-ask-permission`, `interaction-wait-in-line`, `interaction-peer-check-together`.

Why first: highest cross-level reuse and least duplicated by existing banks.

### Wave H2: Stage + Overlay

12 cells:
`stage-kitchen-workbench-mixing-bowl`, `stage-wardrobe-costume-closet-open`, `stage-lost-and-found-shelf-box`, `stage-packing-suitcase-open`, plus the 8 overlay concepts.

Why second: stage surfaces unlock activity pages; overlays make existing scenes more flexible without buying new backgrounds.

### Wave H3: Roles + State Top-Up

12-18 cells:
6 role portraits plus 3 state pairs. If role portraits land cleanly, a later small pose mop can add `talk/listen/hold/reach/walk/sit` for the highest-used roles only. Do not start with a full role x pose x emotion matrix.

### Wave H4: Tiny Demand Top-Up

3 cells:
`vocab-crust`, `vocab-tentacle`, `vocab-check-up`, only after verifying they still fail after current index/PropBank adaptation.

## 8. Explicitly not worth harvesting

- **No C1/C2 or CEFR extension.** B2 is the ceiling for this pass.
- **No broad vocab sweep.** Vocab coverage is already strong; board-slice misses are low.
- **No more rectangles/cards/grids/rails/timers/buttons/labels/checklists.** These are code-rendered structure.
- **No full environment variant sets for day/night/rain/busy/celebration.** Use overlays over existing backgrounds instead.
- **No full emotion x pose x cast matrix.** `docs/story-scenes.md` explicitly warns that the old 7x3 matrix is the wrong stock unit.
- **No obscure jobs.** Avoid pilot, scientist, mechanic, judge, governor, interviewer, etc. unless repeated lesson demand appears.
- **No duplicate open/closed container harvest.** Existing `hero-*` and `hide-*` pairs are already deep.
- **No abstract B1/B2 still-life attempts** such as `worth`, `prioritize`, `motivation`, `recommendation`, `research`, `value`, `impact`. Teach with frames/text mechanics.
- **No pretty scene variants.** If the concept does not create a lesson mechanic, exclude it.

## 9. Banked but at risk of underuse later

- **Existing damaged cast roles.** Audit notes mark `cast-doctor-*`, `cast-chef-*`, `cast-waiter-*`, `cast-referee-*`, `cast-worker-*`, `cast-cashier-*`, and some `cast-customer-*` as having alpha erosion, white uniform loss, or identity drift. These concepts exist but may be bypassed unless mopped.
- **Raw B1/B2 relation stockpiles.** `docs/b1-stockpile-inventory.json` and `docs/b2-stockpile-inventory.json` contain many useful relation visuals (`b1-action-ask-help`, `b1-action-change-plan`, `b1-viewpoint-*`, `b2-counterproposal-*`, `b2-mediation-*`, etc.) that are not necessarily wired into normal generation yet.
- **A2 reading/transaction/process skins.** `a2-read-*`, `a2-trans-*`, and `a2-proc-*` are likely valuable, but many are structural shells. They should be reused by renderer logic before commissioning visually similar Manus art.
- **Story environment cutouts.** `story-env-*` has 20 entries, but `docs/story-scenes.md` says not to stockpile more envs until the placer/contact sheet looks right. Use existing envs before buying more.
- **B1 feelings and feedback cues.** The bank holds useful feeling and social response assets, but prior quality loops showed underuse or mismatched art can make them look like new concepts. Prefer existing `07_vocab-pack` feeling icons and vetted cues before new generation.

## Bottom line

The next cheap Manus spend should be horizontal and small: roughly 33 concepts, led by 9 reusable interaction pieces, 4 high-value stage surfaces, 8 overlays, 6 everyday roles, 3 state pairs, and 3 tiny demand top-ups. The rest of the system already has enough boxes, shells, scenes, relation diagrams, and code-drawn structure.
