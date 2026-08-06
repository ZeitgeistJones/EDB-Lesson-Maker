# Asset license ledger

Fetched / authored for embedding in commercial ESL lesson PDFs and ClassIn `.edb` boards.
Do **not** redistribute these folders as a standalone competing stock pack.

| Kit / source | Path | License | Attribution | Notes | Date |
|---|---|---|---|---|---|
| Open Peeps (via DiceBear API) | `01_characters/`, `05_source-svg/open-peeps/`, `01_characters/humaaans-style/` | CC0 1.0 (Open Peeps design) | Not required | Official full kit also at https://www.openpeeps.com/ — `humaaans-style/` is additional Peeps seeds until a Humaaans zip is dropped in manually | 2026-08-01 |
| illlustrations.co (realvjy/illlustrations) | `04_decoration-ui/`, `05_source-svg/illlustrations/`, `06_board-ready-png/scenes/` | MIT; publisher states free commercial use without credit | Preserve MIT notice for source tree | https://illlustrations.co/ / https://github.com/realvjy/illlustrations | 2026-08-01 |
| Project-authored scene SVGs | `02_scenes-backgrounds/*/` | CC0 (project) | Not required | Gradient scene placeholders for Gemini `visualTheme` values | 2026-08-01 |
| Project-authored vocab icons | `03_vocab-icons/`, `05_source-svg/openclipart/` | CC0 (project) | Not required | Simple icons; replace with OpenClipart CC0 picks as curated | 2026-08-01 |
| Project-authored decorations | `04_decoration-ui/star.svg`, `confetti.svg` | CC0 (project) | Not required | Stand-ins for Open Doodles accents; drop official doodles into `05_source-svg/open-doodles/` when downloaded | 2026-08-01 |
| Twemoji vocabulary pack | `07_vocab-pack/` | CC BY 4.0 | Required — "Twemoji by Twitter, Inc and other contributors" | 309 word-keyed icons rebuilt by `scripts/fetch-vocab-icons.mjs`; every word→emoji pair is hand-chosen and the build rejects two words sharing one picture | 2026-08-04 |
| Board backgrounds (scenes) | `08_backgrounds/img/` (non-flat) | Generated with OpenAI image models for this project | Verify OpenAI terms before commercial resale | 76 place scenes with `groundY`; clear centre band for pieces. Includes free ChatGPT grid imports Aug 2026 | 2026-08-04 |
| Board backgrounds (flats) | `08_backgrounds/img/flat_*.png` | Generated with OpenAI image models for this project | Verify OpenAI terms before commercial resale | Universal teaching surfaces + quiet themed sets (`clinic-cool`, `school-soft`, `travel-air`, `home-warm`, `outdoor-fresh` — ChatGPT 2×2 grids Aug 2026) | 2026-08-05 |
| Board props (cutouts) | `09_props/img/` | Generated with OpenAI image models for this project | Verify OpenAI terms before commercial resale | ~40 empty shells: covers, dress-up, speaking tokens, furniture, phonics tools, collage props | 2026-08-02 |
| Board props (alpha cutouts) | `09_props/img/` (`alpha: true` in manifest) | Generated with OpenAI / Cursor image models for this project | Verify current terms before commercial resale | Includes ChatGPT black-field imports (e.g. `dental-kid-open-mouth` Aug 2026); keyed via `scripts/import-prop.mjs` | 2026-08-05 |

## Manual drops still recommended

1. **Humaaans** full library from https://www.humaaans.com/ → `05_source-svg/humaaans/`
2. **Open Doodles** from https://www.opendoodles.com/ → `05_source-svg/open-doodles/`
3. Curated **OpenClipart** / **PublicDomainVectors** scene elements → `03_vocab-icons/`, `02_scenes-backgrounds/`

Quality-loop gaps (preferred art we don’t have yet) live in [`docs/asset-wishlist.md`](../../docs/asset-wishlist.md) — fetch from there later; do not scrape to close rows.

## Avoid in this bank

Storyset/Freepik free (attribution), Vecteezy free (caps), unverified SVG Repo icons, Blush branded/Disney tiers.
Wikimedia Commons (per-file licenses vary; verify individually before use).
