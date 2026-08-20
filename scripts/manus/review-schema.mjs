/**
 * Structured output schema + pass-off brief for Manus ClassIn lesson critiques.
 * Schema follows Manus strict subset: all props required, additionalProperties false.
 *
 * Aligned to Manus upstream `classin-lesson-quality-review-skill` (J4up skill-att-2,
 * 2026-08): board map · JUST FIXED table · 5-dimension rubric · gate_holes ·
 * method_feedback · producer next_actions · ZPD · /5 scorecard.
 */

export const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    verdict: {
      type: 'string',
      enum: ['pass', 'revise', 'fail'],
      description: 'pass = ready for ClassIn; revise = fixable; fail = blocking issues first',
    },
    score: {
      type: 'integer',
      description: '0-100 overall (map from scorecard.overall /5 × 20 when using /5 dims)',
    },
    edb_alignment: {
      type: 'object',
      properties: {
        strengths: { type: 'array', items: { type: 'string' } },
        gaps: { type: 'array', items: { type: 'string' } },
      },
      required: ['strengths', 'gaps'],
      additionalProperties: false,
    },
    classin_fit: {
      type: 'object',
      properties: {
        strengths: { type: 'array', items: { type: 'string' } },
        gaps: { type: 'array', items: { type: 'string' } },
      },
      required: ['strengths', 'gaps'],
      additionalProperties: false,
    },
    engagement_and_pacing: { type: 'array', items: { type: 'string' } },
    language_accuracy: { type: 'array', items: { type: 'string' } },
    blocking_issues: {
      type: 'array',
      items: { type: 'string' },
      description: 'Must-fix before another Manus pass or ClassIn upload (label B1/B2 + scene + action)',
    },
    nice_to_haves: { type: 'array', items: { type: 'string' } },
    next_actions: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Concrete producer/machinery fixes as "Priority|Scene|Action" (Blocking/High/Medium/Low)',
    },
    gate_holes: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Local check claimed pass but board fails — format: "check|claimed|board_evidence|severity"',
    },
    method_feedback: {
      type: 'array',
      items: { type: 'string' },
      description:
        'JUST FIXED regress or unreliable check — format: "item|issue|recommendation"',
    },
    just_fixed_results: {
      type: 'array',
      items: { type: 'string' },
      description:
        'One line per JUST FIXED claim: "HOLDS|fix|board evidence" or "FAIL|fix|board evidence"',
    },
    scorecard: {
      type: 'object',
      properties: {
        edb_alignment: { type: 'number', description: '1-5' },
        classin_delivery: { type: 'number', description: '1-5' },
        ppt_like_quality: { type: 'number', description: '1-5' },
        esl_pedagogy: { type: 'number', description: '1-5' },
        completeness: { type: 'number', description: '1-5' },
        overall: { type: 'number', description: '1-5 overall' },
        notes: { type: 'string' },
      },
      required: [
        'edb_alignment',
        'classin_delivery',
        'ppt_like_quality',
        'esl_pedagogy',
        'completeness',
        'overall',
        'notes',
      ],
      additionalProperties: false,
    },
    zpd_challenges: {
      type: 'array',
      items: { type: 'string' },
      description:
        'When overall > 4.0: 1–2 Level-Up challenges (Topic Expansion / Format Challenge / Pedagogical Stretch). Empty array if overall ≤ 4.0.',
    },
    weakest_link: {
      type: 'string',
      description:
        'ANTI-INFLATION (required EVEN on a pass): name the single weakest page + one required improvement — format "scene/page|required improvement". Never empty; never award a perfect/near-perfect score without naming a weakest link.',
    },
    escalation_homework: {
      type: 'string',
      description:
        'Exactly ONE escalating generalization challenge as a buildable spec that stresses the PRODUCER (a new topic, a new page type, a harder CEFR level, or a multi-round activity), escalating relative to what has already passed. Phrase as a proposal the human can accept or decline — not an auto-build.',
    },
  },
  required: [
    'verdict',
    'score',
    'edb_alignment',
    'classin_fit',
    'engagement_and_pacing',
    'language_accuracy',
    'blocking_issues',
    'nice_to_haves',
    'next_actions',
    'gate_holes',
    'method_feedback',
    'just_fixed_results',
    'scorecard',
    'zpd_challenges',
    'weakest_link',
    'escalation_homework',
  ],
  additionalProperties: false,
};

function listBlock(label, items) {
  const rows = (items || []).map((s) => String(s).trim()).filter(Boolean);
  if (!rows.length) return '';
  return `\n${label}:\n- ${rows.join('\n- ')}`;
}

/**
 * Pass-off brief Manus receives with board JPGs.
 * Lead with holistic judgment; optional context; structured output for foldability.
 *
 * @param {{
 *   title?: string,
 *   level?: string,
 *   duration?: string,
 *   knownIssues?: string[],
 *   justFixed?: string[],
 *   localChecks?: string | string[],
 *   focus?: string | string[],
 *   notes?: string,
 * }} meta
 */
