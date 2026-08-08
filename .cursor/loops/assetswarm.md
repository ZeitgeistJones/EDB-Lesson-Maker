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

## Coverage pre-scan (MANDATORY — run before spawning any loop)

The swarm's most expensive failure is spending loops **rediscovering packs it
already has**. A recent run burned roughly half its loops re-generating weather,
animals, jobs and sports props that were already keyed and shipping. Fix it at
the coordinator, before the fan-out — never let a loop find out mid-run.

Before spawning **any** per-topic loop, the coordinator scans the existing pack
coverage for **every** candidate topic — the ones passed on the command line as
well as any it would pick itself:

1. **Read the manifest** `public/assets/09_props/manifest.json` and build the set
   of keys/`pack` tags already on disk. Cross-reference `assets:prop-demand`
   (`npm run assets:prop-demand`) and the `covered_before` blocks in
   `.cursor/loops/assetscout-*.md`.
2. **Classify each candidate topic** against what's already there:
   - **Mature pack** (≈6+ keyed props, gates clean) → **SKIP** the topic
     entirely. Do not spawn a loop for it.
   - **Partial pack** (a few keys, obvious holes) → **NARROW** the topic: spawn
     the loop but hand it the exact list of keys already covered so it only fills
     the genuine gaps, not the whole set.
   - **Empty** (no matching keys) → spawn a full loop.
3. **Pass the already-covered keys down to each loop.** Every spawned loop must
   be told, in its brief, the exact `<topic>-*` keys that already exist so its
   step-1 vocab pick and step-2 disk scan start from the real gap, not from zero.
   "Owns topic X; these keys already exist and are OFF-LIMITS: X-foo, X-bar;
   generate only fresh gaps."

**Duplicates → variants, don't discard.** When a loop lands a second good prop
for a word that's already covered, do NOT reflexively skip it. If the duplicate
is **gate-clean AND visually good / stylistically distinct** from the existing
one, KEEP it as a variant: name it `<key>-v2` (then `-v3`…), or add
`"variantOf": "<baseKey>"` to its row. The picker rotates variants across
lessons for visual variety and already guards against two variants of the same
word landing on one page, so extra good art is pure upside. Only skip **true
junk or near-identical copies** (same pose/palette, no added variety) — those
are noise, not variants. Report kept variants in the topic summary.

Example — invoked `/assetswarm 5 weather, sports, transport, animals, jobs`, but
the manifest already has mature `weather-*`, `animals-*`, `jobs-*`, `sports-*`
packs and only a thin `transport-*` set:

- SKIP `weather`, `animals`, `jobs`, `sports` (mature — spawning them just
  rediscovers what ships).
- NARROW `transport`: spawn one loop, tell it `transport-car`, `transport-train`
  already exist → fill only `transport-bus`, `transport-boat`, `transport-airplane`,
  `transport-bicycle`.
- Net: **1 useful loop instead of 5**, and the coordinator reports the four
  skips so the caller can feed in genuinely new topics next time.

If the pre-scan leaves fewer live topics than `<N>`, don't pad the count with
near-duplicates — run the smaller set and report the skips. A swarm of 1 real
gap beats a swarm of 5 where 4 re-draw the pack.

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
2. **Scan existing props first** (`09_props/manifest.json` + `assets:prop-demand`),
   and honour the **already-covered keys the coordinator handed down** in the
   pre-scan — reuse anything already on disk and generate only the genuine gaps.
   Don't re-draw an off-limits key just to duplicate it; but if you happen to
   produce a gate-clean, visually distinct alternative for a covered word, stage
   it as a variant `<key>-v2` (see "Duplicates → variants" above) rather than
   throwing it away.
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
