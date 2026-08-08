# assetswarm

type: swarmloop  
case: bulk parallel asset-gap fill (coordinator + N disjoint topic loops)  
repo: `C:\dev\PPT-Lesson-Maker-for-Classin`

Invocation: `/assetswarm <N> <topic1, topic2, ...>`
Example: `/assetswarm 5 weather, sports, transport, animals, jobs`

## Purpose

Fastest way to bulk-fill asset gaps: fan out **N parallel asset loops, one per
disjoint topic**. Each loop owns exactly one topic and generates in-house props
for it (same route as `/assetscout` → `.cursor/skills/prop-cutouts`). The
coordinator does the ONE shared write — appending manifest rows — serialized at
the end, so N loops never race on the same file.

## Invocation

`/assetswarm <N> <topic1, topic2, ...>`

- `<N>` — how many parallel loops (= number of topics).
- `<topics>` — comma-separated, one per loop, must be **disjoint** (no shared
  pack/vocab overlap). If topics are omitted, the coordinator picks `N` fresh
  topics **not already well-covered** by existing packs — check
  `.cursor/loops/assetscout-*.md` `covered_before` + `09_props/manifest.json`
  `pack` tags before choosing, and prefer concrete, single-object-friendly nouns
  that key cleanly on black.

## Collision-safety contract (the whole point)

Each loop is a NEW-FILES-ONLY worker. Per loop:

- **Owns exactly one topic** and puts a `<topic>-` prefix on every new asset
  filename/key (`weather-umbrella.png`, `sports-whistle.png`, …). No two loops
  can collide because the prefixes are disjoint.
- **Creates NEW files only.** Must **NOT** run the shared manifest-import/append
  step, and must **NOT** touch `renderLessonPages.js`, `vocabIcons.js`,
  `sceneBackgrounds.js`, `edbActivities.js`, any `verify-*.mjs`, gates, or any
  `*-lesson.json` fixture — those may be owned by a running manus/self loop.
- **Stages, does not merge.** Writes its proposed manifest rows to
  `tmp/assetscout-parallel/<topic>-rows.json` and a human note to
  `tmp/assetscout-parallel/<topic>-summary.md`.
- **Does NOT commit.** Only the coordinator commits.

## Per-loop steps

1. Pick **~6 concrete B1 vocab nouns** for the topic that key cleanly on black
   (light/colourful bodies, neutral fittings, one object each).
2. **Scan existing props first** (`09_props/manifest.json` + `assets:prop-demand`)
   and reuse anything already on disk — only generate the genuine gaps.
3. **Generate gaps in-house, one at a time**, on solid black — no grid, no
   labels, no baked text. Follow `.cursor/skills/prop-cutouts/SKILL.md`
   (`docs/prop-style-lock.md` is the prompt; request 1:1 + explicit filename).
4. **Key each cutout** with `scripts/import-prop.mjs` (`npm run assets:prop --
   --latest --name=<topic>-<word> --role=… --scale=… --anchor=…`). Fix any failed
   gate at the prompt and regenerate (see the SKILL gate→correction table).
5. **QA each as teacher + student** — `npm run assets:prop-qa -- --only=<slug>` and
   actually open `tmp/prop-qa.jpg`. Reject dark rims, vanishing on dark, baked-in
   text, mush at dock size, or shreds across light / dark / classroom.
6. **Capture rows** (the ready-to-paste manifest rows the importer prints) into
   `tmp/assetscout-parallel/<topic>-rows.json`; write what happened to
   `tmp/assetscout-parallel/<topic>-summary.md`. **Do not** append to the real
   manifest.

## Serialized merge (coordinator, after all loops return)

This is the **only** step that writes the shared manifest:

1. Read every `tmp/assetscout-parallel/*-rows.json` fragment.
2. Append them into `public/assets/09_props/manifest.json` **one topic at a
   time, never concurrently** — existing rows untouched, alphabetical slots.
3. **Sanity-check no duplicate keys** across the merged set (each key stays
   individually resolvable; each row carries its `pack` tag).
4. **Commit + push** with a clear message (e.g. `assetswarm: +N props across
   <topics>`).

## Composes with manus/self loops

Safe to run **alongside** a live manus/self builder loop: assetswarm never edits
producer / gate / fixture files and never touches the manifest until the single
serialized merge. It only creates new prefixed PNGs + `tmp/` staging until then.
Honors `.cursor/rules/fix-the-producer` — wiring these packs into TOPIC_SETS /
`vocabIcons.js` / fixtures is a **follow-up** for the owning producer loop, not
part of the swarm.
