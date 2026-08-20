# Aggressive stockpile S2 — variants / clusters / overlays

Pack 2 harvest stream. Stockpile only. No PropBank wiring, no producer/recipe/renderer edits.

- Prefix: `aggressive-s2-`
- Durable root: `harvested/manus-aggressive-stockpile/s2-variants`
- Runner: `scripts/manus/request-aggressive-s2.mjs`
- Updated: 2026-08-19T18:12:26.383Z

## Rate-limit lock

- **No new fires. No `--all --fire`.** Max 1 in-flight poll.
- Poll interval 35s. On HTTP 429: wait 90s, one retry, then double wait.
- Do not send continue-messages. Download/QA locally while waiting.

## Counts

| Kind | n |
|---|---|
| variants (B) | 404 |
| clusters (J) | 272 |
| overlays (G) | 144 |
| registered states (G) | 151 |
| total cells | 971 |
| sheets planned | 62 |

Deduped vs live bank + visual-grammar + long-tail lt1–lt10. Skips H5 lamp/bag/plug pairs. Does not clone LT/VG matched pair cells.

## Waves

### s2-w1-variant

- Title: Aggressive S2 W1 variants (4 sheets)
- Sheets: 4 (expected)
- Concepts: 64
- Task: mg66GXwFek7TaQZRCpUeTS https://manus.im/app/mg66GXwFek7TaQZRCpUeTS
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-w2-variant

- Title: Aggressive S2 W2 variants (4 sheets)
- Sheets: 4 (expected)
- Concepts: 64
- Task: 2xkGnZE5RtRZfQFHbu8oH3 https://manus.im/app/2xkGnZE5RtRZfQFHbu8oH3
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-w3-variant

- Title: Aggressive S2 W3 variants (4 sheets)
- Sheets: 4 (expected)
- Concepts: 64
- Task: RncPkA2ryiYEaoFz4gSNKM https://manus.im/app/RncPkA2ryiYEaoFz4gSNKM
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-w4-variant

- Title: Aggressive S2 W4 variants (4 sheets)
- Sheets: 4 (expected)
- Concepts: 64
- Task: 5tfKeciVqWc72MtCjn5JEc https://manus.im/app/5tfKeciVqWc72MtCjn5JEc
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-w5-variant

- Title: Aggressive S2 W5 variants (1 sheets)
- Sheets: 1 (expected)
- Concepts: 4
- Task: 8VQKAWufN4mWkvTzgUDgzL https://manus.im/app/8VQKAWufN4mWkvTzgUDgzL
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-c1-cluster

- Title: Aggressive S2 C1 clusters (4 sheets)
- Sheets: 4 (expected)
- Concepts: 64
- Task: FF8FXY4mJVaGG3hPN6UupN https://manus.im/app/FF8FXY4mJVaGG3hPN6UupN
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-c2-cluster

- Title: Aggressive S2 C2 clusters (4 sheets)
- Sheets: 4 (expected)
- Concepts: 64
- Task: dhnzwY3uyRj6W3MPxUNhhe https://manus.im/app/dhnzwY3uyRj6W3MPxUNhhe
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-c3-cluster

- Title: Aggressive S2 C3 clusters (4 sheets)
- Sheets: 4 (expected)
- Concepts: 64
- Task: g8Jv8ZXTLXEDzNxxFgDEeV https://manus.im/app/g8Jv8ZXTLXEDzNxxFgDEeV
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-c4-cluster

- Title: Aggressive S2 C4 clusters (1 sheets)
- Sheets: 1 (expected)
- Concepts: 16
- Task: LtEV6uBg96SUY4ksVv7yWo https://manus.im/app/LtEV6uBg96SUY4ksVv7yWo
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-o1-overlay

- Title: Aggressive S2 O1 overlays (4 sheets)
- Sheets: 4 (expected)
- Concepts: 64
- Task: FKS9j2ygZ3MzAKg6anitFb https://manus.im/app/FKS9j2ygZ3MzAKg6anitFb
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-o2-overlay

- Title: Aggressive S2 O2 overlays (1 sheets)
- Sheets: 1 (expected)
- Concepts: 16
- Task: 3LiYi3cXsFgGuBLCaXDPeQ https://manus.im/app/3LiYi3cXsFgGuBLCaXDPeQ
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-t1-state

- Title: Aggressive S2 T1 states (4 sheets)
- Sheets: 4 (expected)
- Concepts: 64
- Task: dRoM6Sd49yfKeqjcR6WihM https://manus.im/app/dRoM6Sd49yfKeqjcR6WihM
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-t2-state

- Title: Aggressive S2 T2 states (4 sheets)
- Sheets: 4 (expected)
- Concepts: 64
- Task: 4GCGctZ63q7xr7vmGbVLrj https://manus.im/app/4GCGctZ63q7xr7vmGbVLrj
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-t3-state

- Title: Aggressive S2 T3 states (1 sheets)
- Sheets: 1 (expected)
- Concepts: 7
- Task: dsKhqQtM2y99S78tdBNSaY https://manus.im/app/dsKhqQtM2y99S78tdBNSaY
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-n1-variant

