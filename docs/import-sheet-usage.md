# `assets:import-sheet` — bulk contact-sheet importer (how-to)

One command turns a single contact sheet into a folder of **staged, manifest-safe** prop
cutouts + one QA composite. It wraps the deterministic keyer (`scripts/import-prop.mjs`) so no
one has to fork that script again to do a staged bulk run.

- Script: `scripts/import-sheet.mjs`
- npm verb: `npm run assets:import-sheet -- <args>`
- **It never writes the live manifest or the `09_props/img` dir.** Output goes to a stage dir.

## What it does, in order
1. Slices + keys **every cell** of the `--grid` in one browser pass.
2. Auto-forces the **soft** gates and hard-blocks only **C1 / C6 / C7** tiles, listing the
   handful to regenerate.
3. Applies `--prefix` so `--names` can be bare nouns (`sci-` + `beaker` → `sci-beaker`).
4. Writes staged PNGs + a `<prefix>-rows.json` (manifest-shape rows, each with a `stagedPath`)
   to the stage dir.
5. Emits **one** QA composite (`<prefix>-qa.jpg`) — light / dark / scene / 96px-dock surfaces.

Your only remaining jobs: naming the cells, reviewing the one QA sheet, and eyeballing any
flagged (hard-blocked) tiles.

## Invocation
```
npm run assets:import-sheet -- <sheet.png> --grid=RxC --names=<n1,n2,...> [flags]
```
Note the `--` after the npm verb: everything after it is passed to the script.

Example (a 4×4 science sheet):
```
npm run assets:import-sheet -- assets-inbox/science-4x4.png --grid=4x4 --prefix=sci- \
  --names=beaker,flask,test-tube,dropper,goggles,magnet,scale,tongs,petri-dish,molecule,burner,cylinder,lab-coat,magnifier,thermometer,funnel \
  --roles=tool --scales=0.2 --anchors=bottom --pack=science \
  --stage=tmp/manus-import-batch3/science
```

## Flags
| Flag | Meaning |
|------|---------|
| `--grid=RxC` | **Required.** Sheet layout in whole numbers, e.g. `--grid=4x4`. |
| `--names=a,b,…` | **Required.** One bare noun per cell in **reading order** (left→right, top→bottom). Count must equal R×C. |
| `--prefix=theme-` | Prepended to every name for key/filename. A name that already carries the prefix is left alone (so the same list works pre- or un-prefixed). |
| `--roles=…` | Parallel to `--names`; a short list falls back per the keyer (a single value applies to all). |
| `--scales=…` | Parallel to `--names`. If omitted, `relativeScale` is a placeholder `0.5` — set it deliberately before merge. |
| `--anchors=…` | Parallel to `--names` (`bottom` / `top` / `center`). |
| `--pack=name` | Theme pack tag recorded on each staged row. |
| `--stage=dir` | Output dir. Default `tmp/import-sheet/<prefix-or-sheet-name>`. |
| `--stage-all` | Keep **every** non-empty tile, even hard-blocked ones, for review. |
| `--no-qa` | Skip the QA composite. |
| `--threshold --size --margin --white --white-tol` | Forwarded to the keyer. Use `--white` for white-field sheets. |

## Stage vs merge
- **Stage (this tool):** slices/keys into a **tmp** dir, writes `*-rows.json` + `*-qa.jpg`, and
  does a **read-only** manifest key-scan for dedup. Nothing in `public/` changes. This is the
  whole verb — it is stage-only by design.
- **Merge (separate, manifest-owner step):** whoever owns `manifest.json` takes the
  `*-rows.json`, copies the kept PNGs into `09_props/img/`, and adds the rows. Because staging
  already keyed + QA'd + deduped, merge is mechanical/instant. Set real `relativeScale` values
  at (or before) merge if you used the placeholder.

## The C1 / C6 / C7-only blocking rule
On a real sheet you *expect* soft-gate noise (a rainbow spans wide, a thermometer + sun read as
two shapes). So the bulk importer **auto-forces soft gates** and only **hard-blocks** the three
gates that mean the tile is genuinely unkeyable:

- **C1** — background isn't a clean black (or white with `--white`) field → keying would smear.
- **C6** — near-black interior areas that keying would erase → holes in the prop.
- **C7** — edge colour doesn't match the interior → the rim would key away.

Everything else (C2 margins, C3 safe-area, C4 fill, C5 shape count, C8 dock size) is **forced
and kept**, and listed in the summary as "soft-forced, look but kept" so you can eyeball them in
the QA sheet. Only C1/C6/C7 tiles land in "HARD-BLOCKED, regenerate these."

## Reading the summary
```
Clean auto-keyed (N):     — passed every gate, no eyeballing needed
Soft-forced, look but kept (N): key-name [C4,C5] — kept, glance at these in the QA sheet
HARD-BLOCKED, regenerate these (N): key-name (reason) — re-generate the source cell
Dedup skips, key already in manifest (N): — not offered for merge (already shipped)
```
`dedup` is a **read-only key-name scan only** — it flags exact key collisions, not tag/word
overlaps. A later manifest-side merge is the authoritative dedup. Treat stage dedup as
provisional.

## Gotchas
- **Name count must equal cells.** The script exits if `--names` length ≠ R×C.
- **Reading order matters** — cells are named row-major; get the order right or keys land on the
  wrong art.
- **Placeholder scale.** No `--scales` → every row gets `relativeScale: 0.5`. Fix before merge so
  a pencil and a bookshelf aren't drawn the same size.
- **Non-zero exit is normal.** If any tile hard-blocks, the wrapper still finishes and writes
  rows + QA; the non-zero code just signals "some tiles need regeneration."
