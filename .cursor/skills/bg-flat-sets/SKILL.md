---
name: bg-flat-sets
description: >-
  Generate quiet themed ESL board flat backgrounds in-house (no ChatGPT round-trip):
  read docs/bg-theme-sets.md style lock, generate 4 landscape washes with the native
  image tool, import via npm run assets:bg --flat --set, verify centre emptiness and
  textInk dark, wire TOPIC_SETS for place themes only. Use when a place topic has no
  matching quiet flat set, quality loop flags a missing place set, or the user asks
  for themed backgrounds / quiet flats / in-house bg generation. Non-place topics
  stay on board-house — do not invent body-part or skin palettes.
---

# Quiet flat sets (in-house)

Same tight loop as prop-cutouts, adapted for full-bleed washes. No API key, no
human ChatGPT trip for the default path.

## When to run

- A **place** topic (`clinic`, `travel`, `home`, `outdoor`, …) has a `TOPIC_SETS`
  set id with **&lt;2** flats in the manifest, or
- Quality loop shows off-topic place washes for a clear place lesson, or
- User asks for a themed quiet set for a **place** lesson

**Do not run** for generic school lessons — those use `DEFAULT_SET = board-house`
with **topic-neutral** charm only (no eyes/faces). Face / make-a-face lessons
use `board-face` (cool washes + tiny eye eggs). Never invent flesh/skin/peach-as-body
washes. Never put face easter eggs on `board-house` — castle and other topics
must not inherit them.

Quality loop: if the bake shows wallpaper spam for a clear *place*, invoke this
skill. If the topic is not a place, leave it on the house deck.

## Decisions (locked)

| Choice | Rule |
|--------|------|
| Default deck | `board-house` cool wall tints for school / unmatched — **no face eggs** |
| Face charm set | `board-face` only (cool + tiny eye eggs) — never the default |
| Place sets | Only clinic / travel / home / outdoor / beach / bakery / gym / supermarket (and future *places*) |
| Route | **In-house first** (4 individual landscape panels). ChatGPT 2×2 sheet only for bulk |
| Count | **4 panels** per set (`-a`…`-d`) |
| Aspect | Native tool **16:9**; importer stretches to 1280×590 |
| QA | Centre empty, shared hue, place-true motifs, no baked text, `textInk: dark`, **no skin tones** |
| Open/close | Title pins to first panel, wrap to last (picker handles this) |

## Anti-formula (hard)

Quiet flats drifted into a bad pattern: same empty-centre wash + generic corner
sticker (wheat / leaf / sun) palette-swapped by theme name. Motifs were not
**place-true**. Agents optimized for “4 panels that look like a set” over
“this place is unmistakable at a glance.”

**Mentality:** [fix-the-producer](../../rules/fix-the-producer.mdc) — fix the
prompt/skill that produced the formula, then regenerate. Do not only patch one
set’s PNGs and leave the process able to repeat the miss.

### Place-true motif vocabulary

Before any `GenerateImage` call, lock **3–5 concrete objects that ONLY fit that
place** (see motif table in [`docs/bg-theme-sets.md`](../../../docs/bg-theme-sets.md)).

| Place | Good motifs (examples) | Bad stand-ins |
|-------|------------------------|---------------|
| Bakery | dough ball, flour dust, loaf / baguette, rolling pin, whisk | wheat sheaf, farm grain, generic “warmth” plants |
| Beach | shell, wave fringe, sand dollar, sun corner | random leaf, farm wheat |
| Clinic | tooth outline, soft sparkle, pale alcove edge | grass, hills, nature |
| Travel | paper plane, map pin trail, cloud corner | beach shells, bakery tools |
| Home | curtain fold, soft arch shadow, peach hill band | outdoor meadow, clinic teal |
| Outdoor | grass fringe, leaf corner, soft sun | indoor shelves, bakery dough |
| Gym | basketball corner, court lane fringe, rolled mat, wall-pad edge | outdoor meadow, clinic tooth |

### Forbidden formula moves

- Recycling the **previous set’s composition** with a palette swap
- Generic “warmth” plants (wheat, decorative leaves) as place stand-ins
- **Identical corner layout** across panels a–d (same corner, same scale, same sticker energy)
- Mid-frame clutter / busy shop interior / furniture close-ups
- Motifs that also fit a different place equally well
- **Furnished room + empty middle strip** (hard fail) — tables/desks/beds/cabinets/shelves as scene layout with a cleared centre for cards. Target = near-empty wash + thumbnail corner glyph (`fire-cool` / pool / police winners). If it reads as a room → reject and regen.
- **Readable text on corner glyphs** (hard fail) — clipboards/forms with letters, price tags with numbers, badges with words. Blank silhouette only.

