/**
 * Smoke: scene picks for doctor / travel / school topics + standOn math.
 * Run: node scripts/smoke-bg-picks.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const m = JSON.parse(
  fs.readFileSync(path.join(root, 'public/assets/08_backgrounds/manifest.json'), 'utf8')
);

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function rank(tags, category) {
  const want = new Set(tags.flatMap(norm));
  const out = [];
  for (const [name, scene] of Object.entries(m.scenes)) {
    let score = 0;
    const sceneTags = new Set((scene.tags || []).flatMap(norm));
    const nameWords = new Set(norm(name));
    for (const t of want) {
      if (sceneTags.has(t)) score += 3;
      if (nameWords.has(t)) score += 2;
    }
    if (category && scene.category === category) score += 1;
    if (score > 0) {
      out.push({
        name,
        score,
        groundY: scene.groundY,
        specificity: (scene.tags || []).length,
        file: scene.file,
      });
    }
  }
  out.sort(
    (a, b) =>
      b.score - a.score ||
      a.specificity - b.specificity ||
      a.name.localeCompare(b.name)
  );
  return out;
}

function pickFor(section, index = 0) {
  const minScore = 4;
  const tags = [
    ...(section.tags || []),
    ...norm(section.title),
    ...(section.vocabulary || []),
  ].filter(Boolean);
  const ranked = rank(tags, section.category);
  if (ranked.length && ranked[0].score >= minScore) {
    return { type: 'scene', ...ranked[0] };
  }
  const flatKeys = Object.keys(m.flats);
  return {
    type: 'flat',
    name: flatKeys[index % flatKeys.length],
    reason: ranked[0] ? `${ranked[0].name}@${ranked[0].score}` : 'none',
  };
}

function standOn(pick, pieceHeight) {
  if (pick.type === 'scene' && pick.groundY) return pick.groundY - pieceHeight;
  return Math.round(590 * 0.55) - Math.round(pieceHeight / 2);
}

function spineSections(topic, vocab) {
  return [
    { title: topic, tags: ['title', topic], vocabulary: vocab },
    { title: 'Warm Up', tags: ['warmup', 'warm-up', topic], vocabulary: vocab },
    { title: 'New Words', tags: ['vocabulary', 'words', 'matching', topic], vocabulary: vocab },
    { title: 'Words in Sentences', tags: ['vocabulary', 'sentences', 'grammar', topic], vocabulary: vocab },
    { title: 'Sentence Frames', tags: ['grammar', 'frames', topic], vocabulary: vocab },
    { title: 'Story', tags: ['story', topic], vocabulary: vocab },
    { title: 'Reading Comprehension', tags: ['comprehension', 'reading', topic], vocabulary: vocab },
    { title: 'Speaking', tags: ['speaking', 'talk', topic], vocabulary: vocab },
    { title: 'Activity', tags: ['activity', topic], vocabulary: vocab },
    { title: 'Wrap Up', tags: ['wrap', 'review', 'goodbye', topic], vocabulary: vocab },
  ];
}

const cases = [
  {
    label: 'doctor',
    topic: "At the Doctor's Office",
    vocab: ['doctor', 'nurse', 'sick', 'appointment'],
    expectScene: /doctor|hospital|clinic|medical/i,
  },
  {
    label: 'travel',
    topic: 'Airport Travel Day',
    vocab: ['passport', 'ticket', 'suitcase', 'gate'],
    expectScene: /airport|travel|station|bus|train/i,
  },
  {
    label: 'school',
    topic: 'First Day at School',
    vocab: ['teacher', 'classroom', 'pencil', 'friend'],
    expectScene: /school|classroom|library|hallway/i,
  },
];

let failed = 0;
for (const c of cases) {
  const sections = spineSections(c.topic, c.vocab);
  const picks = sections.map((s, i) => pickFor(s, i));
  if (picks.length !== sections.length) {
    console.error('FAIL length', c.label, picks.length, sections.length);
    failed++;
    continue;
  }
  const scenes = picks.filter((p) => p.type === 'scene');
  const titlePick = picks[0];
  const vocabPick = picks[2];
  console.log(`\n=== ${c.label}: ${c.topic} ===`);
  console.log(
    `  title → ${titlePick.type}:${titlePick.name} score=${titlePick.score ?? '-'}`,
  );
  console.log(
    `  vocab → ${vocabPick.type}:${vocabPick.name} score=${vocabPick.score ?? vocabPick.reason}`,
  );
  console.log(`  scenes ${scenes.length}/${picks.length}:`, scenes.map((s) => s.name).join(', ') || '(none)');

  if (titlePick.type !== 'scene' || !c.expectScene.test(titlePick.name)) {
    console.error(`  FAIL title scene expected ~${c.expectScene}, got`, titlePick);
    failed++;
  }
  if (vocabPick.type !== 'scene' || !c.expectScene.test(vocabPick.name)) {
    console.error(`  FAIL vocab scene expected ~${c.expectScene}, got`, vocabPick);
    failed++;
  }
  // Files must exist
  for (const p of picks) {
    const file =
      p.type === 'scene'
        ? m.scenes[p.name]?.file
        : m.flats[p.name]?.file;
    const fp = path.join(root, 'public/assets/08_backgrounds/img', file || '');
    if (!file || !fs.existsSync(fp)) {
      console.error('  FAIL missing file', p.name, file);
      failed++;
    }
  }
  if (titlePick.type === 'scene') {
    const y = standOn(titlePick, 96);
    const expect = titlePick.groundY - 96;
    if (y !== expect) {
      console.error('  FAIL standOn', y, expect);
      failed++;
    } else {
      console.log(`  standOn(96) → ${y} (groundY ${titlePick.groundY}) OK`);
    }
  }
}

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log('\nAll smoke checks passed.');
