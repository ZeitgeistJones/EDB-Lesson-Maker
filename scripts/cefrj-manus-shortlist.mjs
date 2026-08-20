/**
 * Fast CEFR-J A1/A2 Manus shortlist — light keep / review / reject.
 * No scoring architecture. No Manus send.
 *
 *   node scripts/cefrj-manus-shortlist.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalize } from './lib/pack-exact-match.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CEFRJ = path.join(ROOT, 'scripts/data/cefrj');
const OUT = path.join(ROOT, 'tmp/cefrj-manus');

const LEVELS = new Set(['A1', 'A2']);

/** Obvious weak dedicated-icon nouns (not exhaustive — pattern nets catch more). */
const NOUN_REJECT = new Set(
  `
  action activity age advice information reason idea difference ability
  advantage disadvantage appearance ambition amusement argument area affair
  addition adjective adverb agency architecture article attention attitude
  authority average beauty behavior belief benefit business case cause
  chance change character collection company condition consideration
  control conversation culture custom data deal decision degree demand
  design detail development difference difficulty direction discussion
  duty effect effort emotion end energy environment evidence example
  experience fact fashion feeling force form freedom fun future
  habit health history hope hour idea identity importance influence
  information interest issue item kind knowledge language law lead
  life limit luck manner matter meaning memory method mind moment
  nature need news noise note number opinion opportunity order
  pain peace people period person piece place plan pleasure point
  policy position power practice presence pressure price problem
  process product progress purpose quality quantity question range
  rate reason record result role rule sale section sense service
  side sight situation size skill society sort space speech speed
  spirit stage state status step strength stress structure style
  subject success suggestion sum support surprise survey system
  taste technology term thing thought time today tomorrow topic
  trade tradition trouble type use value variety view voice war
  way wealth week weekend will word work world worry year
  april august december february friday january july june monday
  november october saturday september sunday thursday tuesday wednesday
  may morning noon midnight afternoon evening night
  mr mrs ms miss hello bye thanks pardon excuse
  dad daddy mom mommy mum parent parents grandparent
  nationality olympics internet grammar paragraph sentence
  self smith smoking sum code quarter
  `.split(/\s+/).map(normalize).filter(Boolean)
);

/**
 * Verbs — DEFAULT KEEP. Reject only clear non-picturables:
 * cognitive, abstract state, modal/grammatical, or meaning that needs
 * written language / an elaborate un-illustratable scene.
 * Physical / body / household / school / social-gesture senses → keep.
 * Questionable → review (see verbBucket), not reject.
 */
const VERB_REJECT = new Set(
  `
  agree become believe change describe focus forget get happen
  imagine judge keep know let like love mean miss note
  remember say set solve tell think use want
  accept achieve adjust admire admit advise allow apply appreciate
  argue belong blame cause claim communicate compare complain
  concentrate confuse consider consist contact continue cost criticize
  decide depend develop disagree discover encourage end establish
  exist expect explain fail figure function hate impress improve
  include increase indicate manage matter mind need prefer
  pronounce provide publish   realize refer reflect regret remain
  represent satisfy seem sound succeed suggest suit trust
  understand wonder worry predict
  `.split(/\s+/).map(normalize).filter(Boolean)
);

/** Obvious nonvisual evaluative — uncertain stays KEEP. */
const ADJ_REJECT = new Set(
  `
  important successful possible necessary correct special real general
  usual unusual additional advanced appropriate certain common complete
  convenient following foreign personal social still sure true false
  elementary everyday excellent favorite fine first due off ok only
  own ready second same left right middle living dear
  acceptable adult assistant audio automatic average basic classic
  chemical comic cream daily ideal principal proper suitable
  significant specific useful useless unnecessary unimportant
  available particular various essential official private public
  original regular normal major minor total entire whole equal
  further given likely logical precise progressive scientific
  alright
  `.split(/\s+/).map(normalize).filter(Boolean)
);
ADJ_REJECT.add(normalize('all right'));

/** Colors — skip if we already treat them as chips / pack hits elsewhere; put in review. */
const COLOR_WORDS = new Set(
  `black blue brown gold gray green orange pink purple red white yellow`
    .split(/\s+/)
    .map(normalize)
);

