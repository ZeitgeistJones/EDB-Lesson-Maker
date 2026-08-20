/**
 * MASS STOCKPILE Wave 5 — Pre-A1 coverage scan (reuse vs genuine gaps).
 *   node scripts/stockpile-prea1-gaps.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/assets/09_props/manifest.json'), 'utf8'));
const keys = new Set(Object.keys(man.props || {}));
const imgDir = path.join(ROOT, 'public/assets/09_props/img');

const NOUNS = [
  'boy', 'girl', 'mom', 'dad', 'baby',
  'dog', 'cat', 'bird', 'fish',
  'apple', 'banana', 'bread', 'milk', 'water',
  'ball', 'book', 'bag', 'chair', 'table', 'bed',
  'car', 'bus', 'train', 'bike',
  'house', 'school', 'park', 'shop',
];
const VERBS = [
  'eat', 'drink', 'sit', 'stand', 'run', 'walk', 'jump',
  'open', 'close', 'give', 'take', 'look', 'point',
  'wave', 'play', 'sleep', 'wash', 'brush',
];
const ADJS = [
  'big', 'small', 'happy', 'sad', 'hot', 'cold',
  'open', 'closed', 'full', 'empty', 'clean', 'dirty', 'wet', 'dry',
];

const ALIASES = {
  mom: ['mom', 'family-mom', 'mother', 'cast-parent'],
  dad: ['dad', 'family-dad', 'father'],
  boy: ['boy', 'family-boy', 'cast-kid3', 'cast-leo'],
  girl: ['girl', 'family-girl', 'cast-mia'],
  ball: ['ball', 'soccer-ball', 'beach-ball'],
  book: ['book', 'sch-hardcover-book'],
  bike: ['bike', 'bicycle'],
  shop: ['shop', 'store'],
  stand: ['stand', 'cast-mia-idle'],
};

function covered(word) {
  const cands = ALIASES[word] || [word];
  for (const c of cands) {
    if (keys.has(c)) return { key: c, how: 'exact' };
    if (keys.has(`family-${c}`)) return { key: `family-${c}`, how: 'family' };
    const hit = [...keys].find((k) => k === c || k.endsWith(`-${c}`) || k.includes(`-${c}-`) || k.startsWith(`${c}-`));
    if (hit) return { key: hit, how: 'fuzzy' };
    if (fs.existsSync(path.join(imgDir, `${c}.png`))) return { key: c, how: 'file-only' };
  }
  return null;
}

const report = { nouns: { covered: [], gaps: [] }, verbs: { covered: [], gaps: [] }, adjs: { covered: [], gaps: [] } };
for (const w of NOUNS) {
  const hit = covered(w);
  if (hit) report.nouns.covered.push({ word: w, ...hit });
  else report.nouns.gaps.push(w);
}
for (const w of VERBS) {
  const hit = covered(w) || covered(`verb-${w}`) || [...keys].find((k) => k.includes(w) && /verb|pose|cast-/.test(k));
  if (hit) report.verbs.covered.push(typeof hit === 'string' ? { word: w, key: hit, how: 'fuzzy' } : { word: w, ...hit });
  else report.verbs.gaps.push(w);
}
for (const w of ADJS) {
  const hit = covered(w) || covered(`adj-${w}`);
  if (hit) report.adjs.covered.push({ word: w, ...hit });
  else report.adjs.gaps.push(w);
}

const out = path.join(ROOT, 'tmp', 'stockpile-prea1-gaps.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  nouns: { covered: report.nouns.covered.length, gaps: report.nouns.gaps },
  verbs: { covered: report.verbs.covered.length, gaps: report.verbs.gaps },
  adjs: { covered: report.adjs.covered.length, gaps: report.adjs.gaps },
  out,
}, null, 2));
