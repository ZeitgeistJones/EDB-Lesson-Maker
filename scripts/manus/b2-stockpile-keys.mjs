/**
 * B2 final vertical visual stockpile keys.
 *
 * B2 shapes, weighs, and answers back: main vs support, option vs
 * trade-off, view vs another view, source A vs B, plan vs multiple
 * constraints, position vs counterpoint, possible vs actual.
 *
 * Stockpile only. No renderer wiring, no B1/A2 wiring, no C1/C2 work.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';

export const STOCKPILE_REL = 'harvested/manus-b2-stockpile';
export const TRACKED_INV_REL = 'docs/b2-stockpile-inventory.json';
export const TRACKED_SPEC_REL = 'docs/b2-stockpile-spec.json';
export const CODE_LATER_REL = 'docs/b2-code-later.json';

export const SAFETY_SKIP_KEYS = new Set([
  'rape',
  'massacre',
  'murder',
  'suicide',
  'torture',
  'missile',
  'bomb',
  'gun',
]);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const STYLE = `STYLE LOCK: child-friendly ClassIn ESL board art, clean sparse vector/soft-matte educational illustration, familiar school/clubs/sports/trips/project contexts, no logos, no watermarks, no adult office/courtroom/politics.
TEXT LOCK: BLANK / text-free only. Do NOT bake English words, captions, labels, letters, numbers, prices, times, dates, source names, paragraph text, handwriting, score text, menu text, UI text, or signs into the art.
BLACK CONTACT LOCK: every contact sheet must be pure #000000 black edge-to-edge. Empty cells stay pure black. Art may contain blank cards/bubbles, but the cell/background behind each object remains black.
B2 FIREWALL: B2 shapes, weighs, and answers back. Show relationships between familiar school/project choices, sources, constraints, views, risks, counterproposals, and actual outcomes.
LOWER-LEVEL REUSE LOCK: A2 already covers links, sequence, simple cause/contrast, paired states, information-gap, short revision, simple social repair, and text-type skins. B1 already covers brief reason/evidence, one complication, source-to-fact-to-recipient, two familiar perspectives, prediction changed by one fact, and self-repair. Do not duplicate those under B2 names.
C1 DEFER LOCK: no sophisticated rhetoric, rebuttal chains, irony/bias, academic research, 3+ complex sources, diplomacy, high-stakes negotiation, long essays, mixed conditionals, or abstract policy.
DELIVERY: PNG black-field contact sheets. One concept per cell with clear gutters. quality: default only.`;

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function b2Key(key) {
  return `b2-${slug(key)}`;
}

function g(key, brief, family, wave, phase, note = '') {
  return { key: b2Key(key), concept: key, brief, family, wave, phase, classification: 'GENERATE', note };
}

function r(key, existing, family, wave, phase, reason = 'Existing lower-level or live-bank asset already communicates this meaning; semantic reuse preferred over new art.') {
  return { key: b2Key(key), concept: key, family, wave, phase, classification: 'REUSE_EXISTING', existing, reason };
}

function c(key, family, wave, phase, reason = 'Boxes, grids, rails, labels, writing areas, arrows, scores, highlights, or dynamic text should be code-rendered later, not illustrated.') {
  return { key: b2Key(key), concept: key, family, wave, phase, classification: 'CODE_LATER', reason };
}

function d(key, family, wave, phase, reason = 'Deferred to C1/C2: sophisticated argument, rhetoric, bias/irony, academic synthesis, high-stakes negotiation, long-form writing, or abstract policy.') {
  return { key: b2Key(key), concept: key, family, wave, phase, classification: 'DEFER_C1', reason };
}

function filler(kind, count, family, wave, phase, start = 1) {
  const out = [];
  for (let i = start; i < start + count; i += 1) {
    const n = String(i).padStart(2, '0');
    const key = `${slug(family)}-${kind.toLowerCase()}-${n}`;
    if (kind === 'CODE_LATER') out.push(c(key, family, wave, phase));
    if (kind === 'REUSE_EXISTING') out.push(r(key, 'lower-vertical-stockpile-or-live-bank', family, wave, phase));
    if (kind === 'DEFER_C1') out.push(d(key, family, wave, phase));
  }
  return out;
}

export const FAMILY_PROPOSALS = [
  {
    id: 'family-1-argument-architecture',
    family: 'argument-architecture',
    wave: 1,
    phase: 'P0',
    expected: 28,
    items: [
      g('argument-main-claim-with-two-supports', 'one large central picture idea held up by two smaller concrete support picture cards, no labels', 'argument-architecture', 1, 'P0'),
      g('argument-support-stronger-than-example', 'two support cards under one claim where one clearly bears more visual weight than the other, no numbers or words', 'argument-architecture', 1, 'P0'),
      g('argument-position-answers-counterpoint-lite', 'child holds a chosen view card while calmly answering one opposite view card with a practical picture cue, no text', 'argument-architecture', 1, 'P0'),
      g('argument-evidence-changes-view', 'new concrete clue card gently turns a child from one view card toward another, no writing', 'argument-architecture', 1, 'P0'),
      g('argument-weak-support-wobbles', 'support picture card visibly wobbles under a claim tile while a stronger support stands firm, no text', 'argument-architecture', 1, 'P0'),
      g('argument-view-reason-response-loop', 'view card links to reason object, then to response bubble, as one compact loop, no words', 'argument-architecture', 1, 'P0'),
      r('argument-simple-reason', 'b1-reason-example-supports-answer', 'argument-architecture', 1, 'P0'),
      r('argument-opinion-reason-outcome', 'b1-viewpoint-opinion-reason-outcome', 'argument-architecture', 1, 'P0'),
      r('argument-one-evidence-pin', 'a2-comp-attribute-evidence-pin', 'argument-architecture', 1, 'P0'),
      r('argument-cause-link', 'a2-conn-because-cause-spark', 'argument-architecture', 1, 'P0'),
      r('argument-two-familiar-perspectives', 'b1-viewpoint-two-familiar-perspectives', 'argument-architecture', 1, 'P0'),
      ...filler('CODE_LATER', 12, 'argument-architecture', 1, 'P0'),
      d('argument-rebuttal-chain', 'argument-architecture', 1, 'P0'),
      d('argument-rhetorical-strategy', 'argument-architecture', 1, 'P0'),
      d('argument-academic-claim-citation', 'argument-architecture', 1, 'P0'),
      d('argument-ironic-position', 'argument-architecture', 1, 'P0'),
      d('argument-abstract-policy-case', 'argument-architecture', 1, 'P0'),
    ],
  },
  {
    id: 'family-2-trade-offs',
    family: 'trade-offs',
    wave: 1,
    phase: 'P0',
    expected: 24,
    items: [
      g('tradeoff-comfort-vs-speed', 'school trip choice between comfy slow route and faster less comfy route, both visible, no words', 'trade-offs', 1, 'P0'),
      g('tradeoff-fun-vs-safety-margin', 'club activity choice shows exciting option balanced against safer prepared option, no danger and no text', 'trade-offs', 1, 'P0'),
      g('tradeoff-cost-token-vs-quality-object', 'two school project materials: cheaper plain option and better limited-token option, no prices or numbers', 'trade-offs', 1, 'P0'),
      g('tradeoff-time-vs-detail', 'quick simple poster beside slower detailed poster with blank surfaces only, no writing', 'trade-offs', 1, 'P0'),
      g('tradeoff-team-preference-split', 'team choice card pulled toward two different activity preferences by two children, no labels', 'trade-offs', 1, 'P0'),
      g('tradeoff-compromise-middle-option', 'middle choice keeps part of two competing child-friendly goals, no words', 'trade-offs', 1, 'P0'),
      r('tradeoff-simple-compare-balance', 'a2-conn-contrast-balance-scale', 'trade-offs', 1, 'P0'),
      r('tradeoff-preference-choice', 'a2-comp-preference-heart-choice', 'trade-offs', 1, 'P0'),
      r('tradeoff-three-options', 'b1-choose-three-practical-options', 'trade-offs', 1, 'P0'),
      r('tradeoff-options-two-paths', 'b1-problem-options-two-paths', 'trade-offs', 1, 'P0'),
      ...filler('CODE_LATER', 10, 'trade-offs', 1, 'P0'),
      d('tradeoff-roi-matrix', 'trade-offs', 1, 'P0'),
      d('tradeoff-political-values', 'trade-offs', 1, 'P0'),
      d('tradeoff-ethical-dilemma', 'trade-offs', 1, 'P0'),
      d('tradeoff-formal-cost-benefit-analysis', 'trade-offs', 1, 'P0'),
    ],
  },
  {
    id: 'family-3-multi-perspective',
    family: 'multi-perspective',
    wave: 1,
    phase: 'P0',
    expected: 24,
    items: [
      g('perspective-student-teacher-parent-view', 'same school event seen by student, teacher, and parent icons from three gentle viewpoints, no labels', 'multi-perspective', 1, 'P0'),
      g('perspective-main-vs-another-view', 'one main view card in front with another view card respectfully beside it, no text', 'multi-perspective', 1, 'P0'),
      g('perspective-group-project-roles-differ', 'designer, builder, and presenter children each notice different part of same project, no words', 'multi-perspective', 1, 'P0'),
      g('perspective-audience-needs-differ', 'younger child and older child react differently to same blank poster, no readable content', 'multi-perspective', 1, 'P0'),
      g('perspective-view-changes-after-listening', 'child listens to another view bubble and adjusts own choice card slightly, no text', 'multi-perspective', 1, 'P0'),
      r('perspective-two-familiar-perspectives', 'b1-viewpoint-two-familiar-perspectives', 'multi-perspective', 1, 'P0'),
      r('perspective-opinion-reason-outcome', 'b1-viewpoint-opinion-reason-outcome', 'multi-perspective', 1, 'P0'),
      r('perspective-predict-outcome-check', 'b1-viewpoint-predict-outcome-check', 'multi-perspective', 1, 'P0'),
      r('perspective-listener-check', 'b1-conversation-check-understanding', 'multi-perspective', 1, 'P0'),
      r('perspective-preference-heart', 'a2-comp-preference-heart-choice', 'multi-perspective', 1, 'P0'),
      ...filler('CODE_LATER', 9, 'multi-perspective', 1, 'P0'),
      d('perspective-ideological-debate', 'multi-perspective', 1, 'P0'),
      d('perspective-cultural-diplomacy', 'multi-perspective', 1, 'P0'),
      d('perspective-subtext-irony', 'multi-perspective', 1, 'P0'),
      d('perspective-author-bias', 'multi-perspective', 1, 'P0'),
      d('perspective-formal-stakeholder-analysis', 'multi-perspective', 1, 'P0'),
    ],
  },
  {
    id: 'family-4-two-source-synthesis',
    family: 'two-source-synthesis',
    wave: 1,
    phase: 'P0',
    expected: 22,
    items: [
      g('source-a-source-b-overlap', 'two blank source cards share one matching concrete clue in the middle, no labels', 'two-source-synthesis', 1, 'P0'),
      g('source-a-adds-missing-detail', 'second blank source card adds one missing puzzle/detail piece to first source card, no text', 'two-source-synthesis', 1, 'P0'),
      g('source-conflict-check-needed', 'two blank source cards show conflicting simple activity facts and a child checks a neutral clue, no words', 'two-source-synthesis', 1, 'P0'),
      g('source-combine-into-revised-plan', 'two source clue cards feed into one revised school trip plan card, no readable plan text', 'two-source-synthesis', 1, 'P0'),
      g('source-new-update-overrides-old', 'fresh update card gently replaces older source card for a plan choice, no dates or text', 'two-source-synthesis', 1, 'P0'),
      r('source-to-key-facts-recipient', 'b1-info-source-to-key-facts-to-recipient', 'two-source-synthesis', 1, 'P0'),
      r('source-two-key-facts-bundle', 'b1-info-two-key-facts-bundle', 'two-source-synthesis', 1, 'P0'),
      r('source-update-changes-plan', 'b1-info-update-changes-plan', 'two-source-synthesis', 1, 'P0'),
      ...filler('CODE_LATER', 9, 'two-source-synthesis', 1, 'P0'),
      d('source-credibility-ranking', 'two-source-synthesis', 1, 'P0'),
      d('source-author-bias-detection', 'two-source-synthesis', 1, 'P0'),
      d('source-three-plus-academic-synthesis', 'two-source-synthesis', 1, 'P0'),
      d('source-research-citation-map', 'two-source-synthesis', 1, 'P0'),
      d('source-media-literacy-rhetoric', 'two-source-synthesis', 1, 'P0'),
    ],
  },
  {
    id: 'family-5-idea-hierarchy',
    family: 'idea-hierarchy',
    wave: 1,
    phase: 'P0',
    expected: 18,
    items: [
      g('hierarchy-main-idea-branching-support', 'large main idea object branches into two smaller support objects and one tiny example, no labels', 'idea-hierarchy', 1, 'P0'),
      g('hierarchy-example-under-category', 'small example card nests visually under a broader category card, no words', 'idea-hierarchy', 1, 'P0'),
      g('hierarchy-important-vs-extra-detail', 'important detail card glows near main idea while extra detail sits smaller to the side, no text', 'idea-hierarchy', 1, 'P0'),
      r('hierarchy-b1-main-support', 'b1-discourse-main-point-supporting-detail', 'idea-hierarchy', 1, 'P0'),
      r('hierarchy-topic-detail-example', 'b1-discourse-topic-detail-example', 'idea-hierarchy', 1, 'P0'),
      r('hierarchy-example-general-idea', 'b1-discourse-example-to-general-idea', 'idea-hierarchy', 1, 'P0'),
      r('hierarchy-a2-idea-card', 'a2-write-idea-card', 'idea-hierarchy', 1, 'P0'),
      r('hierarchy-a2-detail-bundle', 'a2-listen-detail-bundle', 'idea-hierarchy', 1, 'P0'),
      r('hierarchy-a2-evidence-pin', 'a2-comp-attribute-evidence-pin', 'idea-hierarchy', 1, 'P0'),
      ...filler('CODE_LATER', 7, 'idea-hierarchy', 1, 'P0'),
      d('hierarchy-abstract-thesis-map', 'idea-hierarchy', 1, 'P0'),
      d('hierarchy-essay-outline-rhetoric', 'idea-hierarchy', 1, 'P0'),
    ],
  },
  {
    id: 'family-6-multi-constraint',
    family: 'multi-constraint',
    wave: 1,
    phase: 'P0',
    expected: 30,
    items: [
      g('constraint-weather-time-equipment-tension', 'trip or club plan squeezed by weather, time, and equipment cues at once, no words/numbers', 'multi-constraint', 1, 'P0'),
      g('constraint-competing-goals-pull-plan', 'two or three child-friendly goals gently pull the same plan card in different directions, no labels', 'multi-constraint', 1, 'P0'),
      g('constraint-revised-plan-after-two-blocks', 'plan card revised after two visible constraints appear, such as rain plus missing ball, no text', 'multi-constraint', 1, 'P0'),
      g('constraint-priority-star-among-limits', 'child places priority star on one constraint while others remain visible, no words', 'multi-constraint', 1, 'P0'),
      g('constraint-compromise-keeps-core-goal', 'compromise plan keeps the main activity goal while changing time/place/tool, no text', 'multi-constraint', 1, 'P0'),
      g('constraint-counterproposal-solves-one-limit', 'friend offers alternate plan card that solves one visible constraint but leaves another, no words', 'multi-constraint', 1, 'P0'),
      r('constraint-one-complication', 'b1-complication-rain-starts,b1-complication-item-missing,b1-complication-short-delay', 'multi-constraint', 1, 'P0'),
      r('constraint-plan-clash', 'a2-plan-clash-token', 'multi-constraint', 1, 'P0'),
      r('constraint-update-changes-plan', 'b1-info-update-changes-plan', 'multi-constraint', 1, 'P0'),
      r('constraint-options-choice-outcome', 'b1-problem-notice-matters-options-choice-outcome', 'multi-constraint', 1, 'P0'),
      ...filler('CODE_LATER', 14, 'multi-constraint', 1, 'P0'),
      d('constraint-formal-risk-register', 'multi-constraint', 1, 'P0'),
      d('constraint-legal-policy-exception', 'multi-constraint', 1, 'P0'),
      d('constraint-high-stakes-negotiation', 'multi-constraint', 1, 'P0'),
      d('constraint-systemic-tradeoff', 'multi-constraint', 1, 'P0'),
      d('constraint-mixed-conditional-chain', 'multi-constraint', 1, 'P0'),
      d('constraint-abstract-resource-allocation', 'multi-constraint', 1, 'P0'),
    ],
  },
  {
    id: 'family-7-negotiation-counterproposal',
    family: 'negotiation-counterproposal',
    wave: 2,
    phase: 'P1',
    expected: 26,
    items: [
      g('counterproposal-group-project-alternative', 'one child proposes an alternate project plan card to a team, no words', 'negotiation-counterproposal', 2, 'P1'),
      g('counterproposal-keeps-other-person-goal', 'alternate plan visibly keeps friend goal while changing tool/place/time cue, no text', 'negotiation-counterproposal', 2, 'P1'),
      g('counterproposal-before-after-plan', 'original plan card beside revised compromise plan card with blank surfaces only, no labels', 'negotiation-counterproposal', 2, 'P1'),
      g('counterproposal-small-concession', 'child gives up one small option token to keep group plan moving, no words', 'negotiation-counterproposal', 2, 'P1'),
      r('negotiation-agree', 'b1-conversation-follow-up-after-answer,a2-social-continue-conversation', 'negotiation-counterproposal', 2, 'P1'),
      r('negotiation-suggest', 'b1-action-change-plan', 'negotiation-counterproposal', 2, 'P1'),
      r('negotiation-two-options', 'b1-problem-options-two-paths', 'negotiation-counterproposal', 2, 'P1'),
      r('negotiation-backup-choice', 'b1-action-choose-backup', 'negotiation-counterproposal', 2, 'P1'),
      r('negotiation-check-understanding', 'b1-conversation-check-understanding', 'negotiation-counterproposal', 2, 'P1'),
      r('negotiation-practical-choice', 'a2-comp-preference-heart-choice', 'negotiation-counterproposal', 2, 'P1'),
      ...filler('CODE_LATER', 10, 'negotiation-counterproposal', 2, 'P1'),
      d('negotiation-diplomatic-face-saving', 'negotiation-counterproposal', 2, 'P1'),
      d('negotiation-high-stakes-dispute', 'negotiation-counterproposal', 2, 'P1'),
      d('negotiation-contract-terms', 'negotiation-counterproposal', 2, 'P1'),
      d('negotiation-multi-party-mediation', 'negotiation-counterproposal', 2, 'P1'),
      d('negotiation-rhetorical-pressure', 'negotiation-counterproposal', 2, 'P1'),
      d('negotiation-policy-exception', 'negotiation-counterproposal', 2, 'P1'),
    ],
  },
  {
    id: 'family-8-hypothetical-risk',
    family: 'hypothetical-risk',
    wave: 2,
    phase: 'P1',
    expected: 24,
    items: [
      g('hypothetical-possible-vs-actual-outcome', 'possible outcome bubble beside actual outcome tile after activity, no words', 'hypothetical-risk', 2, 'P1'),
      g('hypothetical-risk-preparation', 'child prepares backup item for a possible familiar problem, no text', 'hypothetical-risk', 2, 'P1'),
      g('hypothetical-if-plan-risk-result', 'plan card with one possible risk cloud and a prepared result card, no if/result words', 'hypothetical-risk', 2, 'P1'),
      r('risk-prediction-condition', 'b1-viewpoint-predict-outcome-check', 'hypothetical-risk', 2, 'P1'),
      r('risk-prediction-changed-by-new-fact', 'b1-viewpoint-prediction-changed-by-new-fact', 'hypothetical-risk', 2, 'P1'),
      r('risk-a2-plan-clash', 'a2-plan-clash-token', 'hypothetical-risk', 2, 'P1'),
      r('risk-a2-delayed', 'a2-travel-delayed-token', 'hypothetical-risk', 2, 'P1'),
      r('risk-b1-complication', 'b1-complication-short-delay', 'hypothetical-risk', 2, 'P1'),
      r('risk-b1-backup-choice', 'b1-action-choose-backup', 'hypothetical-risk', 2, 'P1'),
      r('risk-b1-try-again', 'b1-action-try-again', 'hypothetical-risk', 2, 'P1'),
      ...filler('CODE_LATER', 9, 'hypothetical-risk', 2, 'P1'),
      d('hypothetical-mixed-conditional-regret', 'hypothetical-risk', 2, 'P1'),
      d('hypothetical-complex-contingency-tree', 'hypothetical-risk', 2, 'P1'),
      d('hypothetical-legal-risk', 'hypothetical-risk', 2, 'P1'),
      d('hypothetical-abstract-probability-model', 'hypothetical-risk', 2, 'P1'),
      d('hypothetical-counterfactual-history', 'hypothetical-risk', 2, 'P1'),
    ],
  },
  {
    id: 'family-9-reading-stance-purpose',
    family: 'reading-stance-purpose',
    wave: 2,
    phase: 'P1',
    expected: 24,
    items: [
      g('reading-purpose-scan-vs-study', 'same blank article skin viewed with quick scan magnifier and careful study magnifier, no text', 'reading-stance-purpose', 2, 'P1'),
      g('reading-stance-agree-question-check', 'child reacts to blank source with agree card, question card, and check clue, no labels', 'reading-stance-purpose', 2, 'P1'),
      g('reading-purpose-match-source-to-task', 'source skin matched to task object such as club notice to trip plan, no readable writing', 'reading-stance-purpose', 2, 'P1'),
      r('reading-notice-skin', 'a2-read-notice-skin', 'reading-stance-purpose', 2, 'P1'),
      r('reading-article-skin', 'a2-read-article-skin', 'reading-stance-purpose', 2, 'P1'),
      r('reading-chat-skin', 'a2-read-chat-skin', 'reading-stance-purpose', 2, 'P1'),
      r('reading-key-facts', 'b1-info-two-key-facts-bundle', 'reading-stance-purpose', 2, 'P1'),
      r('reading-update-plan', 'b1-info-update-changes-plan', 'reading-stance-purpose', 2, 'P1'),
      r('reading-detail-pin', 'a2-listen-heard-detail-pin', 'reading-stance-purpose', 2, 'P1'),
      ...filler('CODE_LATER', 10, 'reading-stance-purpose', 2, 'P1'),
      d('reading-irony', 'reading-stance-purpose', 2, 'P1'),
      d('reading-bias-detection', 'reading-stance-purpose', 2, 'P1'),
      d('reading-rhetorical-purpose', 'reading-stance-purpose', 2, 'P1'),
      d('reading-academic-source-evaluation', 'reading-stance-purpose', 2, 'P1'),
      d('reading-author-position-analysis', 'reading-stance-purpose', 2, 'P1'),
    ],
  },
  {
    id: 'family-10-multi-speaker-listening',
    family: 'multi-speaker-listening',
    wave: 2,
    phase: 'P1',
    expected: 22,
    items: [
      g('listening-speaker-a-vs-b-views', 'two speakers give different blank bubble views about same activity card, no words', 'multi-speaker-listening', 2, 'P1'),
      g('listening-speaker-agrees-then-adds', 'second speaker agrees with first picture bubble then adds one new clue card, no text', 'multi-speaker-listening', 2, 'P1'),
      g('listening-speaker-corrects-detail', 'speaker gently corrects one detail card from another speaker, no labels', 'multi-speaker-listening', 2, 'P1'),
      r('listening-detail-bundle', 'a2-listen-detail-bundle', 'multi-speaker-listening', 2, 'P1'),
      r('listening-revise-token', 'a2-listen-revise-token', 'multi-speaker-listening', 2, 'P1'),
      r('listening-verify-token', 'a2-listen-verify-token', 'multi-speaker-listening', 2, 'P1'),
      r('listening-relayed-message', 'b1-grammar-speaker-relayed-message', 'multi-speaker-listening', 2, 'P1'),
      r('listening-clarify-one-point', 'b1-conversation-clarify-one-point', 'multi-speaker-listening', 2, 'P1'),
      r('listening-check-understanding', 'b1-conversation-check-understanding', 'multi-speaker-listening', 2, 'P1'),
      ...filler('CODE_LATER', 9, 'multi-speaker-listening', 2, 'P1'),
      d('listening-subtext-tone', 'multi-speaker-listening', 2, 'P1'),
      d('listening-implicit-bias', 'multi-speaker-listening', 2, 'P1'),
      d('listening-diplomatic-disagreement', 'multi-speaker-listening', 2, 'P1'),
      d('listening-lecture-synthesis', 'multi-speaker-listening', 2, 'P1'),
    ],
  },
  {
    id: 'family-11-presentation-audience',
    family: 'presentation-audience',
    wave: 2,
    phase: 'P1',
    expected: 22,
    items: [
      g('presentation-audience-reaction-adjust', 'presenter notices audience confusion and swaps to simpler picture card, no text', 'presentation-audience', 2, 'P1'),
      g('presentation-main-point-then-example-prop', 'presenter shows one main object then a concrete example prop, blank board only, no words', 'presentation-audience', 2, 'P1'),
      r('presentation-audience-child-badge', 'a2-write-audience-child-badge', 'presentation-audience', 2, 'P1'),
      r('presentation-purpose-badge', 'a2-write-purpose-badge', 'presentation-audience', 2, 'P1'),
      r('presentation-main-support', 'b1-discourse-main-point-supporting-detail', 'presentation-audience', 2, 'P1'),
      r('presentation-add-detail', 'b1-conversation-add-detail-follow-up', 'presentation-audience', 2, 'P1'),
      r('presentation-check-understanding', 'b1-conversation-check-understanding', 'presentation-audience', 2, 'P1'),
      ...filler('CODE_LATER', 12, 'presentation-audience', 2, 'P1'),
      d('presentation-persuasive-rhetoric', 'presentation-audience', 2, 'P1'),
      d('presentation-formal-speech-structure', 'presentation-audience', 2, 'P1'),
      d('presentation-sensitive-audience-diplomacy', 'presentation-audience', 2, 'P1'),
    ],
  },
  {
    id: 'family-12-mediation-organize-simplify',
    family: 'mediation-organize-simplify',
    wave: 2,
    phase: 'P1',
    expected: 20,
    items: [
      g('mediation-complex-to-simple-picture', 'child turns a busy blank source card into two simple picture cards for a friend, no words', 'mediation-organize-simplify', 2, 'P1'),
      g('mediation-organize-mixed-ideas', 'mixed idea objects sorted into two clear piles with no labels', 'mediation-organize-simplify', 2, 'P1'),
      r('mediation-key-facts-bundle', 'b1-info-two-key-facts-bundle', 'mediation-organize-simplify', 2, 'P1'),
      r('mediation-source-recipient', 'b1-info-source-to-key-facts-to-recipient', 'mediation-organize-simplify', 2, 'P1'),
      r('mediation-topic-detail-example', 'b1-discourse-topic-detail-example', 'mediation-organize-simplify', 2, 'P1'),
      r('mediation-simplify-clarify', 'b1-conversation-clarify-one-point', 'mediation-organize-simplify', 2, 'P1'),
      r('mediation-dossier-complete', 'a2-info-dossier-complete', 'mediation-organize-simplify', 2, 'P1'),
      r('mediation-revise-token', 'a2-listen-revise-token', 'mediation-organize-simplify', 2, 'P1'),
      ...filler('CODE_LATER', 9, 'mediation-organize-simplify', 2, 'P1'),
      d('mediation-conflict-resolution-diplomacy', 'mediation-organize-simplify', 2, 'P1'),
      d('mediation-academic-summary', 'mediation-organize-simplify', 2, 'P1'),
      d('mediation-sensitive-register-shift', 'mediation-organize-simplify', 2, 'P1'),
    ],
  },
  {
    id: 'family-13-floor-management',
    family: 'floor-management',
    wave: 2,
    phase: 'P1',
    expected: 20,
    items: [
      g('floor-management-turn-balance', 'group discussion where quiet child receives turn token while eager speaker waits, no text', 'floor-management', 2, 'P1'),
      r('floor-start-conversation', 'a2-social-start-conversation', 'floor-management', 2, 'P1'),
      r('floor-continue-conversation', 'a2-social-continue-conversation', 'floor-management', 2, 'P1'),
      r('floor-close-conversation', 'a2-social-close-conversation', 'floor-management', 2, 'P1'),
      r('floor-repeat-clarify', 'a2-social-repeat-clarify-token', 'floor-management', 2, 'P1'),
      r('floor-follow-up-after-answer', 'b1-conversation-follow-up-after-answer', 'floor-management', 2, 'P1'),
      r('floor-add-detail', 'b1-conversation-add-detail-follow-up', 'floor-management', 2, 'P1'),
      r('floor-check-understanding', 'b1-conversation-check-understanding', 'floor-management', 2, 'P1'),
      ...filler('CODE_LATER', 9, 'floor-management', 2, 'P1'),
      d('floor-debate-moderation', 'floor-management', 2, 'P1'),
      d('floor-face-saving-interruption', 'floor-management', 2, 'P1'),
      d('floor-formal-meeting-procedure', 'floor-management', 2, 'P1'),
    ],
  },
  {
    id: 'family-14-audience-register',
    family: 'audience-register',
    wave: 3,
    phase: 'P2',
    expected: 22,
    items: [
      g('register-friendly-vs-careful-tone', 'same blank message card shown as friendly peer version and careful teacher version through posture/expression only, no words', 'audience-register', 3, 'P2'),
      r('register-audience-child', 'a2-write-audience-child-badge', 'audience-register', 3, 'P2'),
      r('register-purpose-badge', 'a2-write-purpose-badge', 'audience-register', 3, 'P2'),
      r('register-email-skin', 'a2-read-email-skin', 'audience-register', 3, 'P2'),
      r('register-chat-skin', 'a2-read-chat-skin', 'audience-register', 3, 'P2'),
      r('register-invitation-skin', 'a2-read-invitation-skin', 'audience-register', 3, 'P2'),
      r('register-notice-skin', 'a2-read-notice-skin', 'audience-register', 3, 'P2'),
      r('register-poster-skin', 'a2-read-poster-skin', 'audience-register', 3, 'P2'),
      ...filler('CODE_LATER', 11, 'audience-register', 3, 'P2'),
      d('register-irony', 'audience-register', 3, 'P2'),
      d('register-sarcasm', 'audience-register', 3, 'P2'),
      d('register-diplomatic-softening', 'audience-register', 3, 'P2'),
    ],
  },
  {
    id: 'family-15-writing-revision',
    family: 'writing-revision',
    wave: 3,
    phase: 'P2',
    expected: 24,
    items: [
      g('revision-reorder-for-main-point', 'picture idea cards reordered so main point comes first, no text', 'writing-revision', 3, 'P2'),
      g('revision-add-supporting-example', 'blank paragraph card gains one supporting example picture tile, no writing', 'writing-revision', 3, 'P2'),
      r('revision-move-token', 'a2-write-move-token', 'writing-revision', 3, 'P2'),
      r('revision-replace-token', 'a2-write-replace-token', 'writing-revision', 3, 'P2'),
      r('revision-expand-token', 'a2-write-expand-token', 'writing-revision', 3, 'P2'),
      r('revision-check-icon-set', 'a2-write-check-icon-set', 'writing-revision', 3, 'P2'),
      r('revision-idea-card', 'a2-write-idea-card', 'writing-revision', 3, 'P2'),
      r('revision-connector-tray', 'a2-write-connector-tray-visual', 'writing-revision', 3, 'P2'),
      r('revision-b1-clarify', 'b1-conversation-clarify-one-point', 'writing-revision', 3, 'P2'),
      ...filler('CODE_LATER', 13, 'writing-revision', 3, 'P2'),
      d('revision-long-essay-argument', 'writing-revision', 3, 'P2'),
      d('revision-rhetorical-style', 'writing-revision', 3, 'P2'),
    ],
  },
  {
    id: 'family-16-narrative-extension',
    family: 'narrative-extension',
    wave: 3,
    phase: 'P2',
    expected: 24,
    items: [
      g('narrative-choice-changes-ending', 'child choice at story fork clearly changes the ending scene, no text', 'narrative-extension', 3, 'P2'),
      g('narrative-two-constraints-one-resolution', 'story problem includes two visible familiar constraints and one practical resolution, no words', 'narrative-extension', 3, 'P2'),
      r('narrative-b1-one-complication', 'b1-complication-rain-starts,b1-complication-item-missing', 'narrative-extension', 3, 'P2'),
      r('narrative-problem-solved', 'b1-outcome-problem-solved', 'narrative-extension', 3, 'P2'),
      r('narrative-change-plan', 'b1-action-change-plan', 'narrative-extension', 3, 'P2'),
      r('narrative-backup-choice', 'b1-action-choose-backup', 'narrative-extension', 3, 'P2'),
      r('narrative-a2-begin', 'a2-story-begin-token', 'narrative-extension', 3, 'P2'),
      r('narrative-a2-continue', 'a2-story-continue-token', 'narrative-extension', 3, 'P2'),
      r('narrative-a2-end', 'a2-story-end-token', 'narrative-extension', 3, 'P2'),
      r('narrative-feeling-change', 'a2-story-feeling-change-token', 'narrative-extension', 3, 'P2'),
      ...filler('CODE_LATER', 10, 'narrative-extension', 3, 'P2'),
      d('narrative-ironic-ending', 'narrative-extension', 3, 'P2'),
      d('narrative-unreliable-narrator', 'narrative-extension', 3, 'P2'),
      d('narrative-symbolic-theme', 'narrative-extension', 3, 'P2'),
      d('narrative-long-literary-analysis', 'narrative-extension', 3, 'P2'),
    ],
  },
  {
    id: 'family-17-grammar-semantic-relations',
    family: 'grammar-semantic-relations',
    wave: 3,
    phase: 'P2',
    expected: 23,
    items: [
      g('grammar-actual-vs-possible-result', 'actual result tile beside possible result bubble in a familiar school plan, no grammar chart or words', 'grammar-semantic-relations', 3, 'P2'),
      r('grammar-before-after', 'a2-state-before-clean-table,a2-state-after-finished-craft', 'grammar-semantic-relations', 3, 'P2'),
      r('grammar-change-arrow', 'a2-state-change-arrow', 'grammar-semantic-relations', 3, 'P2'),
      r('grammar-condition-result', 'b1-grammar-condition-result', 'grammar-semantic-relations', 3, 'P2'),
      r('grammar-background-main-event', 'b1-grammar-background-main-event', 'grammar-semantic-relations', 3, 'P2'),
      r('grammar-plan-changed', 'b1-grammar-plan-changed', 'grammar-semantic-relations', 3, 'P2'),
      r('grammar-relayed-message', 'b1-grammar-speaker-relayed-message', 'grammar-semantic-relations', 3, 'P2'),
      r('grammar-self-repair', 'b1-self-repair-swap-card', 'grammar-semantic-relations', 3, 'P2'),
      r('grammar-prediction-check', 'b1-viewpoint-predict-outcome-check', 'grammar-semantic-relations', 3, 'P2'),
      ...filler('CODE_LATER', 12, 'grammar-semantic-relations', 3, 'P2'),
      d('grammar-mixed-conditionals', 'grammar-semantic-relations', 3, 'P2'),
      d('grammar-modal-nuance-diplomacy', 'grammar-semantic-relations', 3, 'P2'),
    ],
  },
  {
    id: 'family-18-sophisticated-argument-rhetoric',
    family: 'sophisticated-argument-rhetoric',
    wave: 3,
    phase: 'P2',
    expected: 16,
    items: [
      r('rhetoric-basic-viewpoint', 'b1-viewpoint-two-familiar-perspectives', 'sophisticated-argument-rhetoric', 3, 'P2'),
      r('rhetoric-basic-reason', 'b1-viewpoint-opinion-reason-outcome', 'sophisticated-argument-rhetoric', 3, 'P2'),
      r('rhetoric-basic-source-fact', 'b1-info-source-to-key-facts-to-recipient', 'sophisticated-argument-rhetoric', 3, 'P2'),
      ...filler('CODE_LATER', 4, 'sophisticated-argument-rhetoric', 3, 'P2'),
      d('rhetoric-rebuttal-chain', 'sophisticated-argument-rhetoric', 3, 'P2'),
      d('rhetoric-concession-refutation', 'sophisticated-argument-rhetoric', 3, 'P2'),
      d('rhetoric-irony-bias', 'sophisticated-argument-rhetoric', 3, 'P2'),
      d('rhetoric-academic-research-synthesis', 'sophisticated-argument-rhetoric', 3, 'P2'),
      d('rhetoric-persuasive-appeals', 'sophisticated-argument-rhetoric', 3, 'P2'),
      d('rhetoric-policy-debate', 'sophisticated-argument-rhetoric', 3, 'P2'),
      d('rhetoric-high-stakes-negotiation', 'sophisticated-argument-rhetoric', 3, 'P2'),
      d('rhetoric-long-form-essay-logic', 'sophisticated-argument-rhetoric', 3, 'P2'),
      d('rhetoric-diplomatic-subtext', 'sophisticated-argument-rhetoric', 3, 'P2'),
    ],
  },
];

export const PROPOSALS = FAMILY_PROPOSALS.flatMap((family) => family.items);
export const GENERATE = PROPOSALS.filter((p) => p.classification === 'GENERATE');
export const REUSE_EXISTING = PROPOSALS.filter((p) => p.classification === 'REUSE_EXISTING');
export const CODE_LATER = PROPOSALS.filter((p) => p.classification === 'CODE_LATER');
export const DEFER_C1 = PROPOSALS.filter((p) => p.classification === 'DEFER_C1');

export const WAVES = {
  1: {
    id: 'wave-1-p0-core',
    phase: 'P0',
    family: 'argument-tradeoff-perspective-source-hierarchy-constraint',
    title: 'B2 Wave 1 P0 core relation architecture',
    style: STYLE,
    familyIds: [
      'family-1-argument-architecture',
      'family-2-trade-offs',
      'family-3-multi-perspective',
      'family-4-two-source-synthesis',
      'family-5-idea-hierarchy',
      'family-6-multi-constraint',
    ],
  },
  2: {
    id: 'wave-2-p1-interaction-stance',
    phase: 'P1',
    family: 'counterproposal-risk-stance-listening-presentation-mediation-floor',
    title: 'B2 Wave 2 P1 interaction stance and mediation',
    style: STYLE,
    familyIds: [
      'family-7-negotiation-counterproposal',
      'family-8-hypothetical-risk',
      'family-9-reading-stance-purpose',
      'family-10-multi-speaker-listening',
      'family-11-presentation-audience',
      'family-12-mediation-organize-simplify',
      'family-13-floor-management',
    ],
  },
  3: {
    id: 'wave-3-p2-conservative-finish',
    phase: 'P2',
    family: 'register-revision-narrative-grammar',
    title: 'B2 Wave 3 P2 conservative finish',
    style: STYLE,
    familyIds: [
      'family-14-audience-register',
      'family-15-writing-revision',
      'family-16-narrative-extension',
      'family-17-grammar-semantic-relations',
      'family-18-sophisticated-argument-rhetoric',
    ],
  },
};

export function resolveWave(raw) {
  const wave = WAVES[Number(raw)];
  if (!wave) throw new Error('Need --wave=1..3');
  return wave;
}

export function classificationCounts() {
  return {
    proposals_reviewed: PROPOSALS.length,
    generate: GENERATE.length,
    reuse_existing: REUSE_EXISTING.length,
    code_later: CODE_LATER.length,
    defer_c1: DEFER_C1.length,
    hold: 0,
  };
}

export function conceptCount(wave) {
  const ids = new Set(wave.familyIds);
  return GENERATE.filter((p) => ids.has(FAMILY_PROPOSALS.find((f) => f.family === p.family)?.id)).length;
}

export function sheetsFor(wave) {
  const ids = new Set(wave.familyIds);
  const cells = GENERATE.filter((p) => ids.has(FAMILY_PROPOSALS.find((f) => f.family === p.family)?.id));
  const sheets = [];
  for (let i = 0; i < cells.length; i += 9) {
    const n = sheets.length + 1;
    const chunk = cells.slice(i, i + 9);
    sheets.push({
      id: `S${n}`,
      title: `${wave.title} sheet ${n}`,
      format: 'black-contact-3x3',
      cells: chunk,
    });
  }
  return sheets;
}

export function filterSafety(cells) {
  const kept = [];
  const skipped = [];
  for (const cell of cells) {
    const hay = [cell.key, cell.concept, cell.brief].join(' ').toLowerCase();
    const hit = [...SAFETY_SKIP_KEYS].find((deny) => hay.includes(deny));
    if (hit) skipped.push({ key: cell.key, concept: cell.concept, reason: `manus-safety:${hit}` });
    else kept.push(cell);
  }
  return { kept, skipped };
}

function byFamilyCounts() {
  const out = {};
  for (const family of FAMILY_PROPOSALS) {
    out[family.family] = {
      GENERATE: family.items.filter((p) => p.classification === 'GENERATE').length,
      REUSE_EXISTING: family.items.filter((p) => p.classification === 'REUSE_EXISTING').length,
      CODE_LATER: family.items.filter((p) => p.classification === 'CODE_LATER').length,
      DEFER_C1: family.items.filter((p) => p.classification === 'DEFER_C1').length,
    };
  }
  return out;
}

function assertLedger() {
  for (const family of FAMILY_PROPOSALS) {
    if (family.items.length !== family.expected) {
      throw new Error(`${family.family} expected ${family.expected}, got ${family.items.length}`);
    }
  }
  if (PROPOSALS.length !== 413) {
    throw new Error(`B2 proposal ledger must reconcile to 413, got ${PROPOSALS.length}`);
  }
  const seen = new Set();
  for (const p of PROPOSALS) {
    if (seen.has(p.key)) throw new Error(`Duplicate B2 proposal key: ${p.key}`);
    seen.add(p.key);
    if (!['GENERATE', 'REUSE_EXISTING', 'CODE_LATER', 'DEFER_C1'].includes(p.classification)) {
      throw new Error(`Invalid classification for ${p.key}: ${p.classification}`);
    }
  }
}

export function writeLedgers(root = ROOT) {
  assertLedger();
  const now = new Date().toISOString();
  const spec = {
    spec: 'b2-final-vertical-cultivation-classification',
    updated_at: now,
    source: 'B2 final vertical cultivation prompt plus existing Pre-A1/A1/A2/B1 ledgers and live bank reuse scan.',
    product_ceiling: true,
    future_only: ['C1', 'C2'],
    no_wiring: true,
    total_proposals_reviewed: PROPOSALS.length,
    counts: classificationCounts(),
    by_family: byFamilyCounts(),
    durable_root: STOCKPILE_REL,
    tracked_inventory: TRACKED_INV_REL,
    code_later: CODE_LATER_REL,
    level_model: 'A2 links; B1 structures and adapts; B2 shapes, weighs, and answers back.',
    routing: {
      generate: 'Genuinely missing pictorial B2 relations in young-learner school/club/sport/trip contexts.',
      reuse_existing: 'Existing semantic assets already communicate the relation; folder/name match is not required.',
      code_later: 'Boxes, grids, rails, tables, arrows, paragraph/sentence containers, labels, dynamic text, writing, scores, Venn regions, highlights, and layouts.',
      defer_c1: 'Sophisticated argument/rhetoric, rebuttal chains, irony/bias, academic research, 3+ complex sources, diplomacy, high-stakes negotiation, long essays, mixed conditionals, abstract policy.',
    },
    proposals: PROPOSALS,
  };
  const codeLater = {
    spec: 'b2-code-later-structural-inventory',
    updated_at: now,
    note: 'Structural UI deferred intentionally: generated by renderer later, not sent to Manus.',
    count: CODE_LATER.length,
    items: CODE_LATER,
  };
  const specPath = path.join(root, TRACKED_SPEC_REL);
  const codePath = path.join(root, CODE_LATER_REL);
  fs.mkdirSync(path.dirname(specPath), { recursive: true });
  fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));
  fs.writeFileSync(codePath, JSON.stringify(codeLater, null, 2));
  return { specPath, codePath, spec, codeLater };
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly && process.argv.includes('--write-ledgers')) {
  const written = writeLedgers(ROOT);
  console.log(
    JSON.stringify(
      {
        phase: 'b2-ledgers-written',
        counts: classificationCounts(),
        spec: path.relative(ROOT, written.specPath),
        code_later: path.relative(ROOT, written.codePath),
        generate_by_wave: Object.fromEntries(Object.entries(WAVES).map(([k, w]) => [k, conceptCount(w)])),
      },
      null,
      2,
    ),
  );
}
