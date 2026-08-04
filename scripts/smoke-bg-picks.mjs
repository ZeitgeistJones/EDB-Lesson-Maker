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

// Mirror alias expansion used in sceneBackgrounds.js
const ALIASES = {
  clinic: ['doctor', 'medical', 'hospital', 'checkup'],
  clinics: ['doctor', 'medical', 'hospital'],
  doctors: ['doctor'],
  nurse: ['doctor', 'medical', 'hospital'],
  nurses: ['doctor', 'medical'],
  patient: ['doctor', 'medical', 'hospital'],
  sick: ['doctor', 'medical', 'health'],
  illness: ['doctor', 'medical', 'health'],
  fever: ['doctor', 'medical', 'health'],
  appointment: ['doctor', 'checkup', 'medical'],
  diagnosis: ['doctor', 'medical', 'hospital'],
  symptom: ['doctor', 'medical', 'health'],
  symptoms: ['doctor', 'medical', 'health'],
  prescription: ['pharmacy', 'medicine', 'doctor', 'medical'],
  medicine: ['pharmacy', 'medical', 'health'],
  bandage: ['doctor', 'medical'],
  checkup: ['doctor', 'medical', 'checkup'],
};

function expandTags(tags) {
  const out = new Set();
  for (const raw of tags || []) {
    for (const t of norm(raw)) {
      out.add(t);
      const extra = ALIASES[t];
      if (extra) extra.forEach((x) => out.add(x));
    }
  }
  return [...out];
}

function rank(tags, category) {
  const want = new Set(expandTags(tags));
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
  const flatKeys = Object.keys(m.flats);
  if (section.preferFlat) {
    const key = flatKeys[index % flatKeys.length];
    return { type: 'flat', name: key, reason: 'preferFlat' };
  }
  const tags = [
    ...(section.tags || []),
    ...norm(section.title),
    ...(section.vocabulary || []),
  ].filter(Boolean);
  const ranked = rank(tags, section.category);
  if (ranked.length && ranked[0].score >= minScore) {
    return { type: 'scene', ...ranked[0] };
  }
  const key = flatKeys[index % flatKeys.length];
  return {
    type: 'flat',
    name: key,
    reason: ranked[0] ? `${ranked[0].name}@${ranked[0].score}` : 'none',
  };
}

function planFor(sections) {
  const out = [];
  let flatCount = 0;
  let placeScene = null;
  for (const sec of sections) {
    if (!sec.preferFlat && placeScene) {
      out.push({ ...placeScene, reused: true });
      continue;
    }
    const p = pickFor(sec, flatCount);
    if (p.type === 'flat') flatCount++;
    if (p.type === 'scene' && !placeScene) placeScene = p;
    out.push(p);
  }
  return out;
}

function standOn(pick, pieceHeight) {
  if (pick.type === 'scene' && pick.groundY) return pick.groundY - pieceHeight;
  return Math.round(590 * 0.55) - Math.round(pieceHeight / 2);
}

function spineSections(topic, vocab) {
  return [
    { title: topic, tags: ['title', topic], vocabulary: vocab },
    { title: 'Warm Up', tags: ['warmup'], vocabulary: [], preferFlat: true },
    { title: 'New Words', tags: ['vocabulary'], vocabulary: [], preferFlat: true },
    { title: 'Words in Sentences', tags: ['sentences'], vocabulary: [], preferFlat: true },
    { title: 'Sentence Frames', tags: ['frames'], vocabulary: [], preferFlat: true },
    { title: 'Story', tags: ['story', topic], vocabulary: vocab },
    { title: 'Reading Comprehension', tags: ['comprehension'], vocabulary: [], preferFlat: true },
    { title: 'Speaking', tags: ['speaking'], vocabulary: [], preferFlat: true },
    { title: 'Activity', tags: ['activity', topic], vocabulary: vocab },
    { title: 'Wrap Up', tags: ['wrap'], vocabulary: [], preferFlat: true },
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
    label: 'clown-clinic',
    topic: 'The Clown at the Clinic',
    vocab: ['diagnosis', 'symptoms', 'prescription', 'checkup'],
    expectScene: /doctor|hospital|clinic|medical|pharmacy/i,
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
  {
    label: 'gym',
    topic: 'The Clown at the Gym',
    vocab: ['clumsy', 'energetic', 'athletic'],
    expectScene: /gym|school|playground|sport/i,
  },
];

let failed = 0;
for (const c of cases) {
  const sections = spineSections(c.topic, c.vocab);
  const picks = planFor(sections);
  if (picks.length !== sections.length) {
    console.error('FAIL length', c.label, picks.length, sections.length);
    failed++;
    continue;
  }
  const scenes = picks.filter((p) => p.type === 'scene');
  const flats = picks.filter((p) => p.type === 'flat');
  const titlePick = picks[0];
  const warmPick = picks[1];
  const vocabPick = picks[2];
  const storyPick = picks[5];
  const activityPick = picks[8];
  console.log(`\n=== ${c.label}: ${c.topic} ===`);
  console.log(
    `  title → ${titlePick.type}:${titlePick.name} score=${titlePick.score ?? '-'}`,
  );
  console.log(`  warm  → ${warmPick.type}:${warmPick.name}`);
  console.log(`  vocab → ${vocabPick.type}:${vocabPick.name}`);
  console.log(`  story → ${storyPick.type}:${storyPick.name}`);
  console.log(`  activity → ${activityPick.type}:${activityPick.name}`);
  console.log(`  mix scenes=${scenes.length} flats=${flats.length}`);

  if (titlePick.type !== 'scene' || !c.expectScene.test(titlePick.name)) {
    console.error(`  FAIL title scene expected ~${c.expectScene}, got`, titlePick);
    failed++;
  }
  if (warmPick.type !== 'flat' || vocabPick.type !== 'flat') {
    console.error('  FAIL warm/vocab should be flat', warmPick, vocabPick);
    failed++;
  }
  if (storyPick.type !== 'scene' || storyPick.name !== titlePick.name) {
    console.error('  FAIL story should reuse title scene', storyPick);
    failed++;
  }
  if (activityPick.type !== 'scene' || activityPick.name !== titlePick.name) {
    console.error('  FAIL activity should reuse title scene', activityPick);
    failed++;
  }
  if (flats.length < 4 || scenes.length < 3) {
    console.error(`  FAIL expected mix flats>=4 scenes>=3 got f=${flats.length} s=${scenes.length}`);
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
