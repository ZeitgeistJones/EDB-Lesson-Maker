/**
 * Post-harvest product cleanup regressions:
 * - user-facing levels are Pre-A1 through B2 only
 * - Pre-A1 has a distinct generation/phonics path
 * - teacher UI does not expose story-art internals
 * - producer prompt prefers strong vocab over quota padding
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const PhonicsPolicy = require('../public/lib/phonicsPolicy.js');

const ROOT = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
const apiSource = fs.readFileSync(path.join(ROOT, 'api', 'generate-lesson.js'), 'utf8');
const serverSource = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');

function levelButtons(html) {
  return [...html.matchAll(/<button class="opt-btn(?: active)?" data-val="([^"]+)" onclick="pickLevel\(this\)">/g)]
    .map((m) => m[1]);
}

assert.deepStrictEqual(
  levelButtons(indexHtml),
  ['Pre-A1', 'A1', 'A2', 'B1', 'B2'],
  'Student Level buttons must be exactly Pre-A1, A1, A2, B1, B2'
);

assert(!/data-val="C1"|data-val="C2"/.test(indexHtml), 'C1/C2 must not be visible level choices');
assert(!/Advanced|Proficient/.test(indexHtml), 'old C1/C2 level copy must not remain in UI');
assert(!/Illustrate story pages|story-art-toggle|STORY_ART=1|Art hydrates/i.test(indexHtml), 'story-art toggle/copy must be absent from teacher UI');
assert(/function storyArtInternalEnabled\(\)/.test(indexHtml), 'story art must be internal opt-in only');
assert(/if \(!storyArtInternalEnabled\(\) \|\| !window\.StoryArt\)/.test(indexHtml), 'StoryArt.generate must be gated off by default');

for (const src of [apiSource, serverSource]) {
  assert(/'Pre-A1': 'Pre-A1/.test(src), 'Pre-A1 must be a supported generation level');
  assert(!/^\s*C1:|^\s*C2:/m.test(src), 'C1/C2 must not be normal generation levels');
  assert(/CEFR_LEVELS\[level\] \? level : 'B1'/.test(src), 'old unsupported level values must fall back safely');
  assert(/Prefer 5 strong primary concepts over 6/.test(src), 'prompt must prefer strong concepts over quota padding');
  assert(/generic verbs/.test(src), 'prompt must ban generic verb filler');
}

assert(PhonicsPolicy.LEVEL_RULES['PRE-A1'], 'Pre-A1 phonics rules must exist');
assert.notDeepStrictEqual(
  PhonicsPolicy.rulesFor('Pre-A1'),
  PhonicsPolicy.rulesFor('A1'),
  'Pre-A1 phonics must not silently route to A1'
);
assert.strictEqual(
  PhonicsPolicy.autoWantPhonics('Pre-A1', false),
  true,
  'Pre-A1 auto phonics should use its starter path'
);

console.log('OK post-harvest product cleanup regressions');
