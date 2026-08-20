/**
 * Expand next Manus verb wave from CEFR-J A1–B2 gaps + picturable/topic verbs.
 * Fast permissive picturability scrub. Dedupe against current pack. No Manus send.
 *
 *   node scripts/cefrj-verb-wave-expand.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalize, verifiedPackHit, slug } from './lib/pack-exact-match.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CEFRJ_GAPS = path.join(ROOT, 'scripts/data/cefrj/cefrj-verb-gaps.csv');
const PICT_VERBS = path.join(ROOT, 'scripts/data/picturable-verbs.txt');
const SOURCE = path.join(ROOT, 'scripts/data/esl-picturable-source.json');
const INDEX_PATH = path.join(ROOT, 'public/assets/07_vocab-pack/index.json');
const DICT_PATH = path.join(ROOT, 'scripts/data/esl-picturable-dictionary.json');
const OUT = path.join(ROOT, 'tmp/cefrj-manus');
const WAVE = 'verbs-wave2-expanded';

const LEVELS = new Set(['A1', 'A2', 'B1', 'B2']);

/** Never commission (policy / soft). */
const SKIP = new Set(
  ['hug', 'kiss', 'undress', 'spit', 'cuddle', 'embrace', 'snuggle', 'kids', 'parents', 'circle'].map(
    normalize
  )
);

/**
 * Reject mainly clear abstract / cognitive / state / modal.
 * Physical / body / household / sports / tools / craft / travel / animal /
 * visible process → NOT listed (default KEEP).
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
  pronounce provide publish realize refer reflect regret remain
  represent satisfy seem sound succeed suggest suit trust
  understand wonder worry predict
  analyze analyse assess assume assure
  benefit calculate choose conclude confirm convince
  define delay deny deserve determine differ doubt enable
  ensure estimate evaluate favour favor ignore imply influence
  intend involve maintain mention neglect notice observe
  occupy occur own owe persuade prove require respect
  result reveal select separate suppose support tend
  tolerate urge value wish
  abandon abolish access accomplish accumulate accuse acknowledge
  acquire adapt adopt affect afford anticipate appeal approve
  aspire assert assign associate attain attribute await
  bankrupt behave bestow betray bewilder boast boost burden
  care cease certify cherish clarify classify coincide
  commemorate comment commit compensate compile complete
  complicate compute concede conceive condemn confess confine
  congratulate constitute consume contain contemplate
  contradict contribute control convert cooperate coordinate
  correlate correspond counter criticize declare dedicate
  defer degrade delight demand denote depict deprecate
  deprive derive designate detect devote diagnose differentiate
  diminish discard discriminate dismiss dispose dispute
  distinguish dominate draft elaborate eliminate emphasize
  employ empower enact endorse enforce engage enhance
  enquire inquire entitle equate eradicate escalate evolve
  exaggerate exceed exclude exemplify exert expedite
  exploit facilitate finance foresee formulate foster
  fulfill fulfil generate govern grant guarantee hesitate
  honor honour identify implement imply impose incorporate
  incur induce infer inform inherit initiate innovate insist
  inspire institute integrate interpret intervene invest
  justify lack last legitimate liberate maximize minimise
  minimize mediate motivate negotiate nominate notify object
  obtain offend omit oppress opt originate outline
  overcome overlook overwhelm participate perceive permit
  persist pertain phase pioneer possess postpone precede
  preclude predominate prejudice presume prioritize proceed
  proclaim procure profess progress prohibit promote prompt
  propose prosecute prosper provoke publish pursue qualify
  quantify quote rank rate react readjust recall reckon
  recommend reconcile recruit refer refine reform refrain
  regain regard regulate reinforce reject rejoice relate
  rely remark remedy render renew repay reply report
  reproduce request research resemble reserve reside resign
  resist resolve respond restrain restrict retain retrieve
  revenge reverse revise revive reward risk rule sanction
  schedule scheme scrutinize secure seek segment sense
  sentence signify situate specify speculate sponsor
  stabilize standardize state stimulate strengthen stress
  structure submit subscribe substitute succeed suffer
  summarize summarise supervise supply suppose suppress
  survey suspect sustain symbolize synthesise synthesize
  target tax terminate testify theorize thrive tolerate
  total undertake unify unite update upgrade uphold
  utilize utilise validate vary venture verify violate
  volunteer vow warrant withstand
  be being been am is are was were
  can could may might must shall should will would
  have has had having do does did doing done
  shall ought
  `.split(/\s+/).map(normalize).filter(Boolean)
);

/** Borderline / digital / social — review, not reject. */
const VERB_REVIEW = new Set(
  `
  begin feel introduce live repeat thank annoy apologize appear
  clone disturb download dream earn email forbid license oppose
  post prevent quit remind retire text try
  learn stay go come see hear help enjoy
  graduate marry invent operate organize create produce
  receive offer pretend teach study work
  accompany adore advance aid alter announce appoint approach
  arrange assist attract avoid babysit back ban bare
  bet bid bless browse bully cancel capture cheat
  clear commute compete conceal confront donate edit
  embark enclose encounter equip erect erode exhibit
  expand explore export expose extend feature flourish
  found frame guide handle highlight illustrate import
  install interrupt interview invent investigate invite
  launch lead lean limit link list locate manufacture
  mark measure merge migrate modify monitor multiply
  perform plot portray practice praise process project
  protect protest rebel rebuild receive record reduce
  release renovate rent repeat replace rescue restore
  retire return save score serve settle shape share
  shift signal simulate skim spend stage study tackle
  taste teach thank threaten trace trade train transfer
  transform translate transmit transport treat tremble
  trigger vote withdraw witness
  `.split(/\s+/).map(normalize).filter(Boolean)
);

function loadLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*$/, '').trim())
    .filter(Boolean)
    .map(normalize)
    .filter((w) => w && !w.includes(' '));
}

function parseCefrjGaps() {
  const rows = [];
  const text = fs.readFileSync(CEFRJ_GAPS, 'utf8');
  for (const line of text.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const [word, , level] = line.split(',');
    const w = normalize(word);
    const lv = String(level || '').trim().toUpperCase();
    if (!w || !LEVELS.has(lv)) continue;
    rows.push({ word: w, level: lv, source: 'cefrj' });
  }
  return rows;
}

function loadTopicActionCandidates(pictSet, cefrjSet) {
  if (!fs.existsSync(SOURCE)) return [];
  const data = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  const out = [];
  for (const topic of data.topics || []) {
    for (const raw of topic.words || []) {
      const w = normalize(raw);
      if (!w || w.includes(' ')) continue;
      // Only pull topic words that are known as verbs elsewhere
      if (pictSet.has(w) || cefrjSet.has(w)) {
        out.push({ word: w, level: '', source: `topic:${topic.id || 'topic'}` });
      }
    }
  }
  return out;
}

/** Never emit to Manus shortlists / waves — exact-key hard deny. */
const MANUS_SAFETY_DENY = new Set(['rape', 'massacre', 'murder', 'suicide', 'torture', 'missile', 'bomb', 'gun']);

function verbBucket(word) {
  if (SKIP.has(word)) return 'skip';
  // Soft policy / junk leftovers
  if (MANUS_SAFETY_DENY.has(word) || word === 'stilts' || word === 'pee') return 'skip';
  if (VERB_REJECT.has(word)) return 'reject';
  // Latinate -ize/-ise often abstract process — reject unless short/common action
  if (/(ize|ise)$/.test(word) && word.length > 6) {
    const keepIze = new Set(
      ['exercise', 'recognize', 'organise', 'organize', 'apologize', 'apologise', 'paralyze', 'terrorize'].map(
        normalize
      )
    );
    if (!keepIze.has(word)) return 'reject';
  }
  // Extra cognitive / evaluative leftovers that slip past the main list
  const moreReject = new Set(
    `
    accustom alternate articulate attend bother combine console consult
    convey cope correct dare debit deceive decline decrease deduce deem
    defy delete design desire dignify direct disable disappoint disapprove
    discourage discredit discuss disillusion disqualify distract dread
    ease educate elect embarrass endure enrich enroll equal exalt examine
    excel exclaim excuse experience fancy fascinate fine force forgive
    form format fund furnish gain glorify gossip grieve hope humiliate
    imitate immigrate impair indulge infect infringe inhabit instill
    instruct insult interact interest interfere invoke irritate issue
    legislate lessen linger manipulate meditate mislead mistreat
    misunderstand mortify mourn muse mystify narrate nourish obey obsess
    occasion outdistance outdo outlive outshine outweigh overbook
    overestimate overhear overshadow overstep pardon penetrate permeate
    personify place plan plead please ponder predicate prejudge preoccupy
    prescribe preserve prevail price punish purchase quarrel range recite
    recognize recollect reconsider refuse refute register rejoin relieve
    repress reprove resume retard retell reunify rewrite rhyme rid riddle
    round sack safeguard service simplify slow soothe span spare speed
    strive subside sue survive suspend swear tempt thirst time trouble
    underestimate undergo upset usher utter verse view yearn yield
    astonish conquer contaminate demonstrate experiment
    `.split(/\s+/).map(normalize).filter(Boolean)
  );
  if (moreReject.has(word)) return 'reject';
  if (VERB_REVIEW.has(word)) return 'review';
  return 'keep';
}

