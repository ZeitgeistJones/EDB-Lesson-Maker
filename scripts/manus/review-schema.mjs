/**
 * Structured output schema + pass-off brief for Manus ClassIn lesson critiques.
 * Schema follows Manus strict subset: all props required, additionalProperties false.
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
      description: '0-100 overall quality for a live ClassIn ESL board lesson',
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
      description: 'Must-fix before another Manus pass or ClassIn upload',
    },
    nice_to_haves: { type: 'array', items: { type: 'string' } },
    next_actions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Concrete producer/machinery fixes, ordered by priority',
    },
    gate_holes: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Places where local checks claimed pass (or were skipped) but the board still fails — name the check if guessable',
    },
    method_feedback: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Critique of our producer method or pass-off claims (just-fixed that still looks broken, focus that missed the real miss, etc.)',
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
 * Keep short — known / just-fixed / gates / focus + meta ask.
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
    'You are reviewing a ClassIn ESL board lesson (EDB-aligned, PPT-like scenes).',
    'JUDGE ONLY — structured feedback. Do NOT rewrite the whole lesson or regenerate slides.',
    '',
    `Lesson: ${title}`,
    `Level: ${level} · Duration: ${duration}`,
    '',
    'Attached = baked board page JPGs (teacher + student eyes).',
    '',
    'Rubric: EDB alignment · ClassIn delivery · PPT-like beats · ESL pedagogy · completeness.',
    'Prefer next_actions aimed at the producer (prompts, layouts, props, gates), not one-off Photoshop.',
    listBlock('KNOWN open issues (do not re-litigate unless worse)', known),
    listBlock('JUST FIXED this pass (verify these still hold; call method_feedback if they do not)', fixed),
    listBlock('LOCAL CHECKS we ran / claim', gates),
    listBlock('FOCUS this pass', focus),
    notes ? `\nNotes:\n${notes}` : '',
    '',
    'META (required in structured output):',
    '- If something still fails that our LOCAL CHECKS claimed as pass (or we said JUST FIXED), put it in gate_holes and method_feedback.',
    '- If a miss is only in KNOWN, mention only if worse than stated — otherwise skip.',
    '- Put blocking_issues first; keep next_actions concrete for the producer.',
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
