/**
 * Smoke: background picks + standOn math, run against the REAL picker.
 *
 *   npm run test:bg-picks
 *
 * This loads public/lib/sceneBackgrounds.js in a sandbox with a file-backed
 * fetch, so the test cannot pass while the shipped picker is broken. Topics and
 * vocabulary come from scripts/fixtures/cases.json, so the smoke test and the
 * headless bake always judge the same lessons.
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');

/** Minimal fetch that serves files out of public/ the way the browser would. */
function fileFetch(url) {
  const rel = String(url).replace(/^\.?\//, '');
  const filePath = path.join(publicDir, rel);
  if (!filePath.startsWith(publicDir) || !fs.existsSync(filePath)) {
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  }
  const body = fs.readFileSync(filePath);
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => JSON.parse(body.toString('utf8')),
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  });
}

function loadSceneBackgrounds() {
  const code = fs.readFileSync(path.join(publicDir, 'lib', 'sceneBackgrounds.js'), 'utf8');
  const sandbox = { window: {}, fetch: fileFetch, console, setTimeout, clearTimeout };
  sandbox.self = sandbox;
  vm.runInNewContext(code, sandbox, { filename: 'sceneBackgrounds.js' });
  const SB = sandbox.window.SceneBackgrounds;
  if (!SB || !SB.planFor) throw new Error('sceneBackgrounds.js did not attach window.SceneBackgrounds');
  return SB;
}

/** The fixed page spine the board planner emits, in board order. */
function spineSections(topic, vocab) {
  return [
    // Title/story are calm flats — place scenes are for EDB/activity only.
    { title: topic, tags: ['title', topic], vocabulary: vocab, preferFlat: true },
    { title: 'Warm Up', tags: ['warmup'], vocabulary: [], preferFlat: true },
    { title: 'New Words', tags: ['vocabulary'], vocabulary: [], preferFlat: true },
    { title: 'Words in Sentences', tags: ['sentences'], vocabulary: [], preferFlat: true },
    { title: 'Sentence Frames', tags: ['frames'], vocabulary: [], preferFlat: true },
    { title: 'Story', tags: ['story', topic], vocabulary: vocab, preferFlat: true },
    { title: 'Reading Comprehension', tags: ['comprehension'], vocabulary: [], preferFlat: true },
    { title: 'Speaking', tags: ['speaking'], vocabulary: [], preferFlat: true },
    { title: 'Activity', tags: ['activity', topic], vocabulary: vocab },
    { title: 'Wrap Up', tags: ['wrap'], vocabulary: [], preferFlat: true },
  ];
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(publicDir, 'assets/08_backgrounds/manifest.json'), 'utf8')
);
const caseManifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'cases.json'), 'utf8')
);

const SB = loadSceneBackgrounds();
let failed = 0;

for (const c of caseManifest.cases || []) {
  const lesson = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', c.fixture), 'utf8'));
  const vocab = (lesson.vocabulary || []).map((v) => v.word).filter(Boolean);
  const expectScene = new RegExp(c.expectScene, 'i');
  const sections = spineSections(lesson.title, vocab);
  // Seeded the same way attachBgPicks does, so this tests shipping behaviour.
  const picks = await SB.planFor(sections, { seed: lesson.title || '' });

  console.log(`\n=== ${c.id}: ${lesson.title} ===`);
  if (picks.length !== sections.length) {
    console.error(`  FAIL length ${picks.length} vs ${sections.length}`);
    failed++;
    continue;
  }

  const scenes = picks.filter((p) => p.type === 'scene');
  const flats = picks.filter((p) => p.type === 'flat');
  const [titlePick, warmPick, vocabPick] = picks;
  const storyPick = picks[5];
  const activityPick = picks[8];

  console.log(`  title → ${titlePick.type}:${titlePick.name} score=${titlePick.score ?? '-'}`);
  console.log(`  vocab → ${vocabPick.type}:${vocabPick.name}   story → ${storyPick.type}:${storyPick.name}`);
  console.log(`  activity → ${activityPick.type}:${activityPick.name} score=${activityPick.score ?? '-'}`);
  console.log(`  mix scenes=${scenes.length} flats=${flats.length}`);

  if (titlePick.type !== 'flat' || storyPick.type !== 'flat') {
    console.error(`  FAIL title/story should be flat (${titlePick.type}/${storyPick.type})`);
    failed++;
  }
  if (warmPick.type !== 'flat' || vocabPick.type !== 'flat') {
    console.error(`  FAIL warm/vocab should be flat (${warmPick.type}/${vocabPick.type})`);
    failed++;
  }
  if (activityPick.type !== 'scene' || !expectScene.test(activityPick.name)) {
    console.error(`  FAIL activity scene expected ~/${c.expectScene}/, got ${activityPick.type}:${activityPick.name}`);
    failed++;
  }
  if (flats.length < 4 || scenes.length < 1) {
    console.error(`  FAIL expected mix flats>=4 scenes>=1, got f=${flats.length} s=${scenes.length}`);
    failed++;
  }

  for (const p of picks) {
    const file = p.type === 'scene' ? manifest.scenes[p.name]?.file : manifest.flats[p.name]?.file;
    const onDisk = file && fs.existsSync(path.join(publicDir, 'assets/08_backgrounds/img', file));
    if (!onDisk) {
      console.error(`  FAIL missing asset for ${p.type}:${p.name} (${file || 'no file'})`);
      failed++;
    }
    if (!p.path) {
      console.error(`  FAIL pick has no path: ${p.type}:${p.name}`);
      failed++;
    }
  }

  if (activityPick.type === 'scene' && activityPick.groundY) {
    const y = SB.standOn(activityPick, 96);
    const expect = activityPick.groundY - 96;
    if (y !== expect) {
      console.error(`  FAIL standOn ${y} expected ${expect}`);
      failed++;
    } else {
      console.log(`  standOn(96) → ${y} (groundY ${activityPick.groundY}) OK`);
    }
  }
}

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log('\nAll smoke checks passed (real picker).');
