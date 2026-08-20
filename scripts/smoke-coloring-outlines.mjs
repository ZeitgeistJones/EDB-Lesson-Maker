/**
 * Smoke: topic coloring outlines resolve correctly (no eyes leak; PNG bank).
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
const dogOut = CO.forLesson({
  title: 'Pets',
  warmUp: { question: 'Do you have a dog?' },
  vocabulary: [{ word: 'dog' }, { word: 'cat' }],
}, a1);
const catOut = CO.forLesson({
  title: 'The Cat Ate My Homework',
  warmUp: {
    question: 'What is one thing you did this morning before you came to class?',
    sampleAnswer: 'I rode the bus to school.',
  },
  vocabulary: [{ word: 'homework' }, { word: 'cat' }, { word: 'hungry' }, { word: 'teacher' }],
}, a1);
const foodOut = CO.forLesson({
  title: 'Lunch Time',
  warmUp: { question: 'What food do you like?' },
  vocabulary: [{ word: 'apple' }, { word: 'pizza' }],
}, a1);
const genOut = CO.forLesson({
  title: 'My School Day',
  warmUp: { question: 'What do you do?' },
  vocabulary: [{ word: 'book' }],
  activity: { title: 'Talk' },
}, a1);
const bballOut = CO.forLesson({
  title: 'Playing Basketball with Friends',
  warmUp: { question: 'What is your favorite way to move your body after school?' },
  vocabulary: [{ word: 'ball' }, { word: 'team' }, { word: 'score' }, { word: 'court' }],
}, a1);
const bathOut = CO.forLesson(
  JSON.parse(fs.readFileSync(path.join(root, 'scripts/fixtures/bathroom-routines-lesson.json'), 'utf8')),
  a1,
);

const warmSrc = fs.readFileSync(path.join(root, 'public/lib/renderLessonPages.js'), 'utf8');
const warmFn = warmSrc.slice(
  warmSrc.indexOf('function makeWarmUp'),
  warmSrc.indexOf('function makeWarmUp') + 2800,
);

const checks = [
  ['face=eyes', faceOut?.id === 'eyes'],
  ['face has eye ellipse', /ellipse cx="170"/.test(faceOut?.html || '')],
  ['castle=castle svg', castleOut?.id === 'castle' && castleOut?.source === 'svg'],
  ['castle no Eye outlines aria', !/Eye outlines/.test(castleOut?.html || '')],
  ['castle no eye ellipse', !/ellipse cx="170"/.test(castleOut?.html || '')],
  ['beach=beach png', beachOut?.id === 'beach' && beachOut?.source === 'png'],
  ['beach sandcastle img', /sandcastle\.png/.test(beachOut?.html || '')],
  ['animals=dog png', dogOut?.id === 'animals' && /dog\.png/.test(dogOut?.html || '')],
  // Cat lesson must NOT steal car via "bus" in sampleAnswer; prefer cat.png.
  ['cat lesson=animals', catOut?.id === 'animals'],
  ['cat lesson=cat.png', /cat\.png/.test(catOut?.html || '')],
  ['cat lesson not car', !/car\.png/.test(catOut?.html || '')],
  ['food=apple png', foodOut?.id === 'food' && /apple\.png/.test(foodOut?.html || '')],
  ['generic=star', genOut?.id === 'star'],
  ['generic never eyes', genOut?.id !== 'eyes'],
  ['bball not vehicles', bballOut?.id !== 'vehicles'],
  ['bball=sports', bballOut?.id === 'sports' && bballOut?.source === 'svg'],
  ['bball basketball outline', /Basketball outline/.test(bballOut?.html || '')],
  ['bathroom not star', bathOut?.id === 'bathroom' && bathOut?.id !== 'star'],
  ['bathroom svg outline', bathOut?.source === 'svg' && /Toothbrush and toothpaste outline/.test(bathOut?.html || '')],
  ['B1 null', b1Out === null],
  ['wants A1', CO.wantsColoring(a1) === true],
  ['wants B1 false', CO.wantsColoring(b1) === false],
  ['crayons on face', /svg/.test(faceOut?.crayons || '')],
  ['bank has sandcastle file', fs.existsSync(path.join(root, 'public/assets/10_coloring/img/sandcastle.png'))],
  ['bank has dog file', fs.existsSync(path.join(root, 'public/assets/10_coloring/img/dog.png'))],
  ['bank has cat file', fs.existsSync(path.join(root, 'public/assets/10_coloring/img/cat.png'))],
  ['no butterfly-dup file', !fs.existsSync(path.join(root, 'public/assets/10_coloring/img/butterfly-dup.png'))],
  ['no cat-dup file', !fs.existsSync(path.join(root, 'public/assets/10_coloring/img/cat-dup.png'))],
  ['img fits parent height', /max-height:100%/.test(dogOut?.html || '')],
  ['no color the eyes hint', !/color the eyes/i.test(warmSrc)],
  ['no hasEyesOutline debug', !/hasEyesOutline/.test(warmSrc)],
  ['makeWarmUp uses html', /outline\.html \|\| outline\.svg/.test(warmSrc)],
  ['no forced 2/1 aspect in makeWarmUp', !/aspectRatio:\s*['"]2\s*\/\s*1['"]/.test(warmFn)],
  ['warm art overflow visible', /overflow:\s*['"]visible['"]/.test(warmFn)],
  ['index loads coloringOutlines', fs.readFileSync(path.join(root, 'public/index.html'), 'utf8').includes('lib/coloringOutlines.js')],
];

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
