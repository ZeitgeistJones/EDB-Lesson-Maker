/**
 * Readiness loop — random A1 topics scored for vocab art + place flat BGs.
 * Ignores kit/hero-stage (BoardReadiness.assess ignoreKit). No Gemini.
 *
 *   npm run test:readiness-loop
 *   node scripts/readiness-loop.mjs --round=1 --seed=42
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'tmp', 'readiness-loop');
const PUBLIC = path.join(ROOT, 'public');

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

/** ~30 diverse A1 topic titles + 6 vocab each (hand-authored, no Gemini). */
const TOPIC_POOL = [
  { title: 'At the Dentist', words: ['tooth', 'brush', 'dentist', 'clean', 'smile', 'floss'] },
  { title: 'Airport Adventure', words: ['plane', 'passport', 'suitcase', 'ticket', 'boarding gate', 'flight'] },
  { title: 'Our Family Home', words: ['mother', 'father', 'kitchen', 'bedroom', 'sofa', 'family'] },
  { title: 'Day at the Zoo', words: ['lion', 'monkey', 'elephant', 'tiger', 'zebra', 'zoo'] },
  { title: 'Park Play Time', words: ['park', 'ball', 'slide', 'swing', 'run', 'friend'] },
  { title: 'Beach Day Fun', words: ['beach', 'sand', 'shell', 'wave', 'sun', 'swim'] },
  { title: 'Morning at the Bakery', words: ['bread', 'cake', 'bakery', 'oven', 'cookie', 'flour'] },
  { title: 'School Classroom', words: ['teacher', 'book', 'pencil', 'desk', 'school', 'student'] },
  { title: 'Parts of the Face', words: ['eyes', 'nose', 'mouth', 'ears', 'hair', 'face'] },
  { title: 'Healthy Habits', words: ['wash', 'soap', 'sleep', 'water', 'fruit', 'exercise'] },
  { title: 'Sports Day', words: ['soccer', 'basketball', 'run', 'jump', 'ball', 'team'] },
  { title: 'Train Station Trip', words: ['train', 'ticket', 'platform', 'seat', 'bag', 'station'] },
  { title: 'Kitchen Helpers', words: ['spoon', 'plate', 'cup', 'cook', 'knife', 'bowl'] },
  { title: 'Farm Animals', words: ['cow', 'pig', 'chicken', 'horse', 'sheep', 'farm'] },
  { title: 'Weather Walk', words: ['sun', 'rain', 'cloud', 'wind', 'umbrella', 'cold'] },
  { title: 'Supermarket Shopping', words: ['apple', 'bread', 'milk', 'cart', 'shop', 'bag'] },
  { title: 'Hotel Stay', words: ['bed', 'key', 'room', 'hotel', 'towel', 'luggage'] },
  { title: 'Doctor Visit', words: ['doctor', 'nurse', 'medicine', 'fever', 'hospital', 'sick'] },
  { title: 'Birthday Party', words: ['cake', 'balloon', 'gift', 'party', 'friend', 'candle'] },
  { title: 'City Bus Ride', words: ['bus', 'stop', 'ticket', 'seat', 'driver', 'street'] },
  { title: 'Garden Growing', words: ['flower', 'tree', 'seed', 'water', 'garden', 'leaf'] },
  { title: 'Library Quiet Time', words: ['book', 'read', 'library', 'shelf', 'story', 'quiet'] },
  { title: 'Clothes Closet', words: ['shirt', 'pants', 'shoes', 'hat', 'socks', 'jacket'] },
  { title: 'Pet Care', words: ['dog', 'cat', 'fish', 'bird', 'pet', 'feed'] },
  { title: 'Music Class', words: ['sing', 'dance', 'drum', 'piano', 'music', 'song'] },
  { title: 'Volcano Science', words: ['volcano', 'lava', 'rock', 'eruption', 'hot', 'ash'] },
  { title: 'Swimming Pool', words: ['swim', 'pool', 'water', 'float', 'kick', 'dive'] },
  { title: 'Fruit Market', words: ['apple', 'banana', 'orange', 'grape', 'market', 'buy'] },
  { title: 'My Daily Routine', words: ['wake', 'eat', 'brush', 'school', 'play', 'sleep'] },
  { title: 'Camping Night', words: ['tent', 'fire', 'star', 'camp', 'bag', 'forest'] },
];

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function synthesizeLesson(entry) {
  return {
    title: entry.title,
    vocabulary: entry.words.map((word) => ({
      word,
      emoji: '•',
      sentence: `I see a ${word}.`,
    })),
  };
}

