# Asset wishlist (fetch later)

Gaps noticed during the **board quality loop**. Prefer appending here over forcing a bad substitute (wrong emoji, scraped clipart, or “close enough” art that fails the student lens).

**Rules**
- Commercial-safe sources only — see `public/assets/LICENSE.md`
- Do **not** drop unverified / scraped clipart into the repo to “close” a row
- One row per distinct need; dedupe before adding
- `Status`: `open` → `fetched` → `wired` (or `wont`)

| Date | Need | Why (case / word / page) | Preferred type | Suggested source | Status |
|------|------|--------------------------|----------------|------------------|--------|
| 2026-08-03 | Better icon for abstract size/space words (`spacious`, `cramped`, `huge`) beyond stadium metaphor | gym New Words dock — stadium works for spacious but not a full abstract-size set | Twemoji pack alias or CC0 vocab PNG | Twemoji / project `03_vocab-icons` | open |
| 2026-08-03 | Activity-page collage props (shelf toys, sortables) for EW4 | Soft S17 — activity pages still thin / low charm | Verified cutouts in `09_props` | Project OpenAI props + LICENSE ledger | open |
| 2026-08-03 | Distinct art for `swing` vs `slide` — both rendered 🛝 | minimal fixture New Words: two different words showed the same picture | Two distinct playground icons | CC0 icon set or generated prop | partly closed — `slide` now 🛝; Unicode has no swing, still needed |
| 2026-08-03 | Room-quality adjectives: `cramped`, `tidy`, `cosy`, `cluttered` | abstract-words fixture — no vetted glyph, falls back to a Gemini guess | Contrasting mini-scene pairs (tidy vs cluttered room) | Generated — no emoji or icon set expresses these | open |
| 2026-08-03 | Cafeteria nouns: `tray`, `queue`, `napkin`, `delicious` | bad-theme fixture — unvetted glyphs | Vocab icons | Generated — absent from Twemoji | open |
| 2026-08-03 | Air-travel procedure words: `security`, `turbulence`, `connection` | overflow fixture — the rest of the travel unit now resolves from the rebuilt pack | Vocab icons | Generated — absent from Twemoji | open |
| 2026-08-04 | Purpose-drawn `doctor` vs `nurse` pair | Both resolve to Twemoji health workers that differ only by hair, which is thin for a young-learner match task | Two clearly different characters | Generated, or Open Peeps composition | open |
| 2026-08-04 | `patient`, `diagnosis`, `clumsy`, `table` | Dropped rather than aliased to a near-enough picture (patient shared the hospital building, diagnosis a clipboard, clumsy a cartwheel, table a ping-pong paddle) | Vocab icons | Generated | open |
| 2026-08-04 | Scene backgrounds: hotel lobby, office, stadium, party room, snowy street, train platform, vet clinic | Common ESL units with no scene; picker falls back to a flat | 1536x1024 board scenes with a clear centre band | ChatGPT free grids → `assets:bg` | wired — plus 13 bonus scenes (water park, swamp, polar, reef, buffet, ballroom, ice rink, haunted, moon, dorm, gymnastics, river, dock) |

## How agents append

During vision / dual-lens review, if you think “I’d rather have X but we don’t”:

1. Add one table row (`Status: open`).
2. Keep the best **legal** stand-in already in-repo (emoji / pack / scene).
3. Note the wishlist id/need in `uxVerdict.wishlist` when writing the quality report.
4. Do **not** block the loop on fetching unless the user asked to fetch now.
