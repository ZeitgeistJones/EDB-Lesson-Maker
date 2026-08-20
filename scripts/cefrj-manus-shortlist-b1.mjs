/**
 * Fast CEFR-J B1 Manus shortlist — same light keep/review/reject as A1/A2.
 * Exact-dedupe against live pack. No scoring. No Manus send.
 *
 *   node scripts/cefrj-manus-shortlist-b1.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalize, verifiedPackHit } from './lib/pack-exact-match.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CEFRJ = path.join(ROOT, 'scripts/data/cefrj');
const OUT = path.join(ROOT, 'tmp/cefrj-manus/b1');
const INDEX_PATH = path.join(ROOT, 'public/assets/07_vocab-pack/index.json');
const DICT_PATH = path.join(ROOT, 'scripts/data/esl-picturable-dictionary.json');

const LEVEL = 'B1';

/** Same sets as scripts/cefrj-manus-shortlist.mjs (A1/A2 scrub). */
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
  pronounce provide publish realize refer reflect regret remain
  represent satisfy seem sound succeed suggest suit trust
  understand wonder worry predict
  `.split(/\s+/).map(normalize).filter(Boolean)
);

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
      level: String(level || '').trim().toUpperCase(),
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
  if (
    ['fun', 'way', 'end', 'use', 'try', 'sum', 'guy', 'cop', 'care', 'back', 'check', 'course', 'celebration', 'dancing'].includes(
      word
    )
  ) {
    return 'review';
  }
  return 'keep';
}

function verbBucket(word) {
  if (VERB_REJECT.has(word)) return 'reject';
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
  return 'keep';
}

function adjBucket(word) {
  if (ADJ_REJECT.has(word)) return 'reject';
  if (COLOR_WORDS.has(word)) return 'review';
  return 'keep';
}

function classify(pos, word) {
  if (pos === 'noun') return nounBucket(word);
  if (pos === 'verb') return verbBucket(word);
  return adjBucket(word);
}

function main() {
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  let whitelist = {};
  if (fs.existsSync(DICT_PATH)) {
    whitelist = JSON.parse(fs.readFileSync(DICT_PATH, 'utf8')).canonicalWhitelist || {};
  }

  fs.mkdirSync(OUT, { recursive: true });
  const summary = {
    generatedAt: new Date().toISOString(),
    level: LEVEL,
    note: 'B1 shortlist — same light scrub as A1/A2. Live pack exact-dedupe. No Manus sent.',
    nouns: {},
    verbs: {},
    adjectives: {},
  };
  const companion = [];

  for (const pos of ['noun', 'verb', 'adjective']) {
    const csvRows = parseGapsCsv(path.join(CEFRJ, `cefrj-${pos}-gaps.csv`)).filter(
      (r) => r.level === LEVEL
    );
    // Prefer live pack truth over stale CSV "exact asset exists"
    const rawMissing = [];
    let alreadyCovered = 0;
    for (const r of csvRows) {
      const hit = verifiedPackHit(index, r.word, whitelist);
      if (hit?.verified) {
        alreadyCovered += 1;
        companion.push({ ...r, shortlist: 'already_in_pack', packKey: hit.key });
        continue;
      }
      rawMissing.push(r);
    }

    const keep = [];
    const review = [];
    const reject = [];
    for (const r of rawMissing) {
      const bucket = classify(pos, r.word);
      companion.push({ ...r, shortlist: bucket });
      if (bucket === 'keep') keep.push(r);
      else if (bucket === 'review') review.push(r);
      else reject.push(r);
    }
    keep.sort((a, b) => a.word.localeCompare(b.word));
    review.sort((a, b) => a.word.localeCompare(b.word));
    reject.sort((a, b) => a.word.localeCompare(b.word));

    const plural = pos === 'noun' ? 'nouns' : pos === 'verb' ? 'verbs' : 'adjectives';
    fs.writeFileSync(
      path.join(OUT, `manus-${plural}-b1.txt`),
      keep.map((r) => r.word).join('\n') + (keep.length ? '\n' : '')
    );
    fs.writeFileSync(
      path.join(OUT, `${plural}-review-b1.txt`),
      review.map((r) => r.word).join('\n') + (review.length ? '\n' : '')
    );
    fs.writeFileSync(
      path.join(OUT, `${plural}-rejected-b1.txt`),
      reject.map((r) => r.word).join('\n') + (reject.length ? '\n' : '')
    );

    summary[plural] = {
      cefrjB1Rows: csvRows.length,
      alreadyInPack: alreadyCovered,
      rawMissingAfterDedupe: rawMissing.length,
      keptForManus: keep.length,
      review: review.length,
      rejected: reject.length,
    };
  }

  fs.writeFileSync(path.join(OUT, 'companion.json'), JSON.stringify(companion, null, 2));
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));

  const md = `# CEFR-J B1 Manus shortlist

Generated: ${summary.generatedAt}

Same light picturability scrub as A1/A2. Exact-deduped against live pack. **No Manus sent.**

## Nouns
- CEFR-J B1 rows: **${summary.nouns.cefrjB1Rows}**
- Already in pack (dropped): **${summary.nouns.alreadyInPack}**
- Missing after dedupe: **${summary.nouns.rawMissingAfterDedupe}**
- Kept for Manus: **${summary.nouns.keptForManus}**
- Review: **${summary.nouns.review}**
- Rejected: **${summary.nouns.rejected}**

## Verbs
- CEFR-J B1 rows: **${summary.verbs.cefrjB1Rows}**
- Already in pack (dropped): **${summary.verbs.alreadyInPack}**
- Missing after dedupe: **${summary.verbs.rawMissingAfterDedupe}**
- Kept for Manus: **${summary.verbs.keptForManus}**
- Review: **${summary.verbs.review}**
- Rejected: **${summary.verbs.rejected}**

## Adjectives
- CEFR-J B1 rows: **${summary.adjectives.cefrjB1Rows}**
- Already in pack (dropped): **${summary.adjectives.alreadyInPack}**
- Missing after dedupe: **${summary.adjectives.rawMissingAfterDedupe}**
- Kept for Manus: **${summary.adjectives.keptForManus}**
- Review: **${summary.adjectives.review}**
- Rejected: **${summary.adjectives.rejected}**

## Files
- \`tmp/cefrj-manus/b1/manus-*-b1.txt\`
- \`tmp/cefrj-manus/b1/*-review-b1.txt\` / \`*-rejected-b1.txt\`
`;
  fs.writeFileSync(path.join(OUT, 'summary.md'), md);
  console.log(md);
}

main();
