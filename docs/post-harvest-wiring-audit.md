# Post-Harvest Wiring Audit

Checkpoint requested: `0c7566f3`. Local horizontal inventory currently records `eae83d50` and `no_wiring: true`; this audit treats `harvested/manus-horizontal-stockpile/` as closed stockpile and does not wire it.

## Executive Result

- User-facing generation now has a B2 ceiling: `Pre-A1`, `A1`, `A2`, `B1`, `B2`.
- Pre-A1 is callable today through a distinct level prompt and a distinct phonics policy path. It is not a silent A1 route, but it still uses the legacy lesson shape plus the existing board planner.
- Normal teacher flow no longer exposes or calls story-art generation. `/api/generate-story-art` remains for internal/testing use only; the UI path gates StoryArt behind `?storyArt=1`, `window.__ENABLE_STORY_ART__`, or `localStorage.storyArtInternal=1`.
- The verb-as-vocab filler cause was the producer prompt: it demanded an exact vocab count while only warning against weak adjective and parent-setting padding. The prompt now asks for a range and says to stop at the lower end instead of padding with generic verbs.

## Counts

Matrix row count: **45 cultivated systems/families**.

| CLASSIFICATION | COUNT |
|---|---:|
| LIVE_REACHABLE | 17 |
| IMPORTED_BUT_UNDERUSED | 4 |
| RENDERER_READY_PRODUCER_UNWIRED | 5 |
| ASSET_READY_MECHANIC_UNWIRED | 3 |
| RAW_DURABLE_ONLY | 11 |
| CODE_LATER | 4 |
| DEFERRED | 1 |

## Matrix

