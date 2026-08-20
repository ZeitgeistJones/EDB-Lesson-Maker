# Purge `harvested/` from git history (Vercel ENOSPC fix)

## Why Vercel failed

Hobby clone unpacks the **full git history**, not just the tip.
A single pack was ~8.4 GB (`Unable to unpack repo … ENOSPC`).

**`.vercelignore` does not help.** Vercel clones git first; ignore files only affect what gets uploaded after clone.

## Confirmed sizes (local, 2026-08-19)

| Path | Approx size | Role |
|------|-------------|------|
| `harvested/` working tree | **~17.6 GB** | Manus stockpile warehouse (raw sheets) |
| `harvested/` blobs in **all history** | **~8.2 GB** | What blows Vercel clone |
| `.git/` | **~9.7 GB** | Mostly those packs |
| `public/assets/` | ~1 GB tip | **Live lesson art** (needed at runtime) |
| `assets-inbox/` history | ~0.4 GB | Inbox only; smaller than harvested |
| `tmp/` history | ~1 MB tracked | Mostly already gitignored |

**Live app does NOT need `harvested/` at runtime.** Runtime art lives under `public/` (PropBank / vocab packs). `harvested/` is producer warehouse only (Manus scripts write sheets there).

`package.json` → `"engines": { "node": "24.x" }` — keep as-is.

---

## Path A (preferred): rewrite history, then force-push main

**Requires your explicit YES.** This task never force-pushes without that.

### Before you start (backup warehouse)

1. Keep a local copy of `harvested/` on disk (or zip to an external drive).
2. Or push warehouse to a **second private repo** while files still exist locally:
   - New empty GitHub repo, e.g. `EDB-Lesson-Maker-warehouse`
   - Copy only `harvested/` into that repo and push once
3. Make sure every collaborator / machine has pushed any work they need — history rewrite rewrites commit SHAs.

### Tools

Install **git-filter-repo** (preferred over BFG):

```bash
pip install git-filter-repo
```

Or: https://github.com/newren/git-filter-repo

### Exact purge commands (run from repo root)

```bash
# 1) Confirm clean-ish working tree for the rewrite (stash unrelated edits)
git status

# 2) Remove harvested/ from EVERY commit (rewrites history)
git filter-repo --path harvested/ --invert-paths --force

# If filter-repo removed origin remote, re-add:
git remote add origin https://github.com/ZeitgeistJones/EDB-Lesson-Maker.git

# 3) Ensure tip still ignores warehouse forever
# (already in .gitignore after the tip cleanup commit)
git check-ignore -v harvested/

# 4) Verify pack size dropped (expect well under ~2 GB for Hobby comfort)
git count-objects -vH

# 5) ONLY after you approved force-push main:
git push --force origin main
```

Optional — also strip other stockpile-ish noise if still huge after harvested purge:

```bash
git filter-repo --path assets-inbox/ --invert-paths --force
# then re-add remote + force-push again (only if needed)
```

### After force-push

- Everyone must **re-clone** or hard-reset to new `main` (old SHAs are dead).
- Vercel should redeploy from the slim history.
- Keep generating Manus sheets into local `harvested/` — gitignored, never commit.

### Expected savings

Purging `harvested/` from history removes **~8.2 GB of blob payload** (the bulk of the **~9.7 GB** `.git` / Vercel unpack). After rewrite + GC, clone size should drop to roughly **app + `public/assets`** (on the order of ~1–2 GB tip content, much smaller packs). Exact post-GC pack size varies; re-check with `git count-objects -vH` before pushing.

---

## Path B (no force-push): second warehouse repo

Harder once history is already polluted — Vercel still clones polluted history until you rewrite or abandon this remote.

1. Create private repo `EDB-Lesson-Maker-warehouse`.
2. Move / copy `harvested/` there; stop committing warehouse into the app repo.
3. App repo: keep tip without `harvested/` (`.gitignore` + `git rm -r --cached harvested/`).
4. For Vercel to actually shrink, you still need either:
   - Path A history purge on the app repo, **or**
   - A **fresh** app repo / orphan history without the old packs (more disruption).

Path B alone (tip delete only) **stops growth** but **does not fix** current Vercel ENOSPC.

---

## Tip-only cleanup (already done / safe anytime)

Stops *new* commits from adding warehouse art. Does **not** shrink history:

```bash
# .gitignore must contain: harvested/
git rm -r --cached harvested/
git commit -m "Stop tracking harvested/ warehouse (Vercel clone size)"
git push
```

Files remain on your disk. Blobs remain in old commits until Path A.

---

## Approve force-push?

Reply **YES** to run Path A (filter-repo + `git push --force origin main`), or **NO** to stay on tip-only / Path B planning.
