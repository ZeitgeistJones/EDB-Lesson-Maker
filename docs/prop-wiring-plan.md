# Wiring `09_props` into boards

`public/assets/09_props/manifest.json` holds validated prop cutouts that **nothing reads at
runtime**. This plan makes them resolvable by *role and tag* rather than by hardcoded path, so
that adding a manifest row is sufficient for a prop to start appearing. No code change per prop.
That "no treadmill" property is the point of the whole design; protect it.

Findings below were verified by reading the code. Re-read each file before editing — line numbers
drift.

## How it works today

### `public/lib/buildEdb.js`

`pieceToPng(piece)` resolves in this order, and never silently drops:

1. vocab word via `window.VocabIcons.loadPng`
2. `piece.asset` via `loadAssetPng`
3. emoji glyph
4. word tile
5. grey placeholder

`09_props` appears nowhere in it.

Piece shape is fixed by `EdbLayout.place()` in `public/lib/edbLayout.js`:
`{ kind, asset, x, y, w, h, role, meta, text, color, size, emoji, label }`. **There is no size or
anchor concept** — recipes hardcode `w`/`h` in pixels before anything knows what art will fill
them. This is the core obstacle: `relativeScale` and `aspect` have nowhere to enter.

`loadAssetPng(src, w, h)` makes a `w × h` canvas and does `ctx.drawImage(img, 0, 0, c.width,
c.height)` — a pure stretch. An `activity-tray` (aspect 2.23) dropped in a 96×96 dock cell is
squashed to 43% width.

A `standRoles` block (`buildPart`, `dressPart`, `sortCard`, `dockPiece`) centres a row and calls
`window.SceneBackgrounds.standOn(pick, h)`, only when `pick.type === 'scene'`.

### `public/lib/exportBoardPreview.js`

Independently repeats both bugs: `ctx.drawImage(bmp, piece.x, piece.y, piece.w, piece.h)`
stretches, and it carries a near-identical copy of the stand/centre block. This duplication is why
the `.edb` you ship and the QA bake you judge from can disagree about what a board looks like.

### `public/lib/edbActivities.js`

`RECIPES` has 8 entries but `plan()` only ever assigns three: `matchDock` on `newWords`,
`coverAnswer` on `speaking:0`, and one of `dressUp`/`sortBins`/`buildScene` on `activity` by seed
bits. `orderLine`, `hideSeek` and `revealReward` are unassigned dead code — disabled because they
fought the chrome, not for prop reasons.

Nothing asks abstractly. Recipes name concrete asset paths or draw themselves with `solidPng()` /
`slotGhostPng()` / `stickyPng()`. That is the treadmill in its current form.

Fixture → recipe, from the real `hashStr` seed:

| recipe | fixtures |
| --- | --- |
| `buildScene` | clown-clinic, school |
| `sortBins` | travel, abstract-words, bad-theme, overflow |
| `dressUp` | doctor, gym, minimal |

### `public/lib/vocabIcons.js` — the pattern to mirror

`resolveKey` is a ladder where every step is data: normalize → exact key → `PACK_ALIASES` → plural
strip (skipping `-ss`/`-ous`) → last token → **`null`**.

`SAFE_EMOJI` holds exactly two curated entries, with a comment that anything else "belongs in
docs/asset-wishlist.md, not a near-enough guess." **The refusal to guess is the important half of
the pattern**, not the alias table. A prop resolver must return `null` and let the caller keep its
canvas fallback rather than ship a wrong prop.

### `public/lib/sceneBackgrounds.js` — reuse, don't reinvent

`rank(tags, category)` scores +3 exact tag, +2 name word, +1 category; ties broken by *fewer* tags
then `localeCompare` for determinism. `pickFor` applies a confidence floor of `minScore = 4`.

`flatOffset(seed, count)` is the seeded rotation (`h = h*31 + charCode`, then
`Math.abs(h) % count`). It is **not currently exported**. Seed is `lesson.title`, set once in
`renderLessonPages.js`.

### Manifest inventory

