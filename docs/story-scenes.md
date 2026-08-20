# Composable story scenes (v1 direction — locked)

**Status:** All **8** templates implemented in `public/lib/storyScene.js`. First 4 E2E: `scripts/fixtures/story-scene-mia-leo-lesson.json`. Remaining 4 E2E: `scripts/fixtures/story-scene-templates-4-lesson.json` → `tmp/story-scene-templates-4/`. **Cast expansion / new art paused** — fixtures use existing Mia/Leo + PropBank only.

**Goal:** Stop stocking unlimited bespoke story stills. Assemble each story beat from reusable cutouts into one of **8 fixed templates**. The producer chooses semantics; a deterministic placer fills **named slots**. Gemini StoryArt stays an optional whole-stage upgrade — Ready never depends on it.

See also: [story-art.md](story-art.md) (current opportunistic stills path).

## Hard invariants

- Board **1280×590**; story page background stays a **quiet flat** (H2). Never full-bleed place art under reading text.
- Composition lives only in the **story stage** (`artSafe` / side / banner in [`edbLayout.js`](../public/lib/edbLayout.js)).
- Multi-page A1 side stage targets **~520px** wide so illustration carries meaning (not a 240–300px sticker strip).
- Slots use **normalized stage coords (0–1)** — producer never invents freeform x/y.
- Missing pieces degrade a slot (omit / emoji / caption); the page stays Ready.
- **No silent pose lies:** verbs like kick/climb/eat must not render as walk/idle. Unsourced dedicated poses omit the layer and warn.
- StoryArt (if enabled) may replace the **entire stage** as one image; it does not invent per-slot coords.

## Producer contract

Per story beat:

```text
storyScene: {
  templateId: "charObject" | "dialogue" | "exchange" | "action" |
              "group3" | "travel" | "heroFocus" | "locationActivity",
  actionVerb?: "finds" | "holds" | "gives" | ...,  // honesty check vs pose
  slots: {
    /* named fills — characters, props, env — no pixel positions */
  }
}
```

## Eight templates

| Id | When | Slots (paint order back→front) |
|----|------|--------------------------------|
| `charObject` | kid + thing | `ground` → `object` → `actor` |
| `dialogue` | two talking | `ground` → `speakerA` → `speakerB` |
| `exchange` | give / take / show | `ground` → `giver` → `receiver` → `item` |
| `action` | verb in progress | `ground` → `support` → `actor` |
| `group3` | three people | `ground` → `left` → `right` → `center` |
| `travel` | go / arrive | `skyOrPath` → `vehicleOrGoal` → `actor` |
| `heroFocus` | one big noun | `ground` → `hero` (+ optional `witness`) |
| `locationActivity` | place + doing | `backdrop` → `prop` → `actor` (+ optional `actorB`) |

Scale classes: `actor` | `fruit` | `ball` | `handheld` | `book` | `held` | `furniture` | `envBackdrop` | `envMidground` | `envStrip` | `env` | `ground` | `hero`.  
Furniture is a **rear strip** for ordinary PropBank desks/sofas. **Story-env keys use env modes** (below), not furniture scale. Held/exchange items use a **hand-band** anchor.

### Story-env stage modes (renderer — fix placer before stocking more art)

Fit harness: `scripts/preview-story-env-mia-fit.mjs` → `tmp/story-env-mia-fit/mia-env-fit-contact.jpg` (`locationActivity` @ ~520×400).

| Mode | Examples | Stage behavior |
|------|----------|----------------|
| **backdrop** | pool, fields, woods, zoo, ocean, pasture, train/bus interior, construction | Full-bleed cover, actors inset *into* the place, envFg ankle apron |
| **midground** | classroom, home, bedroom, closet, hotel/airport desk, clinic | ~72–90% stage width, actors stand in the zone (not beside a sticker), envFg apron |
| **strip** | grass, path, road, platform, bus-stop curb | Full-width ground plane under feet; apron heavy so feet sit *in* the strip |

Shared floor ≈ `ACTOR_FLOOR_Y` (0.94). Override with `fill.envMode` or `fill.scaleClass: envBackdrop|envMidground|envStrip`.

**envFg:** bottom band of the same env plate redrawn above actors’ ankles — intentional mild occlusion so the place receives the kid (not random full-body cover).

Art still wants one silhouette per PNG — but **do not stockpile more envs until this contact sheet looks right**.

## E2E findings → pose policy (Pre-A1 / A1)

Real fixture + demand sample (168 beats; 36 A1) showed the 7×3 emotion matrix is the wrong stock unit. Stock **high-reuse communicative poses**, then a short dedicated-action list — not every emotion×pose cell first.