function parseGapsCsv(file) {
  const lines = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).slice(1);
  const rows = [];
  for (const line of lines) {
    const [word, pos, level, exact, inDict, inDisc] = line.split(',');
    if (!word) continue;
    rows.push({
      word: normalize(word),
      pos,
      level,
      exactAssetExists: exact,
      inCuratedDictionary: inDict,
      inOpenWorldDiscovery: inDisc,
    });
  }
  return rows;
}

function nounBucket(word) {
  if (NOUN_REJECT.has(word)) return 'reject';
  if (COLOR_WORDS.has(word)) return 'review';
  // Abstract noun morphology — skip keepSuffix picturable exceptions.
  if (
    word.length > 8 &&
    /tion$|sion$|ment$|ness$|ity$|ance$|ence$|ship$|hood$|ism$/.test(word)
  ) {
    const keepSuffix = new Set([
      'station', 'invention', 'decoration', 'construction', 'plantation',
      'exhibition', 'competition', 'collection',
    ]);
    if (!keepSuffix.has(word)) return 'reject';
  }
  if (/^[a-z]+day$/.test(word)) return 'reject';
  if (['fun', 'way', 'end', 'use', 'try', 'sum', 'guy', 'cop', 'care', 'back', 'check', 'course', 'celebration', 'dancing'].includes(word)) {
    return 'review';
  }
  return 'keep';
}

function verbBucket(word) {
  if (VERB_REJECT.has(word)) return 'reject';
  // Questionable / digital / borderline → review, not reject.
  const reviewish = new Set(
    `
    begin feel live repeat thank introduce apologize appear annoy
    bother disturb dream earn forbid oppose prevent remind retire
    survive try spell text email download upload license
    clone post quit hire babysit cancel delete dial fax format
    install interview photograph stream
    `.split(/\s+/).map(normalize).filter(Boolean)
  );
  if (reviewish.has(word)) return 'review';
  // Default KEEP: common picturable action sense.
  return 'keep';
}

function adjBucket(word) {
  if (ADJ_REJECT.has(word)) return 'reject';
  if (COLOR_WORDS.has(word)) return 'review';
  // Uncertain → KEEP (do not push morphology into review).
  return 'keep';
}

function classify(pos, word) {
  if (pos === 'noun') return nounBucket(word);
  if (pos === 'verb') return verbBucket(word);
  return adjBucket(word);
}

function loadMissing(pos) {
  const csv = path.join(CEFRJ, `cefrj-${pos}-gaps.csv`);
  return parseGapsCsv(csv).filter(
    (r) => r.exactAssetExists === 'no' && LEVELS.has(r.level)
  );
}