26 distinct roles. Strong: `furniture` (8), `dressPart` (6), `container` (6), `cover` (5). Thin
after the alpha filter: `sortBin` → 1 usable, `letterTile` → 1, and `rewardFlap` / `soundBoxes` /
`wordStrip` → **0**.

**Six props lack `alpha`** and would render as black squares: `sorting-bin-green`, `prize-flap`,
`tile-blue`, `sound-boxes`, `word-strip`, `pencil`.

`aspect` is `width / height`. Tags describe *recipe intent* (`build`, `dress`, `reward`, `cover`,
`phonics`, `hide`) more than *place*, with only a thin layer of place tags. So role-based
resolution works immediately; theme-based resolution mostly misses until demand fills it in.

### Harness — what props can and cannot move

`measurePage()` in `scripts/verify-board-visual.cjs` runs on the **DOM** page and finishes before
pieces are considered; pieces are folded in afterwards. Therefore:

- **M3 cannot move.** It is the DOM primary-card fill ratio; props are canvas pieces, invisible to it.
- **M4 rises** only on a page that had zero art.
- **M8 is `null`** on posters and on every scene page — exactly where scene dressing would go.
- **M5 will wobble.** A 64-bin histogram over the composited canvas, so any pixel change moves it.
  Direction is not predictable.
- **M1, M2, M6, M7 are untouchable** by props.

Three genuine gaps mean a badly sized or placed prop passes the bake clean today:

1. `layoutHardFails` iterates `pg.unlocked` **only** — a locked prop is checked for nothing.
2. Nothing compares a drawn piece's `w/h` against the manifest `aspect`.
3. Nothing verifies a prop's base landed on `groundY`, or that a `center`/`top` prop wasn't stood
   on the floor.

## Step 1 — `public/lib/propBank.js` and `scripts/prop-demand.mjs`

Classic script assigning `window.PropBank`, loaded in `public/index.html` after
`sceneBackgrounds.js`. A deliberate sibling of `VocabIcons` and `SceneBackgrounds`.

Export the rotation first: add `rotate: flatOffset` to the `window.SceneBackgrounds` object,
without changing its behaviour.

`PropBank.resolve({ role, word, tags, seed, index, exclude, minScore, family })` returns a prop
object or `null`, in this order:

1. exact key on normalized `word`/name
2. `PROP_ALIASES` — analogue of `PACK_ALIASES`, small, hand-written, meaning-level only
   (`luggage → suitcase`, `bag → backpack`, `clock → wall-clock`). No fuzzy matching.
3. scored rank over tags + role, same scoring shape as `sceneBackgrounds.rank`: +3 tag in
   `p.tags`, +2 tag in key words, +2 role match; ties → fewer tags → `localeCompare`. Confidence
   floor `minScore`, default 3.
4. role bucket — if a `role` was given and nothing cleared the floor, return that role's pool
   ordered by rotation, so `role: 'cover'` always works
5. `null` — caller keeps its canvas fallback. **Never substitute a wrong prop.**

Two hard filters run before any matching:

- `p.alpha === true`, which silently excludes the six unkeyable props so wiring cannot regress on
  them. Re-keying one later becomes a pure manifest edit that immediately puts it in play.
- `styleFamily`. The bank holds exactly two visual families that must never share a board: the
  soft-matte house style (field **absent**) and `"glossy-adventure"` (saturated game-icon art).
  `resolve()` filters to one family. The choice belongs at **lesson** level, so a lesson cannot
  change look halfway through — `PropBank.familyFor(lesson)` derives it deterministically from
  tags and title: matte for classroom and teaching content, glossy permitted for travel,
  adventure and story themes.

Variety is deterministic: take the top-score band, rotate within it via
`window.SceneBackgrounds.rotate(seed, band.length)`, offset by `index`. Seed is `lesson.title` —
the same seed `attachBgPicks` uses — so a lesson reproduces exactly while two lessons diverge.
`exclude` prevents a repeat on one page.

### Sizing — the caller supplies a height budget, never both `w` and `h`

Width derives from `aspect`, which makes distortion structurally impossible rather than merely
fixed:

```js
const MAX_PROP_H = 300; // relativeScale 1.0, against a 590px board
const MIN_PROP_H = 64;  // below this a cutout is mush
```

`h = clamp(MIN, MAX, round(maxH * (relativeScale ?? 0.5)))`, `w = round(h * (aspect || 1))`, then
shrink to fit a `maxW`. The `MIN_PROP_H` floor is a deliberate legibility-over-realism compromise:
strict real-world scale makes a pencil unreadable.

`yFor(prop, pick, h)`: `top` → 24, `center` → `round(590 * 0.42 - h / 2)`, `bottom` →
`window.SceneBackgrounds.standOn(pick, h)` — the one honest floor rule.

For scene dressing, pass `maxH` as `min(300, groundY - 140)`; a `relativeScale: 1.0` bookshelf
would otherwise bust the 590px board.

Declare the loader as `PropBank.loadPng(prop, { hue })` and **ignore `hue`**. Reserving the
signature means a future recolour pass touches one function and no callers.

### Why prop #47 needs zero code

Nothing in the layer enumerates prop keys. Inputs are `role`, `tags`, `alpha`, `aspect`,
`relativeScale`, `anchor` and `styleFamily`, read from the manifest at fetch time; recipes ask by
`role` / `tags` / `word` only. Add a row and it joins the rotation on the next bake.

Two honest exceptions: a row with a brand-new role that no recipe asks for does nothing (that is a
code change by definition, and the demand report is what stops you inventing roles nobody
queries); and a word the tags don't cover needs one `PROP_ALIASES` line, the same one-line data
edit `PACK_ALIASES` already accepts.

### `scripts/prop-demand.mjs`

Export a shared `PROP_REQUESTS` table from `propBank.js` — `{ slot, role|roles, count, distinct,
themed }` per recipe — consumed by **both** the recipes and the report, so they cannot drift.
`distinct` carries real weight: `orderLine` wants five *identical* pads, so one prop satisfies it;
`sortBins` wants two *different* bins, so one does not.

Copy the vm sandbox from `scripts/smoke-bg-picks.mjs` (`fileFetch` out of `public/`,
`vm.runInNewContext`, pull `sandbox.window.PropBank`) so the report exercises the **shipped**
resolver and cannot pass while the runtime is broken. Read lessons from
`scripts/fixtures/cases.json`, resolve every request per lesson, record the misses.

Two outputs:

1. Wishlist rows in the exact 6-column format of `docs/asset-wishlist.md`, paste-ready, with `Why`
   naming the case and the failed query.
2. Generation sheets **grouped by coherent theme, nine per sheet** — a sheet of nine unrelated
   objects is nine single generations with extra steps. Each prints the verbatim style lock, nine
   `PROP:` paragraph skeletons, the composition and negative blocks, and a ready-to-run
   `npm run assets:prop -- ... --sheet --grid=3x3 --names=... --roles=... --scales=...
   --anchors=...` line.

The script must **not** invent the `PROP:` prose — emit a flagged TODO skeleton. That sentence
needs judgement, and faking it produces bad art.

Report gaps **per style family**: "no container" and "no glossy container" are different problems.
Exit code 0 always.

### What it should print today

- `sortBin` is effectively empty — 2 entries, 1 keyed. `sortBins` runs on 4 of 9 fixtures and
  cannot get two distinct bins, so it has been drawing plain rectangles. `rewardFlap` and
  `letterTile` are in the same state.
- **Medical/clinic demand: zero matches.** No prop carries `doctor`, `medical`, `health`, `clinic`
  or `hospital`, yet two of nine core fixtures are clinic lessons and `clown-clinic` runs
  `buildScene`. This is the first sheet to generate.
- Cafeteria: one weak match. Travel: two against four fixtures of airport vocabulary. Park: one.
- School and home are already strong — which is exactly why guessing is a bad way to pick the next
  sheet. The categories that feel obvious are the ones already done.

## Step 2 — fix the stretch, in both places