### Renderer / layout (fixed in producer — no new art)

| Issue | Fix |
|-------|-----|
| Apple/ball huge vs kids | Infer `fruit` / `ball` / `handheld` / `book` scale classes |
| Book floating mid-gap | Exchange `item` hand-band + center anchor; receiver prefers `reach` |
| Desk dominates, kids tiny | `furniture` rear strip; actors keep ~0.8+ stage height |
| Side stage too weak for A1 | ~520px multi-page side stage |
| Kick shown as walk | Honesty map — do not allow; fixture reworded to `holds` until kick plate exists |

### Needs dedicated action plate (do **not** fake with walk/idle)

From Pre-A1/A1 fixture verbs + demand action beats, prioritize later (still paused):

1. **kick** — sports stories teach the verb; walk-beside-ball fails
2. **climb** — playground (slide)
3. **eat** / **drink** — food routines (hold+food is weak for “eat”)
4. **throw** / **catch** — games
5. **wave** — greetings / conductor / clown
6. **push** — cart / door (reach is only partial)
7. **jump** / **bounce** — trampoline / pool (rare but unmistakable)

Defer until after kick/climb prove reuse: brush, swim, ride, juggle, dance, write, mix, lift.

### Safe reuse of generic poses (no new art)

| Pose | Covers honestly |
|------|-----------------|
| `idle` | stand, look, see, wait, “is / has” presence |
| `reach` | find, pick, take, put, open, point, zipper |
| `hold` | hold, carry, give/show (with exchange item), apron/hose contact |
| `walk` | walk, go, come; **run only as locomotion**, never kick/score |
| `talk` / `listen` | say, ask, dialogue |
| `sit` | sit, seated read/wait (dentist chair, desk) |

### Revised minimal cast stock (per who) — paused generation

**Ship next (when unpaused), not 100-matrix:**

| Priority | Pose | Emotions | Why |
|----------|------|----------|-----|
| P0 | idle, hold, walk, talk, sit, reach | happy + neutral | Covers majority of A1 beats |
| P0 | listen | neutral | Dialogue / dentist / teacher |
| P1 | kick, climb, eat | happy | High-lie risk if faked |
| P2 | wave, throw, push | happy | Recurring but narrower |
| Later | worried variants of P0 | worried | Feelings lessons only |

Drop “full 7 poses × 3 emotions × N cast” as the default Manus unit. Prefer **pose completeness for meaning** over emotion completeness.

### Template tweaks (4 prototype)

| Template | Change |
|----------|--------|
| `charObject` | Actor larger; object in reach band; prefer `reach` for find/pick |
| `action` | Support at feet by default; lift to hand band when pose=`hold`; require `actionVerb` honesty |
| `exchange` | Actors closer; item in shared hand zone; receiver `reach` |
| `locationActivity` | Backdrop = furniture strip behind; optional `actorB`; kids not scaled to fit giant env |

## Minimum asset metadata

| Field | Values |
|-------|--------|
| `type` | `character` \| `pose` \| `prop` \| `hero` \| `env` \| `background` |
| `scaleClass` | `env` \| `furniture` \| `hero` \| `actor` \| `prop` \| `handheld` \| `fruit` \| `ball` \| `book` \| `held` \| `ground` |
| `anchor` | `bottom` (default) \| `center` |
| `facing` | `left` \| `right` \| `front` |
| `pose` | closed reusable set + optional dedicated action ids (`kick`, `climb`, …) |
| `emotion` | neutral, happy, worried (surprised/sad only if feelings track needs them) |
| `holdable` / `container` | exchange / receive eligibility |
| `who` | stable cast id across beats |

No bone parenting in v1 — “holding” is the `item` / `support` slot near hands.

## Stocking policy

Worth stocking: small recurring **cast** × **high-reuse poses** (above); **holdables/heroes** (overlap vocab/PropBank); **~30–50 furniture/env strips** (desk, stall, path, counter — mid-ground only); existing quiet flats.

Not worth stocking: one PNG per paragraph; open-ended pose strings; per-lesson custom stills; full emotion×pose matrices before action honesty is solved.

## Demand validation

Empirical demand: run `node scripts/story-scene-demand.mjs` → `tmp/story-scene-demand/report.md`.

Do not invent new templates unless a meaningful share of real beats cannot fit these eight.

## Non-goals (until demand + shortlist are locked)

- Full 8-template binder + Gemini `storyScene` emission (4-template E2E prototype is live)
- Manus / image generation for additional cast / env / dedicated action plates (**paused**)
- Replacing activity king-stage or vocab docks
- B2 CEFR asset waves under this track
