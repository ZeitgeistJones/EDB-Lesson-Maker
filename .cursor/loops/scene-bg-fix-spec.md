# scene-bg-fix-spec

**Type:** read-only diagnosis → apply-ready spec (producer owned by live builder this window — DO NOT edit their files; this is the handoff spec).
**Date:** 2026-08-08
**Trigger:** `assetgap-shipped-scan.md` flagged "Scene backgrounds never selected — all 25 fixtures pick `scenes=0 flats=10`; 80 scene PNGs in `08_backgrounds` unused."

---

## TL;DR root cause (one-liner)

**It is not a scoring bug.** Scene scoring works (doctor→`doctors-office` 18, music→`classical-terrace-moonlit` 14, both far above the `minScore=4` floor). Scenes are skipped because **`preferFlat: true` short-circuits `pickFor` before `rank()` ever runs** — and that flag is set on every page **on purpose** (quiet washes read better under card chrome). The scan's "0 scenes" number is a **measurement artifact**: the harness it ran (`smoke-bg-picks.mjs`) hardcodes `preferFlat: true` on *every* section — including title/activity — so it can never reproduce even the one scene the real producer *does* select (the terrace for music lessons).

So there are two separate things, and only the second is worth a code change:
1. **Intended design** — chrome/story pages stay flat; only music-mood lessons earn a scene. Confirmed by code comments + a smoke assertion that *fails if a scene appears*. Leave as-is.
2. **Dishonest measurement** — the test/scan spine doesn't mirror the real producer, so every future scan will keep re-flagging this non-bug. **This is the fix.**

---

## Runtime evidence (real picker, file-backed fetch, `public/lib/sceneBackgrounds.js`)

```
rank(['doctor','clinic','checkup','medical']) top5:
  doctors-office(13), hospital-room(12), vet-clinic(9), dentist-office(4), pharmacy(4)

pickFor(doctor,  preferFlat=false) -> scene  doctors-office            score=18
pickFor(music,   preferFlat=false) -> scene  classical-terrace-moonlit score=14
pickFor(music,   preferFlat=TRUE ) -> flat   classical-moon-a
```

The only variable that flips scene→flat is the `preferFlat` flag. Scoring is healthy.

---

## Where it happens (exact functions / lines)

### The gate (correct, intended — do not "fix")
`public/lib/sceneBackgrounds.js` → `pickFor()` (~L480–498):

```js
if (section.preferFlat) {
  return pickFlat(...);      // returns before rank() — scenes never considered
}
...
const ranked = await rank(tags, section.category);
if (ranked.length && ranked[0].score >= minScore) { return { type:'scene', ... }; }
```

### Who sets preferFlat (real producer — intended)
`public/lib/renderLessonPages.js` → `buildSectionList()` (~L551–627). Every section is `preferFlat: true` **except** title/activity/wrap, which are `preferFlat: !musicTitle` (L568, L622, L624). `musicTitle` is true only when `SceneBackgrounds.moodsFor(topicBlob)` includes `'music'`. Net: only music/classical lessons ever surface a scene, and only the terrace.

### The dishonest measurement (THIS is the bug to fix)
- `scripts/smoke-bg-picks.mjs` → `spineSections()` (L47–61): **hardcodes `preferFlat: true` on all 10 sections**, including title & activity. Then L112 asserts `scenes.length > 0` is a FAILURE. So the "shipping picker" test structurally cannot show a scene — even the `music` fixture (cases.json `id:"music"`) reads as `scenes=0`.
- `scripts/debug-bg-picker.mjs` → `spine()` (L60–69): same hardcoded `preferFlat: true`. This is the script that wrote the `scenes=0 flats=10` numbers the scan quoted.

Because neither harness calls (or mirrors) `buildSectionList`, they measure a spine the producer never emits.

---

## Proposed change (apply-ready, for the builder who owns these files)

**Goal:** make the measurement match the producer so scans report the truth, without changing shipped board behaviour.