`loadAssetPng` in `buildEdb.js` and `drawPiece` in `exportBoardPreview.js`: letterbox — contain
the image inside the piece rect at its natural aspect with transparent padding, instead of
filling. Independently fixes `dressBody` (180×220) and `star.svg` too.

While here, extract the duplicated stand/centre block into one shared helper so the two paths stop
drifting — **only if** it can be done without changing current output.

## Step 3 — route already-firing recipes through `PropBank`

Same rects, canvas fallback intact. Start with `sortBins`:
`PropBank.resolve({ role: 'sortBin', seed, index: i, family })`, keeping `solidPng()` on `null` —
which today it will return for the second bin. That honest visible gap is the correct outcome, not
something to paper over. Then `coverAnswer`.

Do **not** touch `matchDock` or `dressUp` dock items: those are vocabulary art owned by
`VocabIcons`, and substituting props there would hit M7 and hard rule H5. Do not wire
`orderLine` / `hideSeek` / `revealReward` — unassigned, so no bake would exercise the code.

## Step 4 — scene dressing (needs sign-off, not yet built)

Place 1–3 **locked** props via a `sceneDressing` request, standing on `groundY`, in the clear
centre band the backgrounds were composed to leave (`docs/asset-prompts.md`: the central 60% must
be empty open floor), only when `pick.type === 'scene'`. The activity page always gets a scene —
the bake enforces it as H1.

Risks: **M4 rises** on any page gaining its first art (an improvement under the rubric, but it
moves the baseline and needs explicit approval); **M5 moves unpredictably**; M8 does not move;
and **H3 will not catch a mistake here** until Step 5 lands, because locked pieces aren't
inspected — so placing near the dock zone or over the `bodyText` card is uncaught. Prefer Step 5
first.

## Step 5 — close the metric gap

Extend `layoutHardFails` to include `pg.locked` for off-board and text-zone checks. Add a bake
assertion that any piece resolved from a prop satisfies `|w/h − aspect| < 0.02`. Optionally add a
metric for text-block area occluded by pieces — the only thing that would catch a prop sitting on
the warm-up question.

Verify by deliberately mis-sizing one prop and confirming the bake fails.

New hard checks can fail on pre-existing conditions. Fix what they legitimately find; report
anything genuinely pre-existing rather than weakening the check.

## Recolour — record the metadata, don't build the pass

One place only: a `tint` option on the prop loader, applied to the decoded PNG before
`Edb.addImage`. Bolting it onto `pieceToPng` would force duplication into
`exportBoardPreview.drawPiece`, which is how the stretch bug came to exist twice.

Cost is roughly 40 lines: decode to canvas, `getImageData`, RGB→HSL per pixel, rotate hue by
`(target − bodyHue)` only where `|hue − bodyHue| < 30°` **and** `saturation > ~0.18`. The
saturation gate preserves greys and browns, and is why the style lock mandates one body colour
plus neutrals.

**Recommendation: don't build it yet.** Nothing can ask for it — no lesson field carries a colour,
no recipe has a colour parameter, no fixture is a colours lesson. When a colours lesson appears,
offline variants are likely the better answer anyway, and the pack already demonstrates the
pattern: `cover-green` / `cover-blue` / `cover-orange` / `cover-purple` are four rows with
`bodyHue` 105 / 215 / 25 / 275. Runtime tinting only wins when the target hue is genuinely
dynamic. The valuable half — `bodyHue` on 46+ props, measured by the importer — is already banked,
and that was the expensive part to retrofit.

## Deliberately out of scope

- The recolour pass — no caller exists.
- Theme-based dressing on story pages — they reuse the title scene and already carry side art.
- A general prop-placement solver. For 1–3 props on a scene's empty centre band the existing
  centred-row maths is enough.
- Reviving `orderLine` / `hideSeek` / `revealReward`. They were disabled for chrome collisions,
  not prop reasons; wiring them while unassigned means writing code no bake exercises.

The smallest thing that removes the treadmill is Steps 1–3: a resolver that speaks role and tag, a
report that says what to draw next, and a letterbox fix so what you draw isn't distorted. Step 4
is where it becomes visible, and it is the only step that costs a baseline.