function countLevel(pos, level) {
  const csv = path.join(CEFRJ, `cefrj-${pos}-gaps.csv`);
  return parseGapsCsv(csv).filter(
    (r) => r.exactAssetExists === 'no' && r.level === level
  ).length;
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const companion = [];
  const summary = {
    generatedAt: new Date().toISOString(),
    note: 'Fast A1/A2 Manus shortlist from CEFR-J gaps. No Manus sent.',
    nouns: {},
    verbs: {},
    adjectives: {},
    remainingHigherLevels: {},
  };

  for (const pos of ['noun', 'verb', 'adjective']) {
    const rows = loadMissing(pos);
    const keep = [];
    const review = [];
    const reject = [];
    for (const r of rows) {
      const bucket = classify(pos, r.word);
      const entry = { ...r, shortlist: bucket };
      companion.push(entry);
      if (bucket === 'keep') keep.push(r);
      else if (bucket === 'review') review.push(r);
      else reject.push(r);
    }
    keep.sort((a, b) => a.level.localeCompare(b.level) || a.word.localeCompare(b.word));
    review.sort((a, b) => a.level.localeCompare(b.level) || a.word.localeCompare(b.word));
    reject.sort((a, b) => a.level.localeCompare(b.level) || a.word.localeCompare(b.word));

    const plural = pos === 'noun' ? 'nouns' : pos === 'verb' ? 'verbs' : 'adjectives';
    fs.writeFileSync(
      path.join(OUT, `manus-${plural}-a1-a2.txt`),
      keep.map((r) => r.word).join('\n') + (keep.length ? '\n' : '')
    );
    fs.writeFileSync(
      path.join(OUT, `${plural}-review.txt`),
      review.map((r) => r.word).join('\n') + (review.length ? '\n' : '')
    );
    fs.writeFileSync(
      path.join(OUT, `${plural}-rejected.txt`),
      reject.map((r) => r.word).join('\n') + (reject.length ? '\n' : '')
    );

    summary[plural] = {
      rawMissingA1A2: rows.length,
      rawA1: rows.filter((r) => r.level === 'A1').length,
      rawA2: rows.filter((r) => r.level === 'A2').length,
      keptForManus: keep.length,
      review: review.length,
      rejected: reject.length,
      kept: keep.map((r) => `${r.word}\t${r.level}`),
    };
  }

  summary.remainingHigherLevels = {
    B1: {
      nouns: countLevel('noun', 'B1'),
      verbs: countLevel('verb', 'B1'),
      adjectives: countLevel('adjective', 'B1'),
    },
    B2: {
      nouns: countLevel('noun', 'B2'),
      verbs: countLevel('verb', 'B2'),
      adjectives: countLevel('adjective', 'B2'),
    },
  };

  fs.writeFileSync(path.join(OUT, 'companion.json'), JSON.stringify(companion, null, 2));
  fs.writeFileSync(
    path.join(OUT, 'companion.csv'),
    [
      'word,pos,CEFR-J level,exact asset exists,already in curated dictionary,already found by open-world discovery,shortlist',
      ...companion.map(
        (r) =>
          `${r.word},${r.pos},${r.level},${r.exactAssetExists},${r.inCuratedDictionary},${r.inOpenWorldDiscovery},${r.shortlist}`
      ),
    ].join('\n') + '\n'
  );

  const md = `# CEFR-J A1/A2 Manus shortlist

Generated: ${summary.generatedAt}

No Manus sent. Fast keep/review/reject only.

## Nouns
- Raw A1/A2 missing: **${summary.nouns.rawMissingA1A2}** (A1 ${summary.nouns.rawA1}, A2 ${summary.nouns.rawA2})
- Kept for Manus: **${summary.nouns.keptForManus}**
- Review: **${summary.nouns.review}**
- Rejected: **${summary.nouns.rejected}**

## Verbs
- Raw A1/A2 missing: **${summary.verbs.rawMissingA1A2}** (A1 ${summary.verbs.rawA1}, A2 ${summary.verbs.rawA2})
- Kept for Manus: **${summary.verbs.keptForManus}**
- Review: **${summary.verbs.review}**
- Rejected: **${summary.verbs.rejected}**

## Adjectives
- Raw A1/A2 missing: **${summary.adjectives.rawMissingA1A2}** (A1 ${summary.adjectives.rawA1}, A2 ${summary.adjectives.rawA2})
- Kept for Manus: **${summary.adjectives.keptForManus}**
- Review: **${summary.adjectives.review}**
- Rejected: **${summary.adjectives.rejected}**

## Remaining higher-level gaps (not shortlisted)
- B1 nouns **${summary.remainingHigherLevels.B1.nouns}** · verbs **${summary.remainingHigherLevels.B1.verbs}** · adjectives **${summary.remainingHigherLevels.B1.adjectives}**
- B2 nouns **${summary.remainingHigherLevels.B2.nouns}** · verbs **${summary.remainingHigherLevels.B2.verbs}** · adjectives **${summary.remainingHigherLevels.B2.adjectives}**

## Files
- \`manus-nouns-a1-a2.txt\` / \`nouns-review.txt\` / \`nouns-rejected.txt\`
- \`manus-verbs-a1-a2.txt\` / \`verbs-review.txt\` / \`verbs-rejected.txt\`
- \`manus-adjectives-a1-a2.txt\` / \`adjectives-review.txt\` / \`adjectives-rejected.txt\`
- \`companion.csv\` / \`companion.json\`
`;
  fs.writeFileSync(path.join(OUT, 'summary.md'), md);
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(md);
}

main();