| SYSTEM | ASSETS EXIST? | IMPORTED? | PRODUCER CAN REQUEST? | RENDERER CAN RENDER? | LIVE LESSONS USE? | BLOCKER | RECOMMENDED PRIORITY |
|---|---|---|---|---|---|---|---|
| CEFR level selector/router | N/A | N/A | Yes: `api/generate-lesson.js` supports Pre-A1-B2 | Yes | LIVE_REACHABLE | Old C values now fall back to B1 | Done |
| Pre-A1 basic generation path | Partial | Partial via existing board systems | Yes: Pre-A1 prompt block and phonics rules | Yes, legacy pages + phonics | LIVE_REACHABLE | Pre-A1 stockpile mechanics are not wired | P0 keep honest, then wire only high-reuse Pre-A1 pieces |
| Vocab pack icons | Yes: 6,742 entries in `public/assets/07_vocab-pack/index.json` | Yes | Yes, via generated `vocabulary[]` words | Yes, `VocabArt.planFor` | LIVE_REACHABLE | Exact-word dependence; many abstract icons are low quality or rarely requested | P0 preserve, keep coverage gates |
| PropBank object fallback for vocab | Yes: 5,382 prop rows | Yes | Yes, via vocab words/topic traits | Yes, `VocabArt` and `PropBank.resolve` | LIVE_REACHABLE | Head-noun and dock-safety gates intentionally reject many near misses | P0 preserve |
| VocabArt coverage adapt | N/A | N/A | Planner invokes it | Yes | LIVE_REACHABLE | Can reorder/shorten, but should not invent weak words | P0 now fixed against quota padding |
| Scene backgrounds + quiet flats | Yes: 80 scenes, 128 flats | Yes | Producer emits `visualTheme`; planner infers sections | Yes, `SceneBackgrounds`/`renderLessonPages` | LIVE_REACHABLE | Producer still picks legacy section mix, so backgrounds do not change lesson shape | P1 |
| Scene dressing props | Yes | Yes | Indirect through topic/title vocab | Yes, `dressScenes` | LIVE_REACHABLE | Only activity scene pages, skipped when activity owns art | P2 |
| New Words match dock | Yes | Yes | Planner chooses when matchable art fits | Yes | LIVE_REACHABLE | Requires enough honest pictured words | P0 preserve |
| Sentence frame tiles | Text-only | N/A | Producer emits frames with blanks | Yes | LIVE_REACHABLE | Producer can still generate legacy or awkward frames | P0 |
| Phonics sound boxes + letter tiles | Yes: letter/glyph assets plus policy bank | Yes | Yes for Pre-A1/A1/A2 auto, topic/forced higher | Yes | LIVE_REACHABLE | Pre-A1 is basic sound exposure, not full literacy stockpile | P1 |
| Speaking answer cover | Generated chrome | N/A | Planner always checks first speaking page | Yes | LIVE_REACHABLE | Not a major visual upgrade | P2 |
| Deterministic story plates | Props/emoji/caption plates | Yes | Producer emits `visualCaption` | Yes, `storyFallbackVisual` | LIVE_REACHABLE | Caption/text mismatch still possible; no composable scene semantics | P0 bridge to StoryScene |
| Activity fallback recipes (`fixSentence`, `oddOneOut`, `yesNoSort`, `thisOrThat`, `mysteryHints`, `sortBins`) | Mostly existing art/text | Yes | Planner derives from lesson | Yes | LIVE_REACHABLE | Producer emits generic activity shells, planner often falls to legacy-feeling choices | P0/P1 |
| Shippable heroProp kings | Yes: curated shippable set in `edbActivities.js` | Yes | Indirect via topic/title regex and traits | Yes | LIVE_REACHABLE | Only topics matching curated rules; many harvested heroes remain banked | P0 |
| Curated roleplay docks | Yes | Yes | Indirect via hero/theme | Yes | LIVE_REACHABLE | Producer does not ask for roleplay semantics; dock source is heuristic | P0 |
| Warm-up coloring outlines | Yes | Yes | Level/topic policy decides | Yes | LIVE_REACHABLE | A1/A2 oriented; not a broad Pre-A1 literacy system | P1 |
| TopicIdentity / ProducerQuality repair | N/A | N/A | Planner runs repair/brief before board adapt | N/A | LIVE_REACHABLE | Repairs legacy output, but does not produce newer semantic structures | P0 preserve |
| Long-tail CEFRJ/generated vocab icons | Yes | Yes | Only if Gemini chooses exact words | Yes | IMPORTED_BUT_UNDERUSED | Large import is reachable but sparse in real lesson demand | P2 |
| Broad hero-target open containers/surfaces | Yes: `hero-targets` pack is largest prop pack | Yes | Some via regex rules | Yes when shippable | IMPORTED_BUT_UNDERUSED | Many keys have no topic trait or semantic planner bridge | P1 targeted only |
| Theme prop packs beyond curated docks | Yes | Yes | Indirect through resolver | Yes | IMPORTED_BUT_UNDERUSED | Planner uses curated subsets and gates decorative/off-topic props | P2 |
| Real settings/background catalog | Yes | Yes | Producer can emit place-ish `visualTheme` only | Yes | IMPORTED_BUT_UNDERUSED | Legacy story section does not request rich setting semantics | P1 with story-scene bridge |
| StoryScene templates | N/A templates in `public/lib/storyScene.js` | Code loaded | No normal prompt/schema request | Yes | RENDERER_READY_PRODUCER_UNWIRED | Producer never emits `page.storyScene` | P0 |
| Story cast/action/env composable path | Yes: `story-cast` 318, `environment` 20 | Yes | No normal semantic storyScene emission | Yes | RENDERER_READY_PRODUCER_UNWIRED | Missing producer bridge from story beat to template/fills | P0 |
| `buildScene` / `dressUp` recipes | Partial | Code exists | No current planner assignment | Yes | RENDERER_READY_PRODUCER_UNWIRED | Planner does not emit these recipes in normal flow | P2 |
| `hideSeek` / `revealReward` / `orderLine` recipes | Generated chrome/assets | Partial | No current planner assignment | Yes | RENDERER_READY_PRODUCER_UNWIRED | Legacy recipes remain in registry but are not selected | P2 |
| External StoryArt API/cache apply path | API exists | N/A | Internal flag only | Yes via `applyStoryArt` | RENDERER_READY_PRODUCER_UNWIRED | Normal product must not call fallback API | Park internal only |
| Hide/reveal closed/swap pairs | Yes: `hide-reveal` pack 40 | Yes | No semantic hide/reveal state request | No state-swap mechanic in normal board | ASSET_READY_MECHANIC_UNWIRED | Art exists, but live `hideSeek` uses generated solid covers | P2 |
| Open/closed container state swaps | Yes across hero-targets | Yes | Some open heroes reachable | Open hero can render; closed/reveal swap cannot | ASSET_READY_MECHANIC_UNWIRED | No deterministic state transition mechanic | P2 |
| Feedback/status/timer/miniboard chrome | Yes, small roles in PropBank | Yes | Rare/no semantic request | Partial | ASSET_READY_MECHANIC_UNWIRED | Needs deterministic UI rules, not more art | P2 |
| Pre-A1 stockpile | Yes: 309 items, 8 families | No live manifest import | No, except basic Pre-A1 prompt | Mostly no | RAW_DURABLE_ONLY | Harvested/docs only; no planner bridge | P0 select only instruction/TPR/literacy basics |
| A1 stockpile | Yes: 104 items, 11 families | No live manifest import | No | Mostly no | RAW_DURABLE_ONLY | Structural shells need deterministic planner/UI | P1 |
| A2 stockpile | Yes: 157 items, 17 families | No live manifest import | No | Mostly no | RAW_DURABLE_ONLY | Routes, transactions, info-gap need code structures | P1/P2 |
| B1 stockpile | Yes: 53 generated relation items | No live manifest import | No | Mostly no | RAW_DURABLE_ONLY | Relation/discourse mini-scenes are not lesson semantics yet | P2 |
| B2 stockpile | Yes: 55 generated relation items | No live manifest import | No | Mostly no | RAW_DURABLE_ONLY | Argument/mediation visuals need renderer structures | P2 |
| Horizontal H1 interaction poses | Yes: 9 pass | No | No | No | RAW_DURABLE_ONLY | Closed stockpile; do not wire now | Park |
| Horizontal H2 stage surfaces | Yes: 4 pass | No | No | No | RAW_DURABLE_ONLY | Closed stockpile; stage mechanics needed | Park |
| Horizontal H3 state overlays | Yes: 8 pass | No | No | No | RAW_DURABLE_ONLY | Closed stockpile; state overlay mechanic needed | Park |
| Horizontal H4 child-world roles | Yes: 6 pass | No | No | No | RAW_DURABLE_ONLY | Closed stockpile; role/cast mapping needed | Park |
| Horizontal H5 state pairs | Yes: 3 pass | No | No | No | RAW_DURABLE_ONLY | Closed stockpile; state-pair mechanic needed | Park |
| Horizontal H6 demand top-ups | Yes: 3 pass | No | No | No | RAW_DURABLE_ONLY | Closed stockpile; import only if exact live demand recurs | Park |
| A1/A2 structural boards (rails, maps, info gap, text skins) | Yes in stockpile docs | Mostly no | No | Partial legacy equivalents only | CODE_LATER | Needs deterministic UI, not just art import | P1 targeted |
| B1/B2 discourse and argument architecture | Yes in stockpile docs | Mostly no | No | No/partial text only | CODE_LATER | Needs semantic planner + renderer | P2 |
| Horizontal interactive surfaces/state overlays | Yes raw | No | No | No | CODE_LATER | Needs deterministic mechanics before import | P2 |
| Multi-lesson modules | N/A | N/A | No | No | CODE_LATER | Explicitly out of scope | Later only |
| C1/C2 | Future only | N/A | No normal generation choice | Generic architecture can support later | DEFERRED | B2 is current ceiling | Future only |

