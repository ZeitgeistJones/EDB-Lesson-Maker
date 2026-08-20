/**
 * B1 visual operating-system stockpile keys.
 *
 * B1 is connected familiar meaning: brief explanation, one concrete
 * complication, 2-3 options, a chosen adaptation/follow-up, and a simple
 * outcome. Stockpile only; no renderer wiring here.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const MANUS_SAFETY_DENY = new Set([
  'rape',
  'massacre',
  'murder',
  'suicide',
  'torture',
  'missile',
  'bomb',
  'gun',
]);

export const SAFETY_SKIP_KEYS = MANUS_SAFETY_DENY;
export const STOCKPILE_REL = 'harvested/manus-b1-stockpile';
export const TRACKED_INV_REL = 'docs/b1-stockpile-inventory.json';
export const TRACKED_SPEC_REL = 'docs/b1-stockpile-spec.json';
export const CODE_LATER_REL = 'docs/b1-code-later.json';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const STYLE = `STYLE LOCK: child-friendly ClassIn ESL board art, clean sparse vector/soft-matte educational illustration, familiar school/friends/games/trips/weather contexts, no logos, no watermarks, no fake UI text.
TEXT LOCK: BLANK / text-free only. Do NOT bake English connector words, labels, letters, numbers, prices, times, dates, source names, paragraph text, opinion/reason text, checklist text, or pretend handwriting into the art.
BLACK CONTACT LOCK: every contact sheet must be pure #000000 black edge-to-edge. Do not use white worksheet/page backgrounds. Empty cells stay pure black. Art may contain white cards/bubbles, but the cell/background behind each object remains black.
LABEL BAN: do not write helper words such as source, fact, clue, answer, main point, outcome, plan, update, preference, reason, or any other English word inside the image.
B1 FIREWALL: connected familiar meaning + brief explanation + ONE concrete complication + adapt/follow-up + simple outcome. One problem at a time only: notice -> why it matters -> 2-3 options -> choose -> outcome.
A2 REUSE LOCK: A2 already covers connectors, sequence markers, simple cause/contrast, paired states, information gap, simple conversation repair, route/status, procedure, and short narrative relation tokens. Do not duplicate those under B1 names.
B2 FIREWALL: no debate, persuasion, rebuttal, source credibility, academic synthesis, negotiation, abstract societal issues, multi-layer contingency, long essays, irony, tone, bias, or evidence weighting.
DELIVERY: PNG sheets. Use black-field contact sheets with one item per cell and clear gutters. quality: default only.`;

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function g(key, brief, family, wave, phase, note = '') {
  return { key: `b1-${key}`, concept: key, brief, family, wave, phase, classification: 'GENERATE', note };
}

function r(key, existing, family, wave, phase, reason = 'Existing A2/lower-level asset already communicates this relation.') {
  return { key: `b1-${key}`, concept: key, family, wave, phase, classification: 'REUSE_EXISTING', existing, reason };
}

function c(key, family, wave, phase, reason = 'Structural rectangles/rails/cards/text fields should be code-rendered later, not illustrated.') {
  return { key: `b1-${key}`, concept: key, family, wave, phase, classification: 'CODE_LATER', reason };
}

function b2(key, family, wave, phase, reason = 'This requires B2-level reasoning, negotiation, stance, source credibility, or abstract synthesis.') {
  return { key: `b1-${key}`, concept: key, family, wave, phase, classification: 'DEFER_B2', reason };
}

function filler(kind, count, family, wave, phase, start = 1) {
  const out = [];
  for (let i = start; i < start + count; i += 1) {
    const n = String(i).padStart(2, '0');
    if (kind === 'CODE_LATER') out.push(c(`${slug(family)}-structural-ui-${n}`, family, wave, phase));
    if (kind === 'REUSE_EXISTING') out.push(r(`${slug(family)}-reuse-a2-${n}`, 'a2-visual-operating-system', family, wave, phase));
    if (kind === 'DEFER_B2') out.push(b2(`${slug(family)}-defer-b2-${n}`, family, wave, phase));
  }
  return out;
}

export const FAMILY_PROPOSALS = [
  {
    id: 'family-1-connected-discourse',
    family: 'connected-discourse',
    wave: 1,
    phase: 'P0',
    expected: 30,
    items: [
      g('discourse-topic-detail-example', 'topic card opens into one concrete detail card and one example picture card, no text', 'connected-discourse', 1, 'P0'),
      g('discourse-main-point-supporting-detail', 'large simple idea tile connected to two smaller supporting picture tiles, no labels', 'connected-discourse', 1, 'P0'),
      g('discourse-brief-explanation-lightbulb', 'child gives a short explanation shown as one lightbulb linked to a familiar object, no speech text', 'connected-discourse', 1, 'P0'),
      g('discourse-example-to-general-idea', 'specific example picture gently lifts into a broader idea cloud, no words', 'connected-discourse', 1, 'P0'),
      r('discourse-add-link', 'a2-conn-and-link-chain', 'connected-discourse', 1, 'P0'),
      r('discourse-contrast-link', 'a2-conn-but-contrast-split', 'connected-discourse', 1, 'P0'),
      r('discourse-cause-link', 'a2-conn-because-cause-spark', 'connected-discourse', 1, 'P0'),
      r('discourse-sequence-link', 'a2-conn-sequence-bridge-3', 'connected-discourse', 1, 'P0'),
      r('discourse-start-middle-end', 'a2-story-begin-token,a2-story-continue-token,a2-story-end-token', 'connected-discourse', 1, 'P0'),
      ...filler('CODE_LATER', 16, 'connected-discourse', 1, 'P0'),
      b2('discourse-abstract-theme-map', 'connected-discourse', 1, 'P0'),
      b2('discourse-counterpoint-link', 'connected-discourse', 1, 'P0'),
      b2('discourse-register-tone-map', 'connected-discourse', 1, 'P0'),
      b2('discourse-long-paragraph-plan', 'connected-discourse', 1, 'P0'),
      b2('discourse-source-synthesis-web', 'connected-discourse', 1, 'P0'),
    ],
  },
  {
    id: 'family-2-reason-cause-evidence-lite',
    family: 'reason-cause-evidence-lite',
    wave: 1,
    phase: 'P0',
    expected: 30,
    items: [
      g('reason-why-it-matters-ripple', 'one small problem picture creates a clear effect ripple on a familiar activity, no text', 'reason-cause-evidence-lite', 1, 'P0'),
      g('reason-observation-to-choice', 'child notices one visible clue, then points to a practical choice card, no words', 'reason-cause-evidence-lite', 1, 'P0'),
      g('reason-example-supports-answer', 'one example picture card props up a simple answer tile, no labels', 'reason-cause-evidence-lite', 1, 'P0'),
      g('reason-cause-effect-familiar-scene', 'rain cloud causes picnic blanket to move under shelter, one concrete cause only, no text', 'reason-cause-evidence-lite', 1, 'P0'),
      r('reason-because-token', 'a2-conn-because-cause-spark', 'reason-cause-evidence-lite', 1, 'P0'),
      r('reason-cause-domino', 'a2-conn-cause-domino-pair', 'reason-cause-evidence-lite', 1, 'P0'),
      r('reason-attribute-pin', 'a2-comp-attribute-evidence-pin', 'reason-cause-evidence-lite', 1, 'P0'),
      r('reason-one-reason-dot', 'a2-comp-one-reason-because-dot', 'reason-cause-evidence-lite', 1, 'P0'),
      r('reason-detail-pin', 'a2-evidence-action-pin', 'reason-cause-evidence-lite', 1, 'P0'),
      ...filler('CODE_LATER', 15, 'reason-cause-evidence-lite', 1, 'P0'),
      b2('reason-source-credibility-scale', 'reason-cause-evidence-lite', 1, 'P0'),
      b2('reason-evidence-weighting-balance', 'reason-cause-evidence-lite', 1, 'P0'),
      b2('reason-rebuttal-token', 'reason-cause-evidence-lite', 1, 'P0'),
      b2('reason-counterclaim-web', 'reason-cause-evidence-lite', 1, 'P0'),
      b2('reason-academic-citation-card', 'reason-cause-evidence-lite', 1, 'P0'),
      b2('reason-bias-warning-map', 'reason-cause-evidence-lite', 1, 'P0'),
    ],
  },
  {
    id: 'family-3-narrative-reaction-complication',
    family: 'narrative-reaction-complication',
    wave: 2,
    phase: 'P0',
    expected: 45,
    items: [
      g('complication-rain-starts', 'single rain cloud appears over school trip plan, one concrete complication only, no text', 'narrative-reaction-complication', 2, 'P0'),
      g('complication-place-closed', 'friendly closed gate/door at park or club with no readable sign, one problem only', 'narrative-reaction-complication', 2, 'P0'),
      g('complication-item-missing', 'child checks bag and one needed item is missing, no labels', 'narrative-reaction-complication', 2, 'P0'),
      g('complication-short-delay', 'bus or activity paused beside simple clock cue, no numbers or words', 'narrative-reaction-complication', 2, 'P0'),
      g('complication-path-blocked', 'safe fallen branch blocks a simple walking path, no danger and no extra problems', 'narrative-reaction-complication', 2, 'P0'),
      g('complication-item-unavailable', 'empty shelf spot where wanted snack/toy should be, no text', 'narrative-reaction-complication', 2, 'P0'),
      g('reaction-notice-problem', 'child notices one problem with calm surprised face and pointing gesture, no speech text', 'narrative-reaction-complication', 2, 'P0'),
      g('reaction-worried-to-ready', 'child shifts from worried to ready-to-act in two small paired bubbles, no text', 'narrative-reaction-complication', 2, 'P0'),
      g('action-ask-help', 'child politely asks teacher/friend for help using blank speech bubble, no words', 'narrative-reaction-complication', 2, 'P0'),
      g('action-change-plan', 'child moves star pin from one simple plan card to another, no labels', 'narrative-reaction-complication', 2, 'P0'),
      g('action-try-again', 'child tries the same simple task again with loop cue, no word', 'narrative-reaction-complication', 2, 'P0'),
      g('action-choose-backup', 'child chooses backup object/activity from two options, no letters', 'narrative-reaction-complication', 2, 'P0'),
      g('outcome-problem-solved', 'single complication clears and activity continues happily, no text', 'narrative-reaction-complication', 2, 'P0'),
      g('outcome-plan-restored', 'changed plan works; child reaches simple goal with calm celebration, no text', 'narrative-reaction-complication', 2, 'P0'),
      r('narrative-begin', 'a2-story-begin-token', 'narrative-reaction-complication', 2, 'P0'),
      r('narrative-continue', 'a2-story-continue-token', 'narrative-reaction-complication', 2, 'P0'),
      r('narrative-end', 'a2-story-end-token', 'narrative-reaction-complication', 2, 'P0'),
      r('narrative-simple-problem', 'a2-story-simple-problem-token', 'narrative-reaction-complication', 2, 'P0'),
      r('narrative-response', 'a2-story-response-token', 'narrative-reaction-complication', 2, 'P0'),
      r('narrative-outcome', 'a2-story-outcome-token', 'narrative-reaction-complication', 2, 'P0'),
      r('narrative-feeling-change', 'a2-story-feeling-change-token', 'narrative-reaction-complication', 2, 'P0'),
      r('narrative-delayed', 'a2-travel-delayed-token', 'narrative-reaction-complication', 2, 'P0'),
      r('narrative-unavailable', 'a2-trans-unavailable-token', 'narrative-reaction-complication', 2, 'P0'),
      r('narrative-clash', 'a2-plan-clash-token', 'narrative-reaction-complication', 2, 'P0'),
      ...filler('CODE_LATER', 14, 'narrative-reaction-complication', 2, 'P0'),
      c('narrative-one-complication-frame-grid', 'narrative-reaction-complication', 2, 'P0', 'Narrative frame grids are structural UI; the art bank only needs pictorial complication/action/outcome pieces.'),
      b2('narrative-two-complication-chain', 'narrative-reaction-complication', 2, 'P0'),
      b2('narrative-blame-and-compensation', 'narrative-reaction-complication', 2, 'P0'),
      b2('narrative-ironic-ending', 'narrative-reaction-complication', 2, 'P0'),
      b2('narrative-mixed-motives', 'narrative-reaction-complication', 2, 'P0'),
      b2('narrative-social-conflict-arc', 'narrative-reaction-complication', 2, 'P0'),
      b2('narrative-long-essay-retell', 'narrative-reaction-complication', 2, 'P0'),
    ],
  },
  {
    id: 'family-4-problem-solution',
    family: 'problem-solution',
    wave: 1,
    phase: 'P0',
    expected: 30,
    items: [
      g('problem-notice-matters-options-choice-outcome', 'five tiny picture beads show notice, impact, options, chosen action, simple outcome; no text', 'problem-solution', 1, 'P0'),
      g('problem-options-two-paths', 'one familiar problem splits into two practical option paths, no labels', 'problem-solution', 1, 'P0'),
      g('problem-chosen-option-star', 'star marker selects one option card and leads to calm outcome tile, no text', 'problem-solution', 1, 'P0'),
      g('problem-impact-on-activity', 'single blocked/missing item clearly affects a game or class activity, no extra problems', 'problem-solution', 1, 'P0'),
      r('problem-simple-problem-token', 'a2-story-simple-problem-token', 'problem-solution', 1, 'P0'),
      r('problem-response-token', 'a2-story-response-token', 'problem-solution', 1, 'P0'),
      r('problem-outcome-token', 'a2-story-outcome-token', 'problem-solution', 1, 'P0'),
      r('problem-missing-step', 'a2-proc-missing-step-token', 'problem-solution', 1, 'P0'),
      r('problem-wrong-step', 'a2-proc-wrong-step-token', 'problem-solution', 1, 'P0'),
      r('problem-retry', 'a2-proc-retry-token', 'problem-solution', 1, 'P0'),
      r('problem-mistake-fix', 'a2-trans-mistake-fix-token', 'problem-solution', 1, 'P0'),
      ...filler('CODE_LATER', 14, 'problem-solution', 1, 'P0'),
      b2('problem-negotiated-compromise', 'problem-solution', 1, 'P0'),
      b2('problem-refund-compensation', 'problem-solution', 1, 'P0'),
      b2('problem-policy-exception', 'problem-solution', 1, 'P0'),
      b2('problem-multi-step-contingency', 'problem-solution', 1, 'P0'),
      b2('problem-formal-complaint', 'problem-solution', 1, 'P0'),
    ],
  },
  {
    id: 'family-5-compare-choose-justify',
    family: 'compare-choose-justify',
    wave: 1,
    phase: 'P0',
    expected: 30,
    items: [
      g('choose-three-practical-options', 'three familiar activity/item option cards with one selected by a star, no labels', 'compare-choose-justify', 1, 'P0'),
      g('choose-criteria-comfort-weather-cost', 'three simple criteria icons shown as weather, comfort, and token count without numbers or words', 'compare-choose-justify', 1, 'P0'),
      g('choose-reason-links-to-option', 'selected option links to one visible reason clue and outcome tile, no text', 'compare-choose-justify', 1, 'P0'),
      r('compare-bigger-smaller', 'a2-comp-bigger-smaller', 'compare-choose-justify', 1, 'P0'),
      r('compare-faster-slower', 'a2-comp-faster-slower', 'compare-choose-justify', 1, 'P0'),
      r('compare-equal-balance', 'a2-comp-equal-balance', 'compare-choose-justify', 1, 'P0'),
      r('compare-preference-heart-choice', 'a2-comp-preference-heart-choice', 'compare-choose-justify', 1, 'P0'),
      r('compare-evidence-pin', 'a2-comp-attribute-evidence-pin', 'compare-choose-justify', 1, 'P0'),
      ...filler('CODE_LATER', 17, 'compare-choose-justify', 1, 'P0'),
      b2('compare-debate-pro-con', 'compare-choose-justify', 1, 'P0'),
      b2('compare-weighted-decision-matrix', 'compare-choose-justify', 1, 'P0'),
      b2('compare-tradeoff-negotiation', 'compare-choose-justify', 1, 'P0'),
      b2('compare-persuasive-ranking', 'compare-choose-justify', 1, 'P0'),
      b2('compare-abstract-values-choice', 'compare-choose-justify', 1, 'P0'),
    ],
  },
  {
    id: 'family-6-conversation-expansion-follow-up-clarification',
    family: 'conversation-expansion-follow-up-clarification',
    wave: 1,
    phase: 'P0',
    expected: 41,
    items: [
      g('conversation-add-detail-follow-up', 'listener asks for one more detail using blank bubble and small detail card, no words', 'conversation-expansion-follow-up-clarification', 1, 'P0'),
      g('conversation-clarify-one-point', 'speaker points to one unclear picture card and clarifies with a second clean card, no text', 'conversation-expansion-follow-up-clarification', 1, 'P0'),
      g('conversation-follow-up-after-answer', 'question bubble leads to answer bubble then one small follow-up bubble, no text', 'conversation-expansion-follow-up-clarification', 1, 'P0'),
      g('conversation-check-understanding', 'two children compare same picture card with gentle check glow, no words', 'conversation-expansion-follow-up-clarification', 1, 'P0'),
      r('conversation-start', 'a2-social-start-conversation', 'conversation-expansion-follow-up-clarification', 1, 'P0'),
      r('conversation-continue', 'a2-social-continue-conversation', 'conversation-expansion-follow-up-clarification', 1, 'P0'),
      r('conversation-close', 'a2-social-close-conversation', 'conversation-expansion-follow-up-clarification', 1, 'P0'),
      r('conversation-repeat-clarify', 'a2-social-repeat-clarify-token', 'conversation-expansion-follow-up-clarification', 1, 'P0'),
      r('conversation-repeat', 'a1-conv-repeat-token', 'conversation-expansion-follow-up-clarification', 1, 'P0'),
      r('conversation-slow', 'a1-conv-slow-token', 'conversation-expansion-follow-up-clarification', 1, 'P0'),
      r('conversation-again', 'a1-conv-again-token', 'conversation-expansion-follow-up-clarification', 1, 'P0'),
      r('conversation-listen', 'a1-conv-listen-token', 'conversation-expansion-follow-up-clarification', 1, 'P0'),
      r('conversation-say', 'a1-conv-say-token', 'conversation-expansion-follow-up-clarification', 1, 'P0'),
      ...filler('CODE_LATER', 20, 'conversation-expansion-follow-up-clarification', 1, 'P0'),
      b2('conversation-diplomatic-disagreement', 'conversation-expansion-follow-up-clarification', 1, 'P0'),
      b2('conversation-persuasive-follow-up', 'conversation-expansion-follow-up-clarification', 1, 'P0'),
      b2('conversation-negotiation-turns', 'conversation-expansion-follow-up-clarification', 1, 'P0'),
      b2('conversation-face-saving-repair', 'conversation-expansion-follow-up-clarification', 1, 'P0'),
      b2('conversation-debate-turn-token', 'conversation-expansion-follow-up-clarification', 1, 'P0'),
      b2('conversation-complaint-resolution', 'conversation-expansion-follow-up-clarification', 1, 'P0'),
      b2('conversation-subtext-tone', 'conversation-expansion-follow-up-clarification', 1, 'P0'),
      b2('conversation-extended-interview', 'conversation-expansion-follow-up-clarification', 1, 'P0'),
    ],
  },
  {
    id: 'family-7-source-key-facts-recipient',
    family: 'source-key-facts-recipient',
    wave: 3,
    phase: 'P1',
    expected: 25,
    items: [
      g('info-source-to-key-facts-to-recipient', 'notice/chat/schedule source sends two key fact cards to a child recipient, no readable text', 'source-key-facts-recipient', 3, 'P1'),
      g('info-practical-relay-chain', 'child receives one update card and passes it to friend/teacher, no speech text', 'source-key-facts-recipient', 3, 'P1'),
      g('info-two-key-facts-bundle', 'two concrete fact pins bundled from one source card, no labels', 'source-key-facts-recipient', 3, 'P1'),
      g('info-update-changes-plan', 'source update card moves star pin on a simple plan card, no text', 'source-key-facts-recipient', 3, 'P1'),
      r('info-known-card', 'a2-info-known-lit-card', 'source-key-facts-recipient', 3, 'P1'),
      r('info-hidden-pocket', 'a2-info-hidden-fact-pocket', 'source-key-facts-recipient', 3, 'P1'),
      r('info-dossier-complete', 'a2-info-dossier-complete', 'source-key-facts-recipient', 3, 'P1'),
      r('info-reading-notice-skin', 'a2-read-notice-skin', 'source-key-facts-recipient', 3, 'P1'),
      r('info-reading-chat-skin', 'a2-read-chat-skin', 'source-key-facts-recipient', 3, 'P1'),
      ...filler('CODE_LATER', 11, 'source-key-facts-recipient', 3, 'P1'),
      b2('info-source-credibility-check', 'source-key-facts-recipient', 3, 'P1'),
      b2('info-research-dashboard', 'source-key-facts-recipient', 3, 'P1'),
      b2('info-three-source-synthesis', 'source-key-facts-recipient', 3, 'P1'),
      b2('info-conflicting-source-resolution', 'source-key-facts-recipient', 3, 'P1'),
      b2('info-citation-map', 'source-key-facts-recipient', 3, 'P1'),
    ],
  },
  {
    id: 'family-8-reading-listening-discourse-tracking',
    family: 'reading-listening-discourse-tracking',
    wave: 3,
    phase: 'P1',
    expected: 24,
    items: [
      g('track-main-point-support-local-clue', 'large main picture card with two supporting clues and one small local clue, no words', 'reading-listening-discourse-tracking', 3, 'P1'),
      g('track-local-inference-clue-to-answer', 'visible clue on scene points to a simple answer card, no text', 'reading-listening-discourse-tracking', 3, 'P1'),
      g('track-supporting-detail-pin-cluster', 'two or three detail pins attach to one main point card, no labels', 'reading-listening-discourse-tracking', 3, 'P1'),
      r('track-heard-detail-pin', 'a2-listen-heard-detail-pin', 'reading-listening-discourse-tracking', 3, 'P1'),
      r('track-missing-detail-pin', 'a2-listen-missing-detail-pin', 'reading-listening-discourse-tracking', 3, 'P1'),
      r('track-verify-token', 'a2-listen-verify-token', 'reading-listening-discourse-tracking', 3, 'P1'),
      r('track-detail-bundle', 'a2-listen-detail-bundle', 'reading-listening-discourse-tracking', 3, 'P1'),
      r('track-article-skin', 'a2-read-article-skin', 'reading-listening-discourse-tracking', 3, 'P1'),
      ...filler('CODE_LATER', 12, 'reading-listening-discourse-tracking', 3, 'P1'),
      b2('track-implied-attitude-map', 'reading-listening-discourse-tracking', 3, 'P1'),
      b2('track-irony-detection', 'reading-listening-discourse-tracking', 3, 'P1'),
      b2('track-bias-map', 'reading-listening-discourse-tracking', 3, 'P1'),
      b2('track-author-purpose-analysis', 'reading-listening-discourse-tracking', 3, 'P1'),
    ],
  },
  {
    id: 'family-9-viewpoint-prediction-outcome',
    family: 'viewpoint-prediction-outcome',
    wave: 3,
    phase: 'P1',
    expected: 25,
    items: [
      g('viewpoint-predict-outcome-check', 'child makes simple prediction bubble, later outcome card checks it, no text', 'viewpoint-prediction-outcome', 3, 'P1'),
      g('viewpoint-opinion-reason-outcome', 'child opinion heart links to one reason picture and simple outcome tile, no words', 'viewpoint-prediction-outcome', 3, 'P1'),
      g('viewpoint-two-familiar-perspectives', 'two children look at same object/activity with different simple preference bubbles, no text', 'viewpoint-prediction-outcome', 3, 'P1'),
      g('viewpoint-prediction-changed-by-new-fact', 'new fact card gently changes a prediction bubble, no writing', 'viewpoint-prediction-outcome', 3, 'P1'),
      r('viewpoint-preference-heart', 'a2-comp-preference-heart-choice', 'viewpoint-prediction-outcome', 3, 'P1'),
      r('viewpoint-reason-dot', 'a2-comp-one-reason-because-dot', 'viewpoint-prediction-outcome', 3, 'P1'),
      r('viewpoint-outcome', 'a2-story-outcome-token', 'viewpoint-prediction-outcome', 3, 'P1'),
      r('viewpoint-maybe', 'a2-plan-maybe-token', 'viewpoint-prediction-outcome', 3, 'P1'),
      ...filler('CODE_LATER', 12, 'viewpoint-prediction-outcome', 3, 'P1'),
      b2('viewpoint-persuasive-stance', 'viewpoint-prediction-outcome', 3, 'P1'),
      b2('viewpoint-counterfactual-outcome', 'viewpoint-prediction-outcome', 3, 'P1'),
      b2('viewpoint-rebuttal-chain', 'viewpoint-prediction-outcome', 3, 'P1'),
      b2('viewpoint-social-issue-position', 'viewpoint-prediction-outcome', 3, 'P1'),
      b2('viewpoint-hypothesis-test', 'viewpoint-prediction-outcome', 3, 'P1'),
    ],
  },
  {
    id: 'family-10-semantic-grammar-overlays',
    family: 'semantic-grammar-overlays',
    wave: 4,
    phase: 'P2',
    expected: 11,
    items: [
      g('grammar-background-event-overlay', 'faded background activity with one foreground event card, no tense labels', 'semantic-grammar-overlays', 4, 'P2'),
      g('grammar-experience-now-bridge', 'memory bubble connects to present skill/result card, no text', 'semantic-grammar-overlays', 4, 'P2'),
      g('grammar-condition-result-path', 'simple if-condition picture gate leads to one result tile, no words', 'semantic-grammar-overlays', 4, 'P2'),
      g('grammar-plan-changed-overlay', 'planned route/card gently shifts to changed route/card, no labels', 'semantic-grammar-overlays', 4, 'P2'),
      g('grammar-speaker-relayed-message', 'child speaker bubble passes blank message card to another child, no text', 'semantic-grammar-overlays', 4, 'P2'),
      r('grammar-past-memory', 'a2-state-past-memory-bubble', 'semantic-grammar-overlays', 4, 'P2'),
      r('grammar-now-spotlight', 'a2-state-now-spotlight', 'semantic-grammar-overlays', 4, 'P2'),
      r('grammar-change-arrow', 'a2-state-change-arrow', 'semantic-grammar-overlays', 4, 'P2'),
      c('grammar-tense-chart', 'semantic-grammar-overlays', 4, 'P2', 'Tense charts and labels are structural/text UI.'),
      c('grammar-rule-boxes', 'semantic-grammar-overlays', 4, 'P2', 'Rule boxes are text fields and should be rendered later.'),
      b2('grammar-mixed-conditionals', 'semantic-grammar-overlays', 4, 'P2'),
    ],
  },
  {
    id: 'family-11-longer-turn-self-repair',
    family: 'longer-turn-self-repair',
    wave: 4,
    phase: 'P2',
    expected: 10,
    items: [
      g('turn-thought-group-beads', 'three small idea beads grouped into one speaking turn, no words', 'longer-turn-self-repair', 4, 'P2'),
      g('turn-pause-and-continue', 'child pauses with calm bead then continues to next idea card, no text', 'longer-turn-self-repair', 4, 'P2'),
      g('turn-self-correction-swap', 'speaker swaps one mistaken picture card for a better one mid-turn, no labels', 'longer-turn-self-repair', 4, 'P2'),
      g('turn-keep-going-path', 'speech path continues after small pause marker, no written script', 'longer-turn-self-repair', 4, 'P2'),
      r('turn-pause-bead', 'a2-prosody-pause-bead', 'longer-turn-self-repair', 4, 'P2'),
      r('turn-chunk-bracket', 'a2-prosody-chunk-bracket', 'longer-turn-self-repair', 4, 'P2'),
      r('turn-replace-token', 'a2-write-replace-token', 'longer-turn-self-repair', 4, 'P2'),
      c('turn-script-lines', 'longer-turn-self-repair', 4, 'P2', 'Longer-turn scripts are dynamic lesson text.'),
      c('turn-speaking-rubric', 'longer-turn-self-repair', 4, 'P2', 'Rubrics/checklists are structural UI.'),
      b2('turn-rhetorical-repair', 'longer-turn-self-repair', 4, 'P2'),
    ],
  },
];

for (const group of FAMILY_PROPOSALS) {
  if (group.items.length !== group.expected) {
    throw new Error(`${group.id} expected ${group.expected}, got ${group.items.length}`);
  }
}

export const ALL_PROPOSALS = FAMILY_PROPOSALS.flatMap((g) => g.items);
export const CODE_LATER = ALL_PROPOSALS.filter((i) => i.classification === 'CODE_LATER');
export const GENERATE = ALL_PROPOSALS.filter((i) => i.classification === 'GENERATE');
export const REUSE_EXISTING = ALL_PROPOSALS.filter((i) => i.classification === 'REUSE_EXISTING');
export const DEFER_B2 = ALL_PROPOSALS.filter((i) => i.classification === 'DEFER_B2');

function sh(id, title, format, cells) {
  return { id, title, format, cells };
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function sheetsForWave(waveNo) {
  const cells = GENERATE.filter((i) => i.wave === waveNo);
  return chunk(cells, 16).map((part, i) =>
    sh(`S${i + 1}`, `B1 wave ${waveNo} generate sheet ${i + 1}`, 'black-contact-4x4', part),
  );
}

export const WAVES = {
  1: {
    id: 'wave1-p0-relationship-core',
    phase: 'P0',
    family: 'relationship-core',
    title: 'B1 Wave 1 P0 relationship core',
    style: `${STYLE}
FAMILY: connected discourse, reason/cause/evidence-lite, one-problem solution, compare-choose-justify, and follow-up/clarification. Keep all art reusable and text-free.`,
    sheets: sheetsForWave(1),
  },
  2: {
    id: 'wave2-p0-narrative-complication',
    phase: 'P0',
    family: 'narrative-reaction-complication',
    title: 'B1 Wave 2 P0 narrative one-complication overlays',
    style: `${STYLE}
FAMILY: one concrete complication at a time. Prefer overlays/states: rain, closed, unavailable, delayed, missing, blocked, restored, ask help, try again, change plan.`,
    sheets: sheetsForWave(2),
  },
  3: {
    id: 'wave3-p1-information-tracking',
    phase: 'P1',
    family: 'information-discourse-tracking',
    title: 'B1 Wave 3 P1 information and discourse tracking',
    style: `${STYLE}
FAMILY: practical source -> key facts -> recipient, main point + support + local clue, viewpoint/prediction -> outcome. No credibility, irony, bias, persuasion, or dashboards.`,
    sheets: sheetsForWave(3),
  },
  4: {
    id: 'wave4-p2-grammar-self-repair',
    phase: 'P2',
    family: 'semantic-grammar-self-repair',
    title: 'B1 Wave 4 P2 semantic grammar and self-repair',
    style: `${STYLE}
FAMILY: tiny overlay set only: background/event, experience/now, condition/result, plan changed, speaker relayed, thought group, pause, self-correction. No IPA and no tense charts.`,
    sheets: sheetsForWave(4),
  },
};

export function sheetsFor(wave) {
  return wave.sheets;
}

export function conceptCount(wave) {
  return sheetsFor(wave).reduce((n, s) => n + s.cells.length, 0);
}

export function filterSafety(cells) {
  const kept = [];
  const skipped = [];
  for (const cell of cells) {
    const parts = `${cell.key} ${cell.brief || ''} ${cell.reason || ''}`.toLowerCase().split(/[^a-z0-9]+/);
    const hit = [...SAFETY_SKIP_KEYS].find((bad) => parts.includes(bad));
    if (hit) skipped.push({ key: cell.key, reason: hit });
    else kept.push(cell);
  }
  return { kept, skipped };
}

export function resolveWave(raw) {
  const wave = WAVES[Number(raw)];
  if (!wave) throw new Error('Need --wave=1..4');
  return wave;
}

export function classificationCounts() {
  return ALL_PROPOSALS.reduce(
    (acc, item) => {
      acc[item.classification] = (acc[item.classification] || 0) + 1;
      return acc;
    },
    { GENERATE: 0, REUSE_EXISTING: 0, CODE_LATER: 0, DEFER_B2: 0 },
  );
}

export function writeLedgers(root = ROOT) {
  const specPath = path.join(root, TRACKED_SPEC_REL);
  const codePath = path.join(root, CODE_LATER_REL);
  fs.mkdirSync(path.dirname(specPath), { recursive: true });
  const byFamily = Object.fromEntries(
    FAMILY_PROPOSALS.map((group) => [
      group.family,
      group.items.reduce((acc, item) => {
        acc[item.classification] = (acc[item.classification] || 0) + 1;
        return acc;
      }, {}),
    ]),
  );
  const spec = {
    spec: 'b1-visual-operating-system-classification',
    updated_at: new Date().toISOString(),
    source: 'Wave 0 reconstructed from B1 cultivation prompt; no checked-in 301-component B1 proposal file was found.',
    total_proposals_reviewed: ALL_PROPOSALS.length,
    counts: classificationCounts(),
    by_family: byFamily,
    durable_root: STOCKPILE_REL,
    tracked_inventory: TRACKED_INV_REL,
    code_later: CODE_LATER_REL,
    level_model:
      'B1 connected familiar meaning + brief explanation + one concrete complication + adapt/follow-up + simple outcome. A2 links; B1 structures.',
    one_complication_rule:
      'One concrete problem at a time: notice -> why it matters -> 2-3 options -> choose -> outcome.',
    routing: {
      generate: 'missing, pictorially useful B1 relationship/state/action overlays',
      reuse_existing: 'A2/lower-level assets already communicate the renamed relation',
      code_later: 'rectangles, rails, tables, grids, text fields, SVG arrows, labels, reasons/opinions/text, checklists, instructions',
      defer_b2: 'debate, persuasion, rebuttal, source credibility, academic synthesis, negotiation, abstract societal, multi-layer contingency, essays, irony/tone/bias',
    },
    proposals: ALL_PROPOSALS,
  };
  fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));
  fs.writeFileSync(
    codePath,
    JSON.stringify(
      {
        spec: 'b1-code-later-structural-inventory',
        updated_at: spec.updated_at,
        note: 'Structural UI deferred intentionally: generated by renderer later, not sent to Manus.',
        count: CODE_LATER.length,
        items: CODE_LATER,
      },
      null,
      2,
    ),
  );
  return { specPath, codePath, spec };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const written = writeLedgers(ROOT);
  console.log(
    JSON.stringify(
      {
        phase: 'b1-ledgers-written',
        proposals: ALL_PROPOSALS.length,
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