export function buildReviewBrief(meta = {}) {
  const title = meta.title || 'Untitled lesson';
  const level = meta.level || 'unspecified';
  const duration = meta.duration || 'unspecified';
  const known = (meta.knownIssues || []).filter(Boolean);
  const fixed = (meta.justFixed || []).filter(Boolean);
  const gates = Array.isArray(meta.localChecks)
    ? meta.localChecks.filter(Boolean)
    : String(meta.localChecks || '')
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);
  const focus = Array.isArray(meta.focus)
    ? meta.focus.filter(Boolean)
    : String(meta.focus || '')
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);
  const notes = (meta.notes || '').trim();

  return [
    'PRIMARY ASK: What do you think of this lesson?',
    'Look at the attached baked board page JPGs with teacher + student eyes. Give honest holistic judgment.',
    '',
    'PRODUCT CONTEXT (ClassIn EDB board — PPT-like live-class slides):',
    `- Lesson: ${title}`,
    `- CEFR level: ${level} · Duration: ${duration} min`,
    '- Medium: ClassIn EDB — page types (title, warm-up, new words, frames, story beats, comprehension, activity, wrap), drag pieces, locked backgrounds, chrome/text on flats, roleplay docks / match pads when present.',
    '- JUDGE ONLY — structured feedback. Do NOT rewrite the whole lesson or regenerate slides.',
    '',
    'EVERYTHING IS FAIR GAME FOR GRADING — no category is off-limits:',
    'pedagogy, visual/UX, overlay/occlusion, overflow/truncation, readability, sizing, contrast, image-match honesty, aims, timing, backgrounds, completeness, ClassIn delivery, EDB alignment, spelling/clipping, match honesty, story↔comprehension fit, level-fit — score and find issues wherever the JPGs show problems.',
    '',
    'Apply your ClassIn lesson quality review skill (board map → JUST FIXED verify → 5-dim rubric → findings → gate_holes when useful → method_feedback → next_actions → ZPD → scorecard).',
    'Rubric dimensions (score each /5 in scorecard): EDB Alignment · ClassIn Delivery · PPT-like Quality · ESL Pedagogy · Completeness.',
    'Prefer next_actions aimed at the producer (prompts, layouts, props, gates), not one-off Photoshop.',
    'If scorecard.overall > 4.0, fill zpd_challenges (Topic Expansion / Format Challenge / Pedagogical Stretch).',
    '',
    'LIGHT QUALITY BARS (these ADD output — they do not shrink what you may judge):',
    '1) ANTI-INFLATION — ALWAYS name the single weakest page + one required improvement in weakest_link, EVEN on a pass. No perfect / near-perfect score without a named weakest link.',
    '2) ESCALATING HOMEWORK — propose exactly ONE escalating generalization challenge in escalation_homework as a buildable producer-stressing spec (new topic / new page type / harder CEFR / multi-round). Human triages — not an auto-build.',
    '3) Intentional items listed under KNOWN: do not escalate those to blocking unless THIS bake is clearly worse; if weakest_link must land on one, prefix "[known-intentional]". Everything else = full judgment.',
    listBlock('OPTIONAL CONTEXT — we\'ve been working on / intentional (not a skip-list)', known),
    listBlock('OPTIONAL CONTEXT — please verify if you can (JUST FIXED → just_fixed_results HOLDS/FAIL)', fixed),
    listBlock('OPTIONAL CONTEXT — local checks we already tried (hints only — still grade the board)', gates),
    listBlock('OPTIONAL CONTEXT — emphasis tilt this pass (not “ignore everything else”)', focus),
    notes ? `\nNotes:\n${notes}` : '',
    '',
    'STRUCTURED OUTPUT (required — foldable fields, not don’t-look rules):',
    '- just_fixed_results: one HOLDS|… or FAIL|… line per JUST FIXED item (if any).',
    '- gate_holes as "check|claimed|board_evidence|severity" when a local check clearly lied — in addition to normal findings when something is simply bad.',
    '- method_feedback as "item|issue|recommendation" when JUST FIXED regresses or a check is unreliable.',
    '- scorecard: five dimensions + overall on 1–5 scale + short notes; score 0–100 ≈ overall×20.',
    '- zpd_challenges: 1–2 Level-Ups when overall > 4.0; else [].',
    '- weakest_link: single weakest page + one required improvement ("scene/page|improvement") — REQUIRED even on a pass.',
    '- escalation_homework: exactly ONE buildable generalization challenge the human can accept or decline.',
    '- Put blocking_issues first; keep next_actions as Priority|Scene|Action for the producer.',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Normalize a pass-off JSON object (file or API args) into buildReviewBrief meta.
 */
export function normalizePassOff(raw = {}, defaults = {}) {
  const p = raw && typeof raw === 'object' ? raw : {};
  const split = (v) => {
    if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
    if (v == null || v === '') return [];
    return String(v).split('|').map((s) => s.trim()).filter(Boolean);
  };
  return {
    title: p.title || defaults.title,
    level: p.level || defaults.level,
    duration: p.duration || defaults.duration,
    knownIssues: split(p.knownIssues || p.known || defaults.knownIssues),
    justFixed: split(p.justFixed || p.fixed || defaults.justFixed),
    localChecks: split(p.localChecks || p.gates || defaults.localChecks),
    focus: split(p.focus || defaults.focus),
    notes: p.notes || defaults.notes || '',
  };
}