## Specific Findings

### Pre-A1

Pre-A1 is now selectable and reaches `api/generate-lesson.js` as `safeLevel === 'Pre-A1'`. It gets its own CEFR descriptor, its own prompt block, and `PhonicsPolicy.rulesFor('Pre-A1')` resolves to `PRE-A1` instead of defaulting to A1.

Honest status: callable today, not fake A1. But it still renders through the existing legacy board spine. The 309-item Pre-A1 stockpile (`instructions`, `tpr`, `phonology`, `prewriting`, `mnemonic-az`, `relations`, `surfaces`, `articulation`) is not imported into live manifests and not wired to the planner.

### Story Scenes

`renderLessonPages.js` prefers `page.storyScene` and calls `StoryScene.compose` when present. `storyScene.js` has eight templates and validates unknown action verbs instead of silently mapping them to idle/walk.

Blocker: the normal producer schema/prompt does not ask for `story.pages[].storyScene`, so live lessons still emit text, `visualTheme`, and `visualCaption`. Result: story pages can use deterministic prop/emoji fallback, but not the full cast/action/environment compositor unless a fixture or internal script injects storyScene.

External story art no longer runs in normal teacher flow. It can still run only through developer/internal opt-in and server `STORY_ART=1`.

### Hide/Reveal + Hero

