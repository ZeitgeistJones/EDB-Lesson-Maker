/**
 * Smoke: topic coloring outlines resolve correctly (no eyes leak).
 *   node scripts/smoke-coloring-outlines.mjs
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const code = fs.readFileSync(path.join(root, 'public/lib/coloringOutlines.js'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(code, sandbox);
const CO = sandbox.window.ColoringOutlines;
if (!CO) throw new Error('ColoringOutlines missing');

const face = JSON.parse(fs.readFileSync(path.join(root, 'scripts/fixtures/face-lesson.json'), 'utf8'));
const castle = JSON.parse(fs.readFileSync(path.join(root, 'scripts/fixtures/castle-lesson.json'), 'utf8'));

const a1 = { level: 'A1' };
const b1 = { level: 'B1' };

const faceOut = CO.forLesson(face, a1);
const castleOut = CO.forLesson(castle, a1);
const b1Out = CO.forLesson(castle, b1);
const beachOut = CO.forLesson({
  title: 'At the Beach',
  warmUp: { question: 'Do you like sand?' },
  vocabulary: [{ word: 'shell' }],
  activity: { title: 'Build a sandcastle' },
}, a1);
const genOut = CO.forLesson({
  title: 'My School Day',
  warmUp: { question: 'What do you do?' },
  vocabulary: [{ word: 'book' }],
  activity: { title: 'Talk' },
}, a1);

const checks = [
  ['face=eyes', faceOut?.id === 'eyes'],
  ['face has eye ellipse', /ellipse cx="170"/.test(faceOut?.svg || '')],
  ['castle=castle', castleOut?.id === 'castle'],
  ['castle no Eye outlines aria', !/Eye outlines/.test(castleOut?.svg || '')],
  ['castle no eye ellipse', !/ellipse cx="170"/.test(castleOut?.svg || '')],
  ['castle aria', /Castle outline/.test(castleOut?.svg || '')],
  ['beach=beach', beachOut?.id === 'beach'],
  ['generic=star', genOut?.id === 'star'],
  ['generic never eyes', genOut?.id !== 'eyes'],
  ['B1 null', b1Out === null],
  ['wants A1', CO.wantsColoring(a1) === true],
  ['wants B1 false', CO.wantsColoring(b1) === false],
  ['crayons on face', /svg/.test(faceOut?.crayons || '')],
];

// Also ensure makeWarmUp source no longer hardcodes eyes / debug ingest.
const warmSrc = fs.readFileSync(path.join(root, 'public/lib/renderLessonPages.js'), 'utf8');
checks.push(['no color the eyes hint', !/color the eyes/i.test(warmSrc)]);
checks.push(['no hasEyesOutline debug', !/hasEyesOutline/.test(warmSrc)]);
checks.push(['makeWarmUp passes meta', /makeWarmUp\(lesson, boardPlan, m\)/.test(warmSrc)]);
checks.push(['index loads coloringOutlines', fs.readFileSync(path.join(root, 'public/index.html'), 'utf8').includes('lib/coloringOutlines.js')]);

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed += 1;
}
if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} checks passed.`);
