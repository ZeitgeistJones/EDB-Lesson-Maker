# Asset wishlist (fetch later)

Gaps noticed during the **board quality loop**. Prefer appending here over forcing a bad substitute (wrong emoji, scraped clipart, or “close enough” art that fails the student lens).

**Rules**
- Commercial-safe sources only — see `public/assets/LICENSE.md`
- Do **not** drop unverified / scraped clipart into the repo to “close” a row
- One row per distinct need; dedupe before adding
- `Status`: `open` → `fetched` → `wired` (or `wont`)

| Date | Need | Why (case / word / page) | Preferred type | Suggested source | Status |
|------|------|--------------------------|----------------|------------------|--------|
| 2026-08-03 | Better icon for abstract size/space words (`spacious`, `cramped`, `huge`) beyond stadium metaphor | gym New Words dock — stadium works for spacious but not a full abstract-size set | Twemoji pack alias or CC0 vocab PNG | Twemoji / project `03_vocab-icons` | wired — Sheet V2 room scenes in `07_vocab-pack` |
| 2026-08-03 | Activity-page collage props (shelf toys, sortables) for EW4 | Soft S17 — activity pages still thin / low charm | Verified cutouts in `09_props` | Project OpenAI props + LICENSE ledger | open |
| 2026-08-03 | Distinct art for `swing` vs `slide` — both rendered 🛝 | minimal fixture New Words: two different words showed the same picture | Two distinct playground icons | CC0 icon set or generated prop | closed — `slide` is 🛝, `swing` is now a keyed prop in `09_props` (`swing.png`, anchor `top`) |
| 2026-08-05 | `swing` dock icon in `07_vocab-pack` | Prop exists for scene dressing, but matchDock M7 still soft-warns (pack/curated only) | Copy/key `09_props/swing.png` into vocab pack, or a white-bg dock icon | Existing prop / ChatGPT vocab sheet | wired — generated white-bg `swing.png` in vocab pack |
| 2026-08-05 | Big `trampoline` hero prop | Backflip lesson — activity needed a groundable trampoline, not postage-stamp gym mats | Black-field cutout, scale ~0.9, anchor bottom | User-made black-field art → `assets:prop` | wired — `09_props/trampoline.png` (C5 forced: U-legs disconnect in erosion mask) |
| 2026-08-03 | Room-quality adjectives: `cramped`, `tidy`, `cosy`, `cluttered` | abstract-words fixture — no vetted glyph, falls back to a Gemini guess | Contrasting mini-scene pairs (tidy vs cluttered room) | Generated — no emoji or icon set expresses these | wired — Sheet V2 (`assets:vocab-sheet`) |
| 2026-08-03 | Cafeteria nouns: `tray`, `queue`, `napkin`, `delicious` | bad-theme fixture — unvetted glyphs | Vocab icons | Generated — absent from Twemoji | wired — Sheet V4 |
| 2026-08-03 | Air-travel procedure words: `security`, `turbulence`, `connection` | overflow fixture — the rest of the travel unit now resolves from the rebuilt pack | Vocab icons | Generated — absent from Twemoji | wired — Sheet V3 (+ passport, boarding-pass, suitcase, gate, runway, customs) |
| 2026-08-04 | Purpose-drawn `doctor` vs `nurse` pair | Both resolve to Twemoji health workers that differ only by hair, which is thin for a young-learner match task | Two clearly different characters | Generated, or Open Peeps composition | wired — Sheet V1 clinic characters |
| 2026-08-04 | `patient`, `diagnosis`, `clumsy`, `table` | Dropped rather than aliased to a near-enough picture (patient shared the hospital building, diagnosis a clipboard, clumsy a cartwheel, table a ping-pong paddle) | Vocab icons | Generated | wired — Sheet V1 |
| 2026-08-04 | Scene backgrounds: hotel lobby, office, stadium, party room, snowy street, train platform, vet clinic | Common ESL units with no scene; picker falls back to a flat | 1536x1024 board scenes with a clear centre band | ChatGPT free grids → `assets:bg` | wired — plus 13 bonus scenes (water park, swamp, polar, reef, buffet, ballroom, ice rink, haunted, moon, dorm, gymnastics, river, dock) |
| 2026-08-04 | Aspect-preserving prop draw in `loadAssetPng` (`public/lib/buildEdb.js`) | It stretches prop art to the recipe's `w`/`h` with no aspect preservation, so a wide prop in a square slot distorts — `activity-tray` is 2.23:1 and `umbrella` 0.52:1 | Code fix, not art | `09_props/manifest.json` now records `aspect` per prop, so this is fixable at wiring time | wired — letterbox in `loadAssetPng` + `exportBoardPreview.drawPiece` |
| 2026-08-04 | Programmatic prop recolouring — remap the `bodyHue` band, leave neutral trim alone | Colour lessons and activities that call for a specific colour ("find the red one") currently have no way to get one; the pack ships one colour per prop | Code pass over existing cutouts | `bodyHue` is already measured into the manifest by `scripts/import-prop.mjs`; style lock requires one body hue plus neutrals | open |
| 2026-08-04 | Wire `09_props` into board rendering | Nothing consumes the pack at runtime: `pieceToPng` never looks at it and recipes still draw covers and trays with `solidPng()`, so 40 keyed cutouts sit unused | Code fix, not art | `09_props/manifest.json` (role, tags, aspect, relativeScale, anchor) | wired — PropBank + sortBins/coverAnswer + scene dressing |
| 2026-08-04 | Re-generate 6 unkeyable legacy props: `sorting-bin-green`, `prize-flap`, `tile-blue`, `sound-boxes`, `word-strip`, `pencil` | Cut from contact sheets or washed with their own colour to the frame border, so `assets:prop --convert` refuses them at C1; `sound-boxes` and `word-strip` are also truncated at the frame edge | Single-prop black-field generations | `docs/prop-style-lock.md` template → `assets:prop` | wired — all six roles covered (`sorting-bin-green`, `reward-flap`, and phonics sheet replacements for the four crops) |
| 2026-08-03 | Activity-page collage props (shelf toys, sortables) for EW4 | Soft S17 — activity pages still thin / low charm | Verified cutouts in `09_props` | Project OpenAI props + LICENSE ledger | wired — scene dressing places 1–3 locked props on activity scenes |
| 2026-08-04 | Medical / clinic prop sheet (9) | doctor + clown-clinic scene dressing has zero medical-tagged props | Matte 3×3 sheet | `docs/prop-sheet-prompts.md` Sheet 1 | wired — 9 medical props imported |
| 2026-08-04 | Gym / sports prop sheet (9) | gym fixture theme void | Matte 3×3 sheet | `docs/prop-sheet-prompts.md` Sheet 2 | wired — 9 gym props imported |
| 2026-08-04 | Cafeteria prop sheet (9) | bad-theme / cafeteria coverage thin | Matte 3×3 sheet | `docs/prop-sheet-prompts.md` Sheet 3 | wired — 9 cafeteria props imported |
| 2026-08-05 | Home scene-dressing props (matte) | demand: home/matte below tag floor | In-house 3×3 + import | Native GenerateImage sheet | wired — sofa, floor-lamp, coffee-table, house-plant, throw-pillow, picture-frame, rug, remote-control, wall-clock |
| 2026-08-05 | Park scene-dressing props (matte) | demand: park/matte thin (only swing) | Nine parallel one-offs (sheet gens kept white-tiling) | Native GenerateImage singles | wired — slide, seesaw, sandbox, park-bench, merry-go-round, playground-ball, kite, picnic-table, drinking-fountain |
| 2026-08-05 | Dentist vocab icons: dedicated `dentist`, `smile`, `floss` (brush→toothbrush / clean→soap already aliased) | dentist fixture New Words — `floss` still uses sewing-thread pack art; dedicated dentist/smile would beat doctor/happy stand-ins | Vocab pack icons | ChatGPT vocab sheet → `assets:vocab-sheet` | open |
| 2026-08-05 | Zoo vocab icons: `zoo`, `cage`, `feed` | zoo-phonics fixture New Words — unvetted glyphs | Vocab pack icons | ChatGPT vocab sheet → `assets:vocab-sheet` | open |

## How agents append

During vision / dual-lens review, if you think “I’d rather have X but we don’t”:

1. Add one table row (`Status: open`).
2. Keep the best **legal** stand-in already in-repo (emoji / pack / scene).
3. Note the wishlist id/need in `uxVerdict.wishlist` when writing the quality report.
4. Do **not** block the loop on fetching unless the user asked to fetch now.
