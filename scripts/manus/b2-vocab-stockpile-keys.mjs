/**
 * B2 vocab stockpile wave slices — nouns first, then verbs, then adjectives.
 * Words come from tmp/cefrj-manus/b2/manus-*-b2.txt after shortlist + live dedupe at fire time.
 */
export const CELLS = 9;
export const SHEETS_PER_TASK = 11;
export const KEYS_PER_WAVE = CELLS * SHEETS_PER_TASK; // 99

/**
 * Concepts that trip Manus safety and wipe the whole sheet task (wave5: `rape`).
 * Exact-key skip at fire — do not send; log as safety_skipped in inventory.
 */
export const SAFETY_SKIP_KEYS = new Set([
  'rape',
  'massacre',
  'murder',
  'suicide',
  'torture',
  'missile', // weapon art often blocked mid-batch
  'bomb',
  'gun',
]);

/** Wave plan: POS + slice index into the kept shortlist file. nouns → verbs → adjectives. */
export const WAVES = {
  1: { id: 'wave1', pos: 'noun', slice: 0, title: 'B2 vocab stockpile wave1 — nouns batch A (99)' },
  2: { id: 'wave2', pos: 'noun', slice: 1, title: 'B2 vocab stockpile wave2 — nouns batch B (99)' },
  3: { id: 'wave3', pos: 'verb', slice: 0, title: 'B2 vocab stockpile wave3 — picturable verbs batch A (99)' },
  4: { id: 'wave4', pos: 'noun', slice: 2, title: 'B2 vocab stockpile wave4 — nouns batch C (99)' },
  5: { id: 'wave5', pos: 'verb', slice: 1, title: 'B2 vocab stockpile wave5 — picturable verbs batch B (99)' },
  6: { id: 'wave6', pos: 'noun', slice: 3, title: 'B2 vocab stockpile wave6 — nouns batch D (99)' },
  // Remaining nouns (shortlist ~883 → slices 0–8)
  7: { id: 'wave7', pos: 'noun', slice: 4, title: 'B2 vocab stockpile wave7 — nouns batch E (99)' },
  8: { id: 'wave8', pos: 'noun', slice: 5, title: 'B2 vocab stockpile wave8 — nouns batch F (99)' },
  9: { id: 'wave9', pos: 'noun', slice: 6, title: 'B2 vocab stockpile wave9 — nouns batch G (99)' },
  10: { id: 'wave10', pos: 'noun', slice: 7, title: 'B2 vocab stockpile wave10 — nouns batch H (99)' },
  11: { id: 'wave11', pos: 'noun', slice: 8, title: 'B2 vocab stockpile wave11 — nouns batch I (remainder)' },
  // Remaining picturable verbs (~29 after slices 0–1)
  12: { id: 'wave12', pos: 'verb', slice: 2, title: 'B2 vocab stockpile wave12 — picturable verbs batch C (remainder)' },
  // Visual adjectives (shortlist ~565 → slices 0–5)
  13: { id: 'wave13', pos: 'adjective', slice: 0, title: 'B2 vocab stockpile wave13 — visual adjectives batch A (99)' },
  14: { id: 'wave14', pos: 'adjective', slice: 1, title: 'B2 vocab stockpile wave14 — visual adjectives batch B (99)' },
  15: { id: 'wave15', pos: 'adjective', slice: 2, title: 'B2 vocab stockpile wave15 — visual adjectives batch C (99)' },
  16: { id: 'wave16', pos: 'adjective', slice: 3, title: 'B2 vocab stockpile wave16 — visual adjectives batch D (99)' },
  17: { id: 'wave17', pos: 'adjective', slice: 4, title: 'B2 vocab stockpile wave17 — visual adjectives batch E (99)' },
  18: { id: 'wave18', pos: 'adjective', slice: 5, title: 'B2 vocab stockpile wave18 — visual adjectives batch F (remainder)' },
};

export function queuePath(pos) {
  const plural = pos === 'noun' ? 'nouns' : pos === 'verb' ? 'verbs' : 'adjectives';
  return `tmp/cefrj-manus/b2/manus-${plural}-b2.txt`;
}

export function sliceWords(allWords, sliceIndex) {
  const start = sliceIndex * KEYS_PER_WAVE;
  return allWords.slice(start, start + KEYS_PER_WAVE);
}