**Option A (preferred — single source of truth).** Have the smoke test build its spine from the real `buildSectionList` instead of a local `spineSections`. `renderLessonPages.js` is browser-global (`window.LessonPages`), so in the Node VM harness, load it the same way `sceneBackgrounds.js` is loaded (shared `window` sandbox), then call `window.LessonPages.buildSectionList(lesson, meta)` to get the sections, and feed those to `planFor`. This makes the music fixture correctly show a terrace scene and keeps every other fixture flat.

- File: `scripts/smoke-bg-picks.mjs`
  - Delete `spineSections()` (L47–61).
  - Load `public/lib/renderLessonPages.js` into the same sandbox that already holds `window.SceneBackgrounds` (it depends on `window.SceneBackgrounds`, so load scene BG first). Guard: it also touches `document`/DOM in `render`, but `buildSectionList` + `normalizeLesson` are pure — if the module throws at eval on missing DOM globals, stub `document = { }` in the sandbox, or extract `buildSectionList` is not possible without editing the producer, so prefer the sandbox stub.
  - Replace the per-case `const sections = spineSections(...)` with `const sections = win.LessonPages.buildSectionList(lesson, c.meta || {})`.

**Option B (cheaper, no producer coupling).** Keep the local spine but make it mirror the `musicTitle` rule so the harness is honest: set title/activity/wrap `preferFlat` to `!moodsFor(topicBlob).includes('music')` using the already-exported `SceneBackgrounds.moodsFor`. Then relax the L112 assertion: allow `scenes.length` up to (music ? 3 : 0) and assert flats-only for non-music fixtures.

Pick **A** if the sandbox eval of `renderLessonPages.js` is clean; fall back to **B** if the DOM coupling makes A fragile. B is lower-risk for a 10-minute apply.

**Also update the stale scan claim:** `.cursor/loops/assetgap-shipped-scan.md` row should read "scenes intentionally suppressed on chrome/story pages (preferFlat); only music lessons earn the terrace — not a picker bug. 78/80 place scenes are currently dormant by design." (This file may be builder-touched — coordinate; do not edit under collision lock.)

---

## Risk

- **Option A:** medium — `renderLessonPages.js` may reference `document`/`window` at module-eval time; if so the VM load throws. Mitigate with a minimal DOM stub in the sandbox, or fall back to B. No shipped behaviour changes (test-only file).
- **Option B:** low — test-only edit; uses already-exported `moodsFor`. Only risk is drift from `buildSectionList` if the producer's music rule changes later (A avoids this).
- Neither option changes what students see on a board. This is purely making the *scan* stop lying.

---

## Verify assertion to add (locks the fix)

In `scripts/smoke-bg-picks.mjs`, after planning each case:

```js
// Music-mood lessons MUST earn at least one scene (terrace);
// every other fixture MUST stay flats-only. Locks the preferFlat contract
// so a future scan can't mis-report "scenes never selected".
const isMusic = /music|classical|compose|orchestra|symphony|concert/i.test(lesson.title || '');
if (isMusic && scenes.length < 1) { console.error(`  FAIL music lesson ${c.id} earned no scene`); failed++; }
if (!isMusic && scenes.length > 0) { console.error(`  FAIL non-music ${c.id} leaked a scene: ${scenes.map(s=>s.name)}`); failed++; }
```

(If Option A is used, this assertion passes against the real producer spine; the current blanket `scenes.length > 0 → FAIL` at L112 must be removed/relaxed to allow the music case.)

---

## Open product question (not a bug — for the human)

78 of 80 scene PNGs are dormant by design. Two honest paths:
- **Keep** them as a reserve for future scene-building activities (drag objects INTO a place) and the music terrace — accept they're unused on today's spine.
- **Or** let *place-topic* title/activity pages opt into their matched scene (doctor→doctors-office) the way music already does. Scoring already supports this (doctor→18). This is a design call about readability vs. richness, not a code defect — Manus feedback historically favoured quiet flats under chrome, so default to "keep dormant" unless the human wants richer place title pages.
