/* lessonTraits.js — per-lesson / per-topic trait registry (producer seam).
 * Classic script → window.LessonTraits
 *
 * WHY THIS EXISTS
 * The board producer used to branch inline on topic strings (if music / if
 * feelings / if dental …) in several places. That made adding a new topic mean
 * more inline `if` branches. This module expresses those decisions as DATA:
 * ordered topic matchers + a hint table + a resolver. Routing the inline
 * conditionals through here is behavior-preserving — the regexes and strings
 * below are byte-identical to the ones they replace — so adding a new topic
 * becomes "add a matcher + a hint row", not "add another if".
 *
 * SCOPE (this slice): the branches used by renderLessonPages.js —
 *   - music/classical title-charm (buildSectionList musicTitle)
 *   - feelings / face king detection (makeActivity)
 *   - the per-topic king hint cascade (makeActivity)
 * Other topic branches in edbActivities.js (findHeroProp curated stages,
 * roleplayDockProps dock selection, heroProp feelings stage, attachBgPicks
 * skipKing) are marked `// TODO: move to lessonTraits` and still run inline.
 */
(function () {
  // Topic matchers — kept byte-identical to the inline regexes they replace.
  // Callers pass their own cue string; we never change what gets tested, only
  // where the pattern lives.
  const RE = {
    feelingsCore: /\b(feeling|feelings|emotion|emotions|mood)\b/,
    feelingsWords: /\b(worried|scared|shy|confused|proud|surprised|happy|sad|angry|bored|sleepy|excited|tired)\b/,
    faceGuard: /\b(hair|eyes|nose|ear|ears|make.?a.?face)\b/,
    faceCue: /face|hair|eyes|make.?a.?face/,
    // "patient" is general clinic/hospital — do not steal doctor lessons onto
    // the dental open-mouth stage (hospital quality loop).
    dental: /\b(dentist|dental|tooth|teeth|cavity|floss)\b/,
    hospital: /\b(doctor|clinic|hospital|nurse|medical|checkup|diagnosis|symptoms?|prescription|appointment|fever|sick)\b/,
    castle: /\b(castle|knight|dragon|royal|fortress|portcullis)\b/,
    trampoline: /\b(trampoline|bounce|backflip)\b/,
    music: /\b(music|compose|composer|orchestra|symphony|concert|classical|melody|harmony|piano|violin)\b/,
    beach: /\b(beach|shore|seaside|sandcastle|ocean|seashell)\b/,
  };

  // King-stage instruction copy, keyed by resolved king type. `default` is the
  // sane fallback (unknown lessons read exactly as before).
  const KING_HINTS = {
    default: 'Drag the pieces onto the stage. Then say or write one sentence about your idea.',
    feelings: '<b>Round 1:</b> drag a feeling face onto the blank face; write or say how it feels.<br><b>Round 2:</b> your partner reads the face, names the feeling, then answers with If I felt ____, I would ____.',
    face: 'Drag parts onto the face. Then say: My friend has ___',
    dental: 'Drag tools onto the patient. Then say what you used and why.',
    hospital: 'Drag tools onto the patient. Then say what you used and why.',
    castle: 'Drag pieces onto the castle. Then say what you built.',
    trampoline: 'Drag pieces onto the trampoline. Then say your bounce plan.',
    music: 'Drag musicians onto the stage. Then write or say your symphony idea in 1–2 sentences.',
    beach: 'Drag beach things onto the sandcastle. Then say what you find or bring.',
  };

  // Ordered regex-tested king types (checked only after the caller-supplied
  // feelings/face booleans). Order MUST match the original else-if cascade:
  // dental → hospital → castle → trampoline → music → beach.
  const KING_TYPE_RULES = [
    { type: 'dental', re: RE.dental },
    { type: 'hospital', re: RE.hospital },
    { type: 'castle', re: RE.castle },
    { type: 'trampoline', re: RE.trampoline },
    { type: 'music', re: RE.music },
    { type: 'beach', re: RE.beach },
  ];

  function vocabWords(lesson) {
    return ((lesson && lesson.vocabulary) || [])
      .map((v) => (typeof v === 'string' ? v : v && v.word))
      .filter(Boolean);
  }

  // buildSectionList musicTitle: title + vocab blob → SceneBackgrounds mood.
  function isMusicTitle(lesson) {
    const topic = (lesson && lesson.title) || '';
    const topicBlob = [topic, ...vocabWords(lesson)].join(' ');
    return !!(
      window.SceneBackgrounds &&
      window.SceneBackgrounds.moodsFor &&
      (window.SceneBackgrounds.moodsFor(topicBlob) || []).includes('music')
    );
  }

  // makeActivity feelingsKing: emotion words win unless the cue is a make-a-face
  // lesson. Cue is lowercased so the guard is case-insensitive like the original
  // (the call site passes an already-lowercased kingCue, so this is a no-op there).
  function isFeelingsCue(cue) {
    const c = String(cue || '').toLowerCase();
    return RE.feelingsCore.test(c)
      || (RE.feelingsWords.test(c) && !RE.faceGuard.test(c));
  }

  // makeActivity faceKing regex (original used /…/i on a non-lowercased join —
  // lowercasing here + a non-i regex is equivalent).
  function isFaceCue(cue) {
    return RE.faceCue.test(String(cue || '').toLowerCase());
  }

  // Resolve the king type. feelings/face are decided by the caller (they depend
  // on plan state, not just the cue) and win first, preserving the cascade.
  function kingTypeFor(cue, opts) {
    if (opts && opts.feelingsKing) return 'feelings';
    if (opts && opts.faceKing) return 'face';
    const c = String(cue || '');
    for (const rule of KING_TYPE_RULES) {
      if (rule.re.test(c)) return rule.type;
    }
    return 'default';
  }

  function kingHintFor(cue, opts) {
    return KING_HINTS[kingTypeFor(cue, opts)];
  }

  // Lesson-level resolver. Returns the trait bundle the render spine reads, with
  // a sane default (musicTitle:false) so unknown lessons behave as the fallback.
  function traitsFor(lesson) {
    lesson = lesson || {};
    return {
      musicTitle: isMusicTitle(lesson),
    };
  }

  window.LessonTraits = {
    RE,
    KING_HINTS,
    KING_TYPE_RULES,
    traitsFor,
    isMusicTitle,
    isFeelingsCue,
    isFaceCue,
    kingTypeFor,
    kingHintFor,
  };
})();
