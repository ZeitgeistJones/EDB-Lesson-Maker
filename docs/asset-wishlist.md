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
| 2026-08-03 | Distinct art for `swing` vs `slide` — both currently render 🛝 | minimal fixture New Words: two different words show the same picture | Two distinct playground icons | CC0 icon set or generated prop | open |
| 2026-08-03 | Room-quality adjectives: `cramped`, `tidy`, `cosy`, `cluttered` | abstract-words fixture — no vetted glyph, falls back to a Gemini guess | Small contrasting scene icons (tidy vs messy room) | Generated prop pair or CC0 | open |
| 2026-08-03 | Cafeteria nouns: `tray`, `queue`, `napkin` | bad-theme fixture — unvetted glyphs | Vocab icons | Twemoji pack extension | open |
| 2026-08-03 | Air-travel procedure words: `boarding pass`, `security`, `departure`, `arrival`, `seatbelt`, `turbulence`, `customs`, `connection`, `jet lag` | overflow fixture — 10 of 12 words unvetted; common ESL travel unit | Vocab icons | Twemoji pack extension / generated set | open |

## How agents append

During vision / dual-lens review, if you think “I’d rather have X but we don’t”:

1. Add one table row (`Status: open`).
2. Keep the best **legal** stand-in already in-repo (emoji / pack / scene).
3. Note the wishlist id/need in `uxVerdict.wishlist` when writing the quality report.
4. Do **not** block the loop on fetching unless the user asked to fetch now.
