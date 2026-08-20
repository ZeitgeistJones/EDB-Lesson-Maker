# Aggressive stockpile S5 — overflow (PARKED)

Pack 5 overflow. **Stockpile only.** No producer wiring. If later merged: prefix `aggressive-s5-` via `mutateManifest` + lock.

## Status (2026-08-19)

**Standby. Zero Manus tasks. Zero sheets.** Global cap is 4 in-flight, owned by S1–S4 (one each). S5 does not create tasks while any of those packs have work. Fire at most 1, and only after confirming S1–S4 have zero in-flight.

Do not compete for API. Download/commit only what already exists here (claimed-stems snapshot).

## Partition

- Sheets: `harvested/manus-aggressive-stockpile/s5-overflow/`
- Runner: not fired (`scripts/manus/request-aggressive-s5.mjs` not created)
- Claimed-key snapshot for later leftover fire: `harvested/manus-aggressive-stockpile/s5-overflow/_claimed-stems.json`

## Manus tasks

None.

## Sheets downloaded

None.

## Dupes avoided (claimed before any S5 fire)

In-flight / harvested keys snapshotted (~2700 stems) from aggressive S1–S4 keys/run/inventory plus long-tail lt1–lt10 and visual-grammar. Do not clone those, or VG / lt civic stages, when unparking.
