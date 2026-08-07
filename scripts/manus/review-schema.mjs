/**
 * Structured output schema + review brief for Manus ClassIn lesson critiques.
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
  ],
  additionalProperties: false,
};

/**
 * Build the judge-only brief Manus receives with board JPGs.
 * @param {{ title?: string, level?: string, duration?: string, knownIssues?: string[], notes?: string }} meta
 */
export function buildReviewBrief(meta = {}) {
  const title = meta.title || 'Untitled lesson';
  const level = meta.level || 'unspecified';
  const duration = meta.duration || 'unspecified';
  const known = (meta.knownIssues || []).filter(Boolean);
  const notes = meta.notes || '';

  return [
    'You are reviewing a ClassIn ESL board lesson (EDB-aligned, PPT-like scenes).',
    'JUDGE ONLY — return structured feedback. Do NOT rewrite the whole lesson or regenerate slides.',
    '',
    `Lesson title: ${title}`,
    `CEFR / level: ${level}`,
    `Duration: ${duration}`,
    '',
    'Attached images are baked board pages (and optionally a contact strip).',
    'Judge as both teacher and student: readable, navigable, accurate vocab art, varied/appropriate backgrounds, fun/charming where intended.',
    '',
    'Rubric:',
    '1. EDB alignment — objectives, language focus, assessment match',
    '2. ClassIn delivery — clear scenes, teacher prompts, timing, drag/interact beats that work on ClassIn',
    '3. PPT-like quality — one idea per beat, readable text, logical sequence',
    '4. ESL pedagogy — input → practice → output, scaffolding',
    '5. Completeness — no TBD/lorem, media present, instructions unambiguous',
    '',
    'Put blocking issues first. Prefer actionable next_actions aimed at the producer (prompts, layouts, props, backgrounds), not one-off Photoshop of a single PNG.',
    known.length
      ? `\nAlready known open issues (do not re-litigate unless worse than noted):\n- ${known.join('\n- ')}`
      : '',
    notes ? `\nExtra context:\n${notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
