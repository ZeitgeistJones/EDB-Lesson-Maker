/**
 * Smoke: semantic provenance grades for known bad/good pairs.
 */
import {
  classifyConceptTopicPair,
  isValidProvenance,
} from './lib/discovery-semantic-provenance.mjs';

const cases = [
  { word: 'fin', topic: 'shark anatomy', tags: ['part', 'animal'], domainId: 'animals', expectValid: true },
  { word: 'fin', topic: 'harbor seals', tags: ['part', 'animal'], domainId: 'animals', expectValid: true },
  { word: 'quill', topic: 'insect safari', tags: ['part', 'animal'], domainId: 'animals', expectValid: false },
  { word: 'quill', topic: 'siege weapons', tags: ['tool'], domainId: 'archaeology', expectValid: false },
  { word: 'quill', topic: 'scroll library', tags: ['tool'], domainId: 'archaeology', expectValid: true },
  { word: 'vise', topic: 'roofer ladder', tags: ['tool'], domainId: 'tools', expectValid: false },
  { word: 'vise', topic: 'paint station', tags: ['tool'], domainId: 'tools', expectValid: false },
  { word: 'vise', topic: 'toolbox basics', tags: ['tool'], domainId: 'tools', expectValid: true },
  { word: 'mortar', topic: 'glassblower studio', tags: ['tool'], domainId: 'trades', expectValid: false },
  { word: 'mortar', topic: 'vegetable garden plate', tags: ['food'], domainId: 'food', expectValid: false },
  { word: 'mortar', topic: 'kitchen tools', tags: ['food'], domainId: 'food', expectValid: true },
  { word: 'moat', topic: 'castle tour', tags: ['place'], domainId: 'archaeology', expectValid: true },
];

let failed = 0;
for (const c of cases) {
  const grade = classifyConceptTopicPair({
    word: c.word,
    topic: c.topic,
    tags: c.tags,
    domainId: c.domainId,
    domainLabels: [c.domainId],
  });
  const valid = isValidProvenance(grade);
  const ok = valid === c.expectValid;
  console.log(
    (ok ? 'OK' : 'FAIL').padEnd(4),
    c.word,
    '↔',
    c.topic,
    '→',
    grade,
    c.expectValid ? '(want valid)' : '(want invalid)'
  );
  if (!ok) failed++;
}
if (failed) {
  console.error(`\n${failed} provenance smoke failures`);
  process.exit(1);
}
console.log('\nprovenance smoke OK');
