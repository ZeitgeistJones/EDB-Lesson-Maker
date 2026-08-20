# Aggressive stockpile S4 — roles / a11y / micro-actions / alt views

Pack 4 of the aggressive Manus stockpile. **Stockpile only.** No producer, recipe, Capacity, UI, or renderer wiring. If anything later merges into PropBank, keys must use prefix `aggressive-s4-` via `mutateManifest` + lock.

## Partition

- Sheets: `harvested/manus-aggressive-stockpile/s4-roles-a11y/`
- Runner: `scripts/manus/request-aggressive-s4.mjs`
- Inventory: `docs/aggressive-stockpile-s4-inventory.json`

## Streams (commissioned)

**Max 1 in-flight Manus task.** e6 downloaded; f6 next (photographer / tailor / mechanic / dentist / librarian / coach). hk6 is H micro-actions + K **cutaways only**.

| Stream | Concepts through hk6 | Notes |
|---|---:|---|
| **E** | 171 | e6 landed |
| **F** | 171 | f6 unique vs f–f5; no F4 re-list |
| **H** | 54 | hk6 pending |
| **K** | 54 | hk6 cutaways only |

SAFETY_SKIP is **word-boundary** only. 429: wait 90s, one retry; still 429 wait 180s and stop.

## Dedupe notes

- lt4 tropical/textile/poses/civic/gardens — do not re-commission.
- **F5 overlap with F4 (HOLD):** `wire-stripper`, `paint-roller`, `drop-cloth`, `cooling-rack`, `bench-scraper`, `floral-tape`. F6 must not repeat those.
- H dedupes Mia/Leo + H1/lt2/lt4. No wiring.

## Manus tasks

| Wave | Task | Sheets | Status |
|---|---|---:|---|
| s4e | https://manus.im/app/kKj2fHHDAr2j35KbSpMGdz | 4 | downloaded |
| s4f | https://manus.im/app/CDm82MVxynHdKYAK9mkjBz | 4 | downloaded |
| s4hk | https://manus.im/app/jmLt4hwHVW3SSx27ACLazk | 2 | downloaded |
| s4e2 | https://manus.im/app/REQWtyE5BiBveUmDDVmhmh | 3 | downloaded |
| s4f2 | https://manus.im/app/XHNzcNnm23Pa7fvA2f23KA | 3 | downloaded |
| s4hk2 | https://manus.im/app/hwypqnRJgRnurdbjjvN4GV | 2 | downloaded |
| s4e3 | https://manus.im/app/MBcDskMYX4fw8He2ZJMrtY | 3 | downloaded |
| s4f3 | https://manus.im/app/dP6TDjUGm79Snv4ivuqUGt | 3 | downloaded |
| s4hk3 | https://manus.im/app/i6vxaeGsRGfAZx5c2nkQ6S | 2 | downloaded |
| s4e4 | https://manus.im/app/nMDvvGPkSY3qtKqMxCouHs | 3 | downloaded |
| s4f4 | https://manus.im/app/Ho7UhFymYms6MsZib8gKU9 | 3 | downloaded |
| s4hk4 | https://manus.im/app/YfdjAFES9zps9QEejDak39 | 2 | downloaded |
| s4e5 | https://manus.im/app/hqYUeZraUmchkZkwShrmr4 | 3 | downloaded |
| s4f5 | https://manus.im/app/3CWM2kr6XhNJzChyfvHBHj | 3 | downloaded |
| s4hk5 | https://manus.im/app/9vWw9gf3ToeWKYrZoNheDm | 2 | downloaded |
| s4e6 | https://manus.im/app/JA7NUPjvX3PGdPweDpzVwd | 3 | downloaded |
| s4f6 | https://manus.im/app/fj9BkVYTfbQacDyugWodd6 | 3 | downloaded |
| s4hk6 | https://manus.im/app/7js3L4DWDASFjqsXAWn9f3 | 2 | downloaded |
| s4e7 | https://manus.im/app/BJ9wBP86KqVcj3jxQYawPU | 3 | **in-flight** |

## QA

E S1 access sensory: **PASS**. Remaining numbered sheets raw; no PropBank merge. F5 dupes vs F4: HOLD.
