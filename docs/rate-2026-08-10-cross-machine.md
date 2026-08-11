# Rate snapshot + cross-machine divergence notes

**Machine:** Windows Cursor session on this PC (`EDB-Lesson-Maker` main)  
**When:** 2026-08-10 (evening ET)  
**Slash:** `/rate` → subject `EDB Lesson Maker`, scope `app`  
**Confidence:** medium  
**Saved locally:** `.cursor/ratings/history.jsonl` (gitignored; this doc is the shareable copy)

## Scores (this machine)

| Category | Score | One-line why |
|----------|------:|--------------|
| Clarity | 58 | Topic→board is graspable; Ready/Draft + PDF≠board still muddy for a stranger |
| Real need | 74 | Teachers really hate hand-building ClassIn decks |
| UX | 54 | Generate/download works; hollow docks / chrome still fight the teacher |
| Trust | 62 | Honesty gates (S73, match pads, ~83% art floor) help; Draft can still ship |
| Retention | 56 | Weekly lesson-prep fit, not a daily habit product |
| Competitive edge | 72 | Few tools bake recipe + props + ClassIn `.edb` like this |
| Build quality | 64 | Solid bake/judge/import spine; M5 / art coverage still soft |
| **Overall** | **63** | Weighted **need + edge + trust** over polish |

**Blunt overall:** real need + unique edge; still mixed as a *teacher-facing* product.

**Raise overall fastest (this rater’s call):** make Ready mean “match dock complete / not hollow” and block dishonest downloads harder.

---

## Why this may disagree with the other computer

I **don’t have** the other machine’s score table in front of me. Treat this as a checklist for that chat to rebut line-by-line—not as a claim that it’s “wrong.”

### A. Ways **this machine may be under-rating** (lacking context)

1. **Thin product surface time.** This session lived in producer/assets/gates (Manus vocab, Ready floor, home-warm, feelings dock). Little time watching a cold teacher click Generate → Download → ClassIn. UX/clarity scores punish that gap.
2. **No longitudinal quality scoreboard feel.** The other machine may have ridden many `quality:full` loops, pillar averages, and “boards got nicer week over week.” Build quality here is scored from *structure + recent honesty work*, not from a long bake memory.
3. **Underweighted craft wins already shipped.** King-stage kits, phonics policy, matchDock honesty, story integrity, beach/home flats—those are load-bearing. A rater who only sees remaining Draft holes will score trust/UX lower than someone who remembers the before state.
4. **Different “overall” weighting.** Here: need + compete + trust. Another rater may weight *build quality / pipeline maturity* higher because that’s what they sweat daily—and overall jumps.

### B. Ways the **other machine may be over-rating**

1. **Producer pride bias.** Deep time on importers, gates, and skills feels like product strength. Teachers don’t feel scripts; they feel the board. Easy to score quality/UX from the machinery instead of the download.
2. **Fixture / happy-path inflation.** Core fixtures and Ready-green cases can look like “the product works.” Adversarial / clubs-class / partial-art lessons are the trust drag—easy to underweight if you live in green bakes.
3. **Confusing “system is sophisticated” with “product is strong.”** Dual-lens judges, H*/M*/S*, Manus reviews, wishlists = impressive ops. Competitive edge rises fairly; clarity/UX often shouldn’t rise in lockstep.
4. **Habit / need blur.** “I return to improve the producer every day” ≠ “teachers return because the product is sticky.” Retention should be about *teacher* return reasons.
5. **Grade clustering.** If many categories sit 78–88, that’s a smell. Mid bands (41–60, 61–75) should be common for an MVP-hardening ESL tool that still ships Draft boards.

### C. Shared truth (probably neither machine is fully right)

- **Need + edge are the real highs.** The bet is right: ClassIn ESL boards are painful; automation here is rare.
- **Trust/UX are the real ceiling.** Honesty work this week (Ready art floor, story S73, match-dock gaps admin-only, Manus still-life preference) is the correct direction—and also proof the product wasn’t already “strong” on teacher trust.
- **Build quality is two layers:** (1) producer loop = strong and compounding; (2) shipped lesson consistency = still uneven. Rating “the app” without splitting those will swing ±10 easily.

---

## Prompt for the other computer (paste this)

> Read `docs/rate-2026-08-10-cross-machine.md`. Compare your last `/rate` table to this machine’s scores. For each category where you differ by ≥8 points, say: (1) your score, (2) whether you think **you overrated**, **they underrated from missing context**, or **scope mismatch**, (3) one concrete evidence item. Then give a reconciled overall you’d both accept—or say you still disagree and why.

---

## Evidence this machine *did* have (so “no context” isn’t total)

Recent main work in view: Manus white vocab imports, volcano V12 (+ deferred V12b queued), Ready `VOCAB_ART_FLOOR` → 5/6, beach-warm e–h, home-warm a–d place-true / e–h unset for picker, feelings dock pack-backed excited/tired fix, story integrity already gated (S73). That supports **need/edge/quality-mid**—not **UX-high**.