function fileFetch(url) {
  const rel = String(url).replace(/^\.?\//, '');
  const filePath = path.join(PUBLIC, rel);
  if (!filePath.startsWith(PUBLIC) || !fs.existsSync(filePath)) {
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) });
  }
  const body = fs.readFileSync(filePath);
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => JSON.parse(body.toString('utf8')),
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  });
}

async function loadLibs() {
  const sandbox = {
    window: {},
    console,
    fetch: fileFetch,
    setTimeout,
    clearTimeout,
  };
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  const libs = [
    'public/lib/propBank.js',
    'public/lib/vocabIcons.js',
    'public/lib/vocabArt.js',
    'public/lib/sceneBackgrounds.js',
    'public/lib/boardReadiness.js',
  ];
  for (const rel of libs) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
  }
  await sandbox.window.PropBank.ready();
  await sandbox.window.VocabIcons.ready();
  // Warm SB manifest cache via planFor on a tiny spine (optional); we pass bgManifest explicitly.
  return sandbox.window;
}

function tallyGaps(results) {
  const missingWords = new Map();
  const bgGaps = new Map();
  let ready = 0;
  let draft = 0;

  for (const r of results) {
    if (r.status === 'ready') ready++;
    else draft++;

    for (const d of (r.vocabArt && r.vocabArt.detail) || []) {
      if (!d.ok) {
        missingWords.set(d.word, (missingWords.get(d.word) || 0) + 1);
      }
    }
    if (r.bg && r.bg.gap) {
      const key = r.bg.set || `unset:${r.title}`;
      bgGaps.set(key, (bgGaps.get(key) || 0) + 1);
    }
  }

  const topMissingWords = [...missingWords.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([word, count]) => ({ word, count }));

  const topBgGaps = [...bgGaps.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([set, count]) => ({ set, count }));

  return { ready, draft, topMissingWords, topBgGaps };
}

async function main() {
  const round = Number(arg('round', '1')) || 1;
  const seed = Number(arg('seed', '42')) || 42;
  const rnd = mulberry32(seed);

  const bgManifest = JSON.parse(
    fs.readFileSync(path.join(PUBLIC, 'assets/08_backgrounds/manifest.json'), 'utf8')
  );

  const W = await loadLibs();
  const picked = shuffle(TOPIC_POOL, rnd);

  const results = [];
  for (const entry of picked) {
    const lesson = synthesizeLesson(entry);
    // Empty plan — ignoreKit skips kit/hero; we score vocab + place BG only.
    const report = W.BoardReadiness.assess(lesson, { assignments: [] }, {
      ignoreKit: true,
      bgManifest,
    });
    results.push({
      title: lesson.title,
      words: entry.words,
      status: report.status,
      reasons: report.reasons,
      vocabArt: {
        hits: report.vocabArt.hits,
        total: report.vocabArt.total,
        ratio: report.vocabArt.ratio,
        detail: report.vocabArt.detail,
      },
      bg: report.bg,
      summary: W.BoardReadiness.summaryLine(report),
    });
  }

  const gaps = tallyGaps(results);
  const payload = {
    round,
    seed,
    generatedAt: new Date().toISOString(),
    poolSize: TOPIC_POOL.length,
    scored: results.length,
    ready: gaps.ready,
    draft: gaps.draft,
    readyPct: Number((gaps.ready / results.length).toFixed(3)),
    topMissingWords: gaps.topMissingWords,
    topBgGaps: gaps.topBgGaps,
    results,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `round-${round}.json`);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));

  console.log(`Round ${round} (seed=${seed}): Ready ${gaps.ready}/${results.length} · Draft ${gaps.draft}`);
  console.log(`Wrote ${path.relative(ROOT, outPath)}`);
  if (gaps.topBgGaps.length) {
    console.log('BG gaps:', gaps.topBgGaps.map((g) => `${g.set}×${g.count}`).join(', '));
  }
  if (gaps.topMissingWords.length) {
    console.log(
      'Top missing vocab:',
      gaps.topMissingWords.slice(0, 12).map((w) => `${w.word}×${w.count}`).join(', ')
    );
  }

  // Non-zero exit only if --strict and any draft
  if (process.argv.includes('--strict') && gaps.draft > 0) {
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