function main() {
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  let whitelist = {};
  if (fs.existsSync(DICT_PATH)) {
    whitelist = JSON.parse(fs.readFileSync(DICT_PATH, 'utf8')).canonicalWhitelist || {};
  }

  const pictList = loadLines(PICT_VERBS);
  const pictSet = new Set(pictList);
  const cefrjRows = parseCefrjGaps();
  const cefrjSet = new Set(cefrjRows.map((r) => r.word));

  // Universe: all CEFR-J A1–B2 gap headwords + picturable bank + topic∩verb
  const byWord = new Map();
  function add(row) {
    const w = row.word;
    if (!w) return;
    const prev = byWord.get(w);
    if (!prev) {
      byWord.set(w, {
        word: w,
        levels: new Set(row.level ? [row.level] : []),
        sources: new Set([row.source]),
      });
      return;
    }
    if (row.level) prev.levels.add(row.level);
    prev.sources.add(row.source);
  }

  for (const r of cefrjRows) add(r);
  for (const w of pictList) add({ word: w, level: '', source: 'picturable-verbs' });
  for (const r of loadTopicActionCandidates(pictSet, cefrjSet)) add(r);

  // Also fold prior A1/A2 shortlist reject/review piles if present (re-scrub)
  for (const name of ['verbs-rejected.txt', 'verbs-review.txt', 'manus-verbs-a1-a2.txt', 'manus-verbs-wave1-approved.txt']) {
    const p = path.join(OUT, name);
    for (const w of loadLines(p)) {
      add({ word: w, level: '', source: `prior:${name}` });
    }
  }

  const checked = [...byWord.values()].sort((a, b) => a.word.localeCompare(b.word));
  const covered = [];
  const keep = [];
  const review = [];
  const rejected = [];
  const skipped = [];

  for (const row of checked) {
    const hit = verifiedPackHit(index, row.word, whitelist);
    if (hit?.verified) {
      covered.push(row.word);
      continue;
    }
    const bucket = verbBucket(row.word);
    const levels = [...row.levels].sort().join('|') || '';
    const sources = [...row.sources].sort().join(',');
    const rec = {
      word: row.word,
      key: slug(row.word),
      levels,
      sources,
      bucket,
    };
    if (bucket === 'skip') skipped.push(rec);
    else if (bucket === 'reject') rejected.push(rec);
    else if (bucket === 'review') review.push(rec);
    else keep.push(rec);
  }

  fs.mkdirSync(OUT, { recursive: true });
  const keptWords = keep.map((r) => r.word);
  const waveDir = path.join(OUT, WAVE);
  fs.mkdirSync(waveDir, { recursive: true });

  fs.writeFileSync(path.join(waveDir, 'manus-verbs-kept.txt'), keptWords.join('\n') + '\n');
  fs.writeFileSync(
    path.join(waveDir, 'manus-verbs-review.txt'),
    review.map((r) => r.word).join('\n') + (review.length ? '\n' : '')
  );
  fs.writeFileSync(
    path.join(waveDir, 'manus-verbs-rejected.txt'),
    rejected.map((r) => r.word).join('\n') + (rejected.length ? '\n' : '')
  );

  // Next Manus wave queue (canonical one-word-per-line)
  fs.writeFileSync(path.join(OUT, 'manus-verbs-wave2.txt'), keptWords.join('\n') + '\n');
  fs.writeFileSync(path.join(waveDir, 'all-keys.txt'), keep.map((r) => r.key).join('\n') + '\n');

  const byLevel = { A1: 0, A2: 0, B1: 0, B2: 0, other: 0 };
  for (const r of keep) {
    const lv = (r.levels.split('|').filter(Boolean)[0] || 'other');
    if (byLevel[lv] != null) byLevel[lv] += 1;
    else byLevel.other += 1;
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    matchRule: 'verifiedPackHit after Wave1 pack',
    totals: {
      candidatesChecked: checked.length,
      alreadyCovered: covered.length,
      keep: keep.length,
      review: review.length,
      rejected: rejected.length,
      skippedPolicy: skipped.length,
    },
    keepByFirstLevel: byLevel,
    outputs: {
      keptList: 'tmp/cefrj-manus/manus-verbs-wave2.txt',
      waveDir: `tmp/cefrj-manus/${WAVE}/`,
    },
    note: 'Permissive picturability scrub. No Manus send. High-confidence = keep bucket.',
  };

  fs.writeFileSync(path.join(waveDir, 'summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(waveDir, 'companion.json'), JSON.stringify({ keep, review, rejected, skipped }, null, 2));
  fs.writeFileSync(
    path.join(waveDir, 'summary.md'),
    [
      '# CEFR-J expanded verb wave (prep)',
      '',
      `- Candidates checked: **${checked.length}**`,
      `- Already covered (pack): **${covered.length}**`,
      `- Keep (next Manus): **${keep.length}**`,
      `- Review: **${review.length}**`,
      `- Rejected: **${rejected.length}**`,
      `- Policy skip: **${skipped.length}**`,
      '',
      'Queue: `tmp/cefrj-manus/manus-verbs-wave2.txt`',
      '',
      'Manus: **not sent**',
      '',
    ].join('\n')
  );

  console.log(JSON.stringify(summary.totals, null, 2));
  console.log('wrote', path.join(OUT, 'manus-verbs-wave2.txt'), keep.length, 'verbs');
}

main();