- Title: Aggressive S2 N1 variants-next (4 sheets)
- Sheets: 4 (expected)
- Concepts: 64
- Task: 3qWxaENAHxoKhmDxPuNtHb https://manus.im/app/3qWxaENAHxoKhmDxPuNtHb
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-n2-variant

- Title: Aggressive S2 N2 variants-next (1 sheets)
- Sheets: 1 (expected)
- Concepts: 16
- Task: MWP5KtHz7n2rYFyCGa2RRy https://manus.im/app/MWP5KtHz7n2rYFyCGa2RRy
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-n3-variant

- Title: Aggressive S2 N3 variants-next (1 sheets)
- Sheets: 1 (expected)
- Concepts: 16
- Task: kEnC8T3RjbFwhAcYuGiVqV https://manus.im/app/kEnC8T3RjbFwhAcYuGiVqV
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-n4-variant

- Title: Aggressive S2 N4 variants-next (1 sheets)
- Sheets: 1 (expected)
- Concepts: 16
- Task: 9LFuajTAfdiqaCGSc7uCXq https://manus.im/app/9LFuajTAfdiqaCGSc7uCXq
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-n5-variant

- Title: Aggressive S2 N5 variants-next (1 sheets)
- Sheets: 1 (expected)
- Concepts: 16
- Task: NSXGRiQ6n353U2ATTcZnWL https://manus.im/app/NSXGRiQ6n353U2ATTcZnWL
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-n6-variant

- Title: Aggressive S2 N6 variants-next (1 sheets)
- Sheets: 1 (expected)
- Concepts: 16
- Task: PRisinSqKE8UeR5HLSc3he https://manus.im/app/PRisinSqKE8UeR5HLSc3he
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-g1-overlay

- Title: Aggressive S2 G1 overlays-next (1 sheets)
- Sheets: 1 (expected)
- Concepts: 16
- Task: 7DJ9S92iNzWdAV2i4LobdP https://manus.im/app/7DJ9S92iNzWdAV2i4LobdP
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-g2-overlay

- Title: Aggressive S2 G2 overlays-next (1 sheets)
- Sheets: 1 (expected)
- Concepts: 16
- Task: 8iqw3BUEun9mMUwTHEz7ua https://manus.im/app/8iqw3BUEun9mMUwTHEz7ua
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-g3-overlay

- Title: Aggressive S2 G3 overlays-next (1 sheets)
- Sheets: 1 (expected)
- Concepts: 16
- Task: R8mxkFAnzhpZZWUQHPUtr4 https://manus.im/app/R8mxkFAnzhpZZWUQHPUtr4
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-g4-overlay

- Title: Aggressive S2 G4 overlays-next (1 sheets)
- Sheets: 1 (expected)
- Concepts: 16
- Task: PFrLAzL89sdRcPA6ayw5ce https://manus.im/app/PFrLAzL89sdRcPA6ayw5ce
- Agent: stopped
- QA: PASS (black field, no key labels; 16 construction overlays)

### s2-t4-state

- Title: Aggressive S2 T4 states-next (1 sheets)
- Sheets: 1 (expected)
- Concepts: 16
- Task: HM2xKMVFXbxCct4nMeGk8j https://manus.im/app/HM2xKMVFXbxCct4nMeGk8j
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-c5-cluster

- Title: Aggressive S2 C5 clusters (1 sheets)
- Sheets: 1 (expected)
- Concepts: 16
- Task: dZMuqXAC5L56PVvWg5oK73 https://manus.im/app/dZMuqXAC5L56PVvWg5oK73
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-c6-cluster

- Title: Aggressive S2 C6 clusters (1 sheets)
- Sheets: 1 (expected)
- Concepts: 16
- Task: kyZUd2d3fbaLAoaxx45bWM https://manus.im/app/kyZUd2d3fbaLAoaxx45bWM
- Agent: stopped
- QA: PASS 0 / HOLD 0

### s2-c7-cluster

- Title: Aggressive S2 C7 clusters (1 sheets)
- Sheets: 1 (expected)
- Concepts: 16
- Task: (pending) 
- Agent: (n/a)
- QA: PASS 0 / HOLD 0

### s2-c8-cluster

- Title: Aggressive S2 C8 clusters (1 sheets)
- Sheets: 1 (expected)
- Concepts: 16
- Task: DR6o3wnTZYqD3bHE9x9CzR https://manus.im/app/DR6o3wnTZYqD3bHE9x9CzR
- Agent: stopped
- QA: PASS 0 / HOLD 0

## Running total

```json
{
  "variant": 404,
  "cluster": 272,
  "overlay": 144,
  "state": 151,
  "total": 971,
  "sheets": 62,
  "original_manus_worthy": 971,
  "pass": 0,
  "hold": 0,
  "locally_recovered": 0,
  "regenerated": 0,
  "safety_skipped": 0,
  "sheets_downloaded": 61,
  "tasks_used": 28
}
```