Hero is partially live. `findHeroProp` soft-gates to `SHIPPABLE_KING_KEYS`; curated kings and many open hero-target surfaces can render as huge activity stages with roleplay docks. This is the strongest already-built interaction system.

Hide/reveal is not comparably live. `hideSeek` exists but is not currently selected by the planner, and it uses generated solid covers, not the harvested/imported hide/reveal state pair art. Closed/open state swaps are asset-ready but mechanic-unwired.

### A1/A2/B1/B2

- A1/A2 harvested systems are mostly structural classroom mechanics: rails, QA surfaces, transaction shells, route maps, info gaps, reading skins. They need deterministic renderer/planner structures before import is useful.
- B1/B2 stockpiles are relation and discourse visuals. Some could help story/comprehension, but live producer still emits generic reading questions and legacy discussion sections.
- B2 is visible ceiling. C1/C2 are parked.

## Why Lessons Still Look Old

Classification: **E, combination**.

- **A newer systems not wired:** StoryScene, A1/A2/B1/B2 structural stockpiles, horizontal stockpile, hide/reveal state swaps.
- **B wired but producer does not request:** heroProp is live, but only topic/title heuristics trigger it; StoryScene renderer is live but producer never emits `storyScene`.
- **C renderer cannot express:** A2 route maps/info gaps and B2 argument/mediation structures need deterministic UI, not raw art.
- **D level planning favors legacy recipes:** `api/generate-lesson.js` still asks for the same spine: vocab, sentence frames, story pages, comprehension, creative questions, speaking, activity, review.
- **E result:** generated lessons keep looking like cards/sentences/static stories/reading questions because the modern systems are mostly heuristic add-ons to a legacy lesson contract.

## Prioritized Wiring

### P0

1. **StoryScene producer bridge:** add a small story-beat normalizer that emits `storyScene` for 1-2 safe templates (`charObject`, `locationActivity`) using existing story-cast/env assets. High visible impact, renderer already exists.
2. **HeroProp semantic bridge:** let producer/activity planner request a small set of already-shippable king stages intentionally, instead of relying mostly on regex title matches.
3. **Pre-A1 minimal mechanic bridge:** wire only the highest reuse Pre-A1 pieces: classroom instructions, TPR actions, and simple sound/trace boards. Do not import the whole stockpile.
4. **Keep vocab count honest:** maintain the new 5-strong-over-6-weak rule and watch app-run logs for generic verb padding.

### P1

1. **A1/A2 structural renderer slices:** pick one or two reusable structures (QA board, simple route/map, transaction counter) and give producer exact semantics.
2. **Real setting/story environment use:** map story `visualTheme`/caption to story-env keys where safe.
3. **Warm-up/literacy polish for Pre-A1-A2:** extend current phonics/coloring paths before touching larger CEFR stockpiles.

### P2 / Parked

- Horizontal H1-H6 remains raw durable only.
- B1/B2 discourse/argument systems wait for deterministic semantic UI.
- Hide/reveal closed/open swaps wait for a state mechanic.
- Multi-lesson modules are later only.
- C1/C2 are future only.
