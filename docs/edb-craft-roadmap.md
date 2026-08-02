# EDB craft scaffolding roadmap

Patterns pulled from the hand-made Robot `.edb` (collage stage, lock split, text-as-chips, teacher cues).  
Scope: things we can handle as this build develops. **No** unverified clipart, **no** PDF wallpaper/characters, **no** byte-packing rewrites.

## Short term

### Likely easy wins

| ID | Idea | Why easy | Touch points |
|----|------|----------|--------------|
| **EW1** | Emit scenery with ClassIn `lock=1` (hand boards use `1`, not `3`); pieces stay `0` | One constant + ClassIn smoke test | `public/lib/buildEdb.js` |
| **EW2** | Optional **teacher cue** on title/warm (“Optional song / hum outro”) | Small chrome or sticky piece | `renderLessonPages.js`, planner |
| **EW3** | Vocab / key phrases as **styled image chips** (canvas PNG), not only baked DOM text | Reuses `tileToPng` / glyph helpers | `buildEdb.js`, `matchDock` |
| **EW4** | **One collage page** per lesson (activity): scene BG + locked prop area + unlocked dock toys from **verified** assets only (Twemoji / project CC0) | Reuses dock + `groundY` scenes | `edbActivities.js`, scene pack |
| **EW5** | **Reuse one scene** across 2–3 related pages when tags match | Planner heuristic | `SceneBackgrounds` / board plan |
| **EW6** | Keep this roadmap + a short “hand-EDB patterns” blurb for future prompts | Docs only | `docs/` |

### Short-term tougher (do after easy wins)

| ID | Idea | Why harder |
|----|------|------------|
| **ST1** | Bake less into html2canvas; more live pieces over flat/scene BG | Render + packing regression risk; preview parity |
| **ST2** | Speaking dialogue as draggable chips (not only Peek sticky) | Layout + pedagogy; cap to one page |

## Longer term

### Manageable later

| ID | Idea | Notes |
|----|------|-------|
| **LT1** | **Collage recipe pack** (shelf-sort, prop-dock, build-scene) with license-safe art only | Replaces “toys on shelf” idea without scraped clipart |
| **LT2** | **Lesson-as-theater spine**: fewer chrome pages, more play pages + cues | Product decision; stay “simple first” |
| **LT3** | Mixed JPEG scene + PNG cutouts in writer | Format allows it; pipeline is PNG-first today |
| **LT4** | Dedupe identical BG bytes inside one `.edb` | Size win; writer bookkeeping |

### Tougher / research-heavy

| ID | Idea | Notes |
|----|------|-------|
| **T1** | Native ClassIn **shape** objects (types `13` + `20`) | Under-specified; need golden fixtures before emit |
| **T2** | Full parity with hand-authored boards | Inspiration only — not a goal |
| **T3** | Gemini picks props/cues for theater pages | Schema + quality + license; after LT1 |

## Suggested order

1. EW1 → ClassIn check  
2. EW6 (already this doc)  
3. EW3 word chips  
4. EW2 teacher cue  
5. EW4 + EW5 collage page + scene reuse  
6. ST1 / ST2  
7. LT1 collage recipes  

## Success checks

- Locked scenery does not drag when using `lock=1`  
- Chips readable and draggable  
- Collage page assets only from `public/assets/LICENSE.md` ledger  
- Board preview PDF/PNG still matches spine  

## Explicit non-goals

- Re-importing Robot board clipart without commercial-safe provenance  
- PDF scene wallpaper / story characters (stay reverted)  
- Rewriting gzip / object binary packing in `buildEdb.js`