### Plan gate (before generate)

Write **one line per panel** naming the motif. Panel `-a` may be quieter than
`-b`…`-d`, but **must still pass the 1-second place-name test** — title pages
pin to `-a`. A blank anonymous wash fails (space: sparse corner stars or a
tiny crescent, not empty periwinkle).

Example (bakery — accept):

- a: flour-dust haze, almost plain cream
- b: bottom-left round dough ball + light flour speckles
- c: top-right muted loaf / baguette silhouette
- d: bottom-right soft rolling pin (or whisk)

Example (bakery — reject): a plain cream; b wheat; c wheat; d wheat/leaves.

Example (space — reject): a blank lavender; b moon you must squint for; c invisible
planet; d two pinpricks. Accept: a indigo haze + sparse corner stars; b crescent;
c clear ringed-planet edge; d nebula fringe + stars.

### Eye QA (after generate)

1. **Cover the corners** — does the centre still work for cards / dark ink?
2. **Uncover the corners** — can a teacher name the place in **1 second**?
3. If (2) fails → **fail the set**. Fix vocabulary + prompts; regenerate. Do not
   ship “quiet but anonymous.”

## Procedure

1. **Read [`docs/bg-theme-sets.md`](../../../docs/bg-theme-sets.md)** style lock + place prompt + motif vocabulary. Confirm the topic is a **place**, not a body part.

2. **Pick ids**
   - `set`: kebab id (`beach-warm`, `bakery-warm`)
   - Panel names: short stem consistent with existing (`clinic-a`, `travel-a`)

3. **Lock motif plan** — one line per panel (Anti-formula plan gate). Reject if place is not unmistakable from the list.

4. **Generate 4 images** (parallel OK). Each call: 16:9, explicit `filename`. Prompt = style lock + **one shared palette** + **one unique place-true corner motif** (or almost-plain for `-a`). Forbidden: people, faces as subject, furniture mid-frame, text, logos, **flesh/skin peach washes**, **formula stickers** (wheat-as-bakery, leaf-as-everything).

5. **Find outputs** in the project Cursor assets folder. Copy into `assets-inbox/` if needed.

6. **Import each**

   ```bash
   npm run assets:bg -- assets-inbox/clinic-cool-a.png --flat --name=clinic-a \
     --set=clinic-cool --mood=calm --tone="clinic cool wash — plain teal white"
   ```

7. **Gate by eye + importer notes**
   - Centre ~70% empty? (`midSd` preferably ≤12)
   - Same hue family across four?
   - Place-true motifs? (1-second place name test)
   - No letters/numbers / no skin-metaphor palette?
   - `textInk` must be `dark` on pale washes

8. **Paste** flat entries into `public/assets/08_backgrounds/manifest.json` under `flats`.

9. **Wire picker** — add/adjust a row in `TOPIC_SETS` in
   [`public/lib/sceneBackgrounds.js`](../../../public/lib/sceneBackgrounds.js).
   Place-specific rows only. Do **not** add face/skin/body-part sets.

10. **Verify**

    ```bash
    npm run test:bg-picks
    # optional: bake a fixture that should lock to this set
    ```

11. **Docs** — add the set + motif vocabulary to `docs/bg-theme-sets.md`; wishlist row → wired.

## QA checklist (flats)

- [ ] Centre band empty enough for cards
- [ ] Four panels share one hue family
- [ ] Motif plan written first; place unmistakable from motif list alone
- [ ] Teacher 1-second place test passes (uncover corners)
- [ ] No formula stickers / palette-swap of another set’s layout
- [ ] No baked text / logos / people
- [ ] No flesh / skin / body-part metaphor palette
- [ ] `textInk: "dark"` on pale washes
- [ ] Place topic locks via `TOPIC_SETS` (≥2 panels), or non-place stays on `board-house`

## Related

- **Process over artifacts:** [`.cursor/rules/fix-the-producer.mdc`](../../rules/fix-the-producer.mdc)
- Props: `.cursor/skills/prop-cutouts/SKILL.md`
- King EDB prefers quiet flats under the stage: `.cursor/skills/king-stage-edb/SKILL.md`
- Quality loop may call this when a *place* set is missing: `.cursor/skills/board-quality-loop/SKILL.md`
