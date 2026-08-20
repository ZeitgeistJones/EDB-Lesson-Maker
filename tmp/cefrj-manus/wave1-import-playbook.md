# CEFR-J Wave1 — import playbook (staging only)

Reusable zip/CDN → inbox path for A1/A2 nouns + verbs. **Does not commission Manus.**  
Pack writes (`public/assets/07_vocab-pack`) stay with the Import / Wave1 import agent.

## Staging dirs (ready)

| Kind  | Inbox |
|-------|--------|
| Nouns | `assets-inbox/manus-cefrj-nouns-w1` |
| Verbs | `assets-inbox/manus-cefrj-verbs-w1` |

## 1. Fetch Manus task assets by `task_id`

Polls an existing task and downloads image attachments (no new task).

```bash
# Nouns → dedicated fetch dump (then copy/stage into inbox if needed)
node scripts/manus/fetch-task-assets.mjs --task=<TASK_ID> --out=tmp/cefrj-manus/fetch-nouns-w1 --label=cefrj-nouns-w1

# Verbs
node scripts/manus/fetch-task-assets.mjs --task=<TASK_ID> --out=tmp/cefrj-manus/fetch-verbs-w1 --label=cefrj-verbs-w1

# Already finished — skip poll
node scripts/manus/fetch-task-assets.mjs --task=<TASK_ID> --out=tmp/cefrj-manus/fetch-nouns-w1 --skip-poll
```

npm alias:

```bash
npm run assets:fetch-manus-task -- --task=<TASK_ID> --out=tmp/cefrj-manus/fetch-nouns-w1 --label=cefrj-nouns-w1
```

After fetch: PNGs land under `--out` as `01-…png`, plus `run.json` / `messages-raw.json`.  
Copy sheet PNGs into the matching inbox **or** prefer a Downloads zip (step 2).

## 2. Stage a Downloads zip (no pack write)

```bash
# Nouns
npm run assets:stage-inbox-zip -- "%USERPROFILE%\Downloads\<nouns.zip>" --inbox=assets-inbox/manus-cefrj-nouns-w1

# Verbs
npm run assets:stage-inbox-zip -- "%USERPROFILE%\Downloads\<verbs.zip>" --inbox=assets-inbox/manus-cefrj-verbs-w1

# Same zip already staged → hash-skip; re-copy with --force
npm run assets:stage-inbox-zip -- "%USERPROFILE%\Downloads\<verbs.zip>" --inbox=assets-inbox/manus-cefrj-verbs-w1 --force

# Dry run
npm run assets:stage-inbox-zip -- "%USERPROFILE%\Downloads\<nouns.zip>" --inbox=assets-inbox/manus-cefrj-nouns-w1 --dry-run
```

Equivalent:

```bash
node scripts/manus/stage-inbox-zip.mjs "C:\Users\<you>\Downloads\<file>.zip" --inbox=assets-inbox/manus-cefrj-nouns-w1
```

Writes PNGs + `.source-hash.txt` into the inbox. **Does not** touch `07_vocab-pack`.

> Do **not** use `assets:stage-picturable-verbs` / `stage-verb-zip.mjs` for CEFR-J — that helper targets `manus-shift60-verbs-wN` only.

## 3. Import nouns → `07_vocab-pack`

Wave1 commission should leave sheet keys in a plan `run.json` (same shape as scrubbed queues: `sheets[].keys`, 3×3 white vocab).

**When Wave1 importer exists** (expected name TBD — wire alias then):

```bash
# Preferred once one-shot importer lands
npm run assets:import-cefrj-wave1
# or dry-run / inbox override as documented on that script
```

**Until then — pattern A (scrubbed-queue style)** if Wave1 mirrors `tmp/.../taskN/run.json` + `taskN/` inbox layout:

```bash
node scripts/manus/import-scrubbed-queues.mjs --dry-run --inbox=assets-inbox/manus-cefrj-nouns-w1
# Only after Wave1 points PLAN_ROOT / adapts importer for cefrj — do not force shift60 plan paths
```

**Pattern B — manual per sheet** (safe anytime; Import track owns pack):

```bash
npm run assets:vocab-sheet -- assets-inbox/manus-cefrj-nouns-w1/<sheet>.png --sheet --grid=3x3 --names=k1,k2,k3,k4,k5,k6,k7,k8,k9 --white-min=200 --white-chroma=32 --gutter-inset=8
```

Keys must match commission order (L→R, T→B), slugified (`apple pie` → `apple-pie`).

## 4. Import verbs (wave placeholder)

Verb wave number **TBD**. Use placeholder **`WAVE=10`** or label **`cefrj`** until Wave1 locks it.

**Staging is already wave-agnostic** (inbox `manus-cefrj-verbs-w1`).

**Import options when plan lands:**

```bash
# If Wave1 extends picturable-verbs importer to wave 10 + cefrj plan dir:
npm run assets:import-picturable-verbs -- --wave=10 --dry-run
npm run assets:import-picturable-verbs -- --wave=10

# Or inbox override once importer accepts cefrj inbox + matching run.json:
node scripts/manus/import-picturable-verbs.mjs --wave=10 --inbox=assets-inbox/manus-cefrj-verbs-w1 --dry-run
```

**Manual per sheet** (same as nouns):

```bash
npm run assets:vocab-sheet -- assets-inbox/manus-cefrj-verbs-w1/<sheet>.png --sheet --grid=3x3 --names=v1,v2,v3,v4,v5,v6,v7,v8,v9 --white-min=200 --white-chroma=32 --gutter-inset=8
```

Theme-match note: picturable-verb importer matches PNG **filename ↔ sheet theme** (not sheet order). Keep theme tokens in Manus zip filenames.

## Lead checklist when zips land

1. Stage (no pack write):

   ```bash
   npm run assets:stage-inbox-zip -- "%USERPROFILE%\Downloads\<nouns.zip>" --inbox=assets-inbox/manus-cefrj-nouns-w1
   npm run assets:stage-inbox-zip -- "%USERPROFILE%\Downloads\<verbs.zip>" --inbox=assets-inbox/manus-cefrj-verbs-w1
   ```

2. Confirm PNG counts vs commission sheet count; spot-check filenames.

3. **Import track only** — dry-run then real import into `07_vocab-pack` (Wave1 importer or `assets:vocab-sheet`).

4. Optional CDN path: `fetch-task-assets` → copy PNGs into the same inboxes → same import step.

5. After pack write: `npm run coverageloop` (and discovery scrub if that wave uses it).

## Out of scope / do not

- Do not send / commission Manus from this playbook.
- Do not edit `tmp/cefrj-manus/manus-nouns-a1-a2.txt` filtering.
- Do not run pack import from the staging-only track while Wave1 import agent owns `07_vocab-pack`.
