# assetscout-2026-08-08-garden-cooking

- type: assetscout
- run_count: 2 topics
- date: 2026-08-08

## covered_before (topics already in repo)
Fixtures + pack tags already cover: animals, aquarium/ocean, cafe, castle/medieval,
clothes/dressup, dollhouse/home, family, feelings, food, gashapon (prize toys),
jobs, music/classical, seasons, space, sports/gym, trees, vehicles/transport,
weather, plus place lessons: travel, hotel, library, supermarket, campsite,
school, dentist/doctor/clinic, trampoline, volcano, zoo-phonics.

Manifest packs before this batch: animals, aquarium, cafe, castle, clothes,
dollhouse, family, feelings, food, gashapon, jobs, music, season, space, sports,
tree, vehicles, weather.

## this_batch (new topics + vocab sets)
Two fresh, concrete, single-object-friendly topics with no existing pack and high
future-lesson value (a nature/life-skills unit):

1. **garden / gardening** (pack `garden`) — B1 vocab:
   watering can, flower pot, seedling, trowel, wheelbarrow, rake.
   Why: no garden/plants pack existed; only a tiny `gashapon-flower` toy. Concrete
   nouns that key cleanly on black (light/colourful bodies, neutral fittings).

2. **cooking / kitchen** (pack `cooking`) — B1 vocab:
   frying pan, cooking pot, wooden spoon, whisk, rolling pin, mixing bowl.
   Why: `food` pack has food ITEMS but no cooking TOOLS; only legacy `spoon`/`fork`
   table cutlery. Fills the "how we cook" gap for a food/cooking lesson.

## created (12 props, all keyed via scripts/import-prop.mjs, matte house style)
garden (pack=garden):
- garden-watering-can  (container, scale .30, bottom, bodyHue 75)
- garden-flower-pot    (container, scale .25, bottom, bodyHue 15)
- garden-seedling      (object,    scale .20, bottom, bodyHue 25)
- garden-trowel        (tool,      scale .15, center, bodyHue 175)
- garden-wheelbarrow   (object,    scale .60, bottom, bodyHue 5)
- garden-rake          (tool,      scale .50, bottom, bodyHue 205)

cooking (pack=cooking):
- cooking-frying-pan   (tool,      scale .35, center, bodyHue 15)
- cooking-pot          (container, scale .40, bottom, bodyHue 185)
- cooking-wooden-spoon (tool,      scale .15, center, bodyHue 25)
- cooking-whisk        (tool,      scale .15, center)
- cooking-rolling-pin  (tool,      scale .20, center, bodyHue 25)
- cooking-mixing-bowl  (container, scale .30, bottom, bodyHue 35)

Manifest rows appended in one pass (alphabetical slots, existing rows untouched):
6 garden + 6 cooking = 12 new rows, each carrying a `pack` tag so a future lesson
can pull the whole group and each piece stays individually resolvable by
key/tags. Gates: 11/12 passed 8/8 clean; `cooking-pot` forced (C3 tightness only —
a legitimately wide two-handled pot; C2 clear, nothing clipped, importer re-pads
to 8% margin). QA sheet (light/dark/classroom + dock) read clean as teacher and
student — no dark rims, no vanishing, no shreds, no baked-in text.

## located_reused (existing pieces a lesson can pull without regenerating)
- garden: `gashapon-flower` (dock flower toy), `tree-canopy-*` / `season-spring`
  (foliage/greenery backdrops), `reward-star`, generic `dh-*` outdoor-ish props.
- cooking: `spoon`, `fork`, `apple`, and the whole `food-*` pack (apple, banana,
  burger, cookie, cupcake, fries, grapes, hotdog, icecream, juice-box, milk,
  noodles, orange, pizza, sandwich, yogurt) as the ingredients/plated-food side.

## follow_up (wiring a real lesson would still need — NOT done, collision-safe)
These require editing shared producer code, which this loop must not touch while a
builder loop is live on renderLessonPages.js / verify scripts / fixtures / gates:
- Add TOPIC_SETS entries mapping topic "garden"/"cooking" → these packs so the
  picker groups them automatically.
- vocabIcons.js overrides/emoji for the 12 words (cheap icon tier) — shared file,
  left as follow-up.
- Optional: a quiet themed flat for an outdoor "garden" place scene via
  .cursor/skills/bg-flat-sets (garden is borderline place-theme). Cooking is an
  activity/object topic, no flat needed.
- Fixtures (garden-lesson.json / cooking-lesson.json) once a lesson is authored.

## re-run
`/assetscout run assetscout-2026-08-08-garden-cooking`
