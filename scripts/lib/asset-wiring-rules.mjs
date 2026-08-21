/**
 * Shared family rules for harvested asset activation.
 *
 * These rules classify stockpile families before an importer touches pixels.
 * Specific rules must precede broad roots. The migration audit and the harvest
 * importer both consume this file so documentation cannot drift from execution.
 */

export const ASSET_STATES = Object.freeze([
  'RAW',
  'IMPORTED',
  'ADDRESSABLE',
  'GENERATOR_ELIGIBLE',
  'SPECIALIZED',
  'REFERENCE_ONLY',
  'REVIEW_REQUIRED',
  'HOLD',
  'JUNK',
]);

export const FAMILY_RULES = Object.freeze([
  Object.freeze({
    id: 'world-zoom-completions',
    pathIncludes: 'harvested/world-zoom-completions/',
    assetKind: 'background_scene',
    route: 'background',
    importers: ['scripts/import-background.mjs'],
    genericEligibility: false,
    preserve: ['world_zoom_relationship', 'same_world_view', 'registration_grade'],
    defaultStates: ['RAW', 'SPECIALIZED'],
    note: 'Already recovered/imported zoom scenes. Verify only; never remanufacture.',
  }),
  Object.freeze({
    id: 'board-enabling-multi-view',
    pathIncludes: 'harvested/board-enabling/multi-view-environments/',
    assetKind: 'multi_view_scene',
    route: 'reference_only',
    importers: [],
    genericEligibility: false,
    preserve: ['view_family_id', 'view_role', 'view_direction', 'registration_grade'],
    defaultStates: ['RAW', 'SPECIALIZED', 'REFERENCE_ONLY'],
    note: 'A contact sheet is a coordinated view family, not one generic background.',
  }),
  Object.freeze({
    id: 'board-enabling-registered-states',
    pathIncludes: 'harvested/board-enabling/registered-scene-states/',
    assetKind: 'registered_scene_state',
    route: 'specialized_hold',
    importers: [],
    genericEligibility: false,
    preserve: ['state_family_id', 'state_order', 'registration_grade'],
    defaultStates: ['RAW', 'SPECIALIZED', 'HOLD'],
    note: 'Same-camera state ladders require a state mechanic; they are not viewpoints.',
  }),
  Object.freeze({
    id: 'horizontal-harvest',
    pathIncludes: 'harvested/manus-horizontal-stockpile/',
    assetKind: 'specialized_interaction_asset',
    route: 'specialized_hold',
    importers: [],
    genericEligibility: false,
    preserve: ['state_pair', 'role', 'surface', 'qa_status'],
    defaultStates: ['RAW', 'SPECIALIZED', 'HOLD'],
    note: 'Closed stockpile. Keep out of generic PropBank/background selectors.',
  }),
  Object.freeze({
    id: 'prea1-structural',
    pathIncludes: 'harvested/manus-prea1-stockpile/',
    assetKind: 'specialized_teaching_surface',
    route: 'specialized_hold',
    importers: [],
    genericEligibility: false,
    preserve: ['family', 'phase', 'qa_status'],
    defaultStates: ['RAW', 'SPECIALIZED', 'HOLD'],
    note: 'Instruction, TPR, phonology, and tracing mechanics need explicit renderers.',
  }),
  Object.freeze({
    id: 'a1-structural',
    pathIncludes: 'harvested/manus-a1-stockpile/',
    assetKind: 'specialized_teaching_surface',
    route: 'specialized_hold',
    importers: [],
    genericEligibility: false,
    preserve: ['family', 'phase', 'qa_status'],
    defaultStates: ['RAW', 'SPECIALIZED', 'HOLD'],
    note: 'Structural classroom mechanics stay specialized until a renderer requests them.',
  }),
  Object.freeze({
    id: 'a2-structural',
    pathIncludes: 'harvested/manus-a2-stockpile/',
    assetKind: 'specialized_teaching_surface',
    route: 'specialized_hold',
    importers: [],
    genericEligibility: false,
    preserve: ['family', 'phase', 'qa_status'],
    defaultStates: ['RAW', 'SPECIALIZED', 'HOLD'],
    note: 'Routes, transactions, information gaps, and prosody overlays need mechanics.',
  }),
  Object.freeze({
    id: 'b1-discourse',
    pathIncludes: 'harvested/manus-b1-stockpile/',
    assetKind: 'specialized_teaching_surface',
    route: 'specialized_hold',
    importers: [],
    genericEligibility: false,
    preserve: ['family', 'phase', 'qa_status'],
    defaultStates: ['RAW', 'SPECIALIZED', 'HOLD'],
    note: 'Relationship/discourse visuals are not generic props.',
  }),
  Object.freeze({
    id: 'b2-discourse',
    pathIncludes: 'harvested/manus-b2-stockpile/',
    assetKind: 'specialized_teaching_surface',
    route: 'specialized_hold',
    importers: [],
    genericEligibility: false,
    preserve: ['family', 'phase', 'qa_status'],
    defaultStates: ['RAW', 'SPECIALIZED', 'HOLD'],
    note: 'Argument and mediation visuals require explicit planner semantics.',
  }),
  Object.freeze({
    id: 'visual-grammar',
    pathIncludes: 'harvested/manus-visual-grammar-stockpile/',
    assetKind: 'specialized_teaching_overlay',
    route: 'specialized_hold',
    importers: [],
    genericEligibility: false,
    preserve: ['family', 'phase', 'qa_status'],
    defaultStates: ['RAW', 'SPECIALIZED', 'HOLD'],
    note: 'Grammar relationships need named slots; do not leak them into object picks.',
  }),
  Object.freeze({
    id: 'kid-interest',
    pathIncludes: 'harvested/kid-interest',
    assetKind: 'prop_sheet',
    route: 'prop_sheet',
    importers: [
      'scripts/import-sheet.mjs',
      'scripts/merge-staged-props.mjs',
    ],
    genericEligibility: true,
    preserve: ['variantOf', 'pack', 'subject', 'decorative', 'dockSafe'],
    defaultStates: ['RAW', 'REVIEW_REQUIRED'],
    note: 'Named black-field cells stage, QA, then merge into 09_props.',
  }),
  Object.freeze({
    id: 'overview-worlds',
    pathIncludes: 'harvested/overview-worlds/',
    assetKind: 'background_scene',
    route: 'background',
    importers: ['scripts/import-background.mjs'],
    genericEligibility: true,
    preserve: ['world_family', 'category', 'groundY', 'relationships'],
    defaultStates: ['RAW', 'REVIEW_REQUIRED'],
    note: 'Single full-page landscapes import into 08_backgrounds.scenes.',
  }),
  Object.freeze({
    id: 'builder-worlds',
    pathIncludes: 'harvested/builder-worlds/',
    assetKind: 'builder_sequence_scene',
    route: 'background',
    importers: ['scripts/import-background.mjs'],
    genericEligibility: false,
    preserve: ['sequence_family', 'sequence_index', 'compatible_world_view'],
    defaultStates: ['RAW', 'SPECIALIZED'],
    note: 'Sequence plates may be addressable backgrounds but stay sequence-specialized.',
  }),
  Object.freeze({
    id: 'content-worlds',
    pathIncludes: 'harvested/content-worlds/',
    assetKind: 'coordinated_world_family',
    route: 'reference_only',
    importers: [],
    genericEligibility: false,
    preserve: ['world_family', 'world_role', 'companion_role', 'relationships', 'category', 'groundY'],
    defaultStates: ['RAW', 'SPECIALIZED', 'REFERENCE_ONLY'],
    note: 'Companions, worlds, and sheets are coordinated families. Preserve them together until a relationship-aware inventory/importer exists.',
  }),
  Object.freeze({
    id: 'board-enabling',
    pathIncludes: 'harvested/board-enabling/',
    assetKind: 'specialized_board_asset',
    route: 'specialized_review',
    importers: [],
    genericEligibility: false,
    preserve: ['family', 'registered_state', 'multi_view', 'qa_status'],
    defaultStates: ['RAW', 'SPECIALIZED', 'REVIEW_REQUIRED'],
    note: 'Unknown board-enabling families fail closed until explicitly classified.',
  }),
  Object.freeze({
    id: 'long-tail-props',
    pathIncludes: 'harvested/manus-long-tail-stockpile/',
    assetKind: 'mixed_stockpile',
    route: 'specialized_hold',
    importers: [],
    genericEligibility: false,
    preserve: ['family', 'sheet_type', 'variantOf', 'pack', 'subject', 'decorative', 'dockSafe'],
    defaultStates: ['RAW', 'SPECIALIZED', 'HOLD'],
    note: 'Explicit STOCKPILE LOCK/no_wiring source. Mixed prop grids and landscape sheets require an intentional unlock plus subtype rules.',
  }),
  Object.freeze({
    id: 'art-replacements',
    pathIncludes: 'harvested/manus-art-replacements/',
    assetKind: 'vocab_replacement_sheet',
    route: 'vocab_replacement',
    importers: ['scripts/import-vocab-sheet.mjs'],
    genericEligibility: false,
    preserve: ['replacement_key', 'original_key', 'reason_codes', 'qa_status'],
    defaultStates: ['RAW', 'REVIEW_REQUIRED'],
    note: 'Target an existing vocab identity; never register redo-* as a new word.',
  }),
  Object.freeze({
    id: 'aggressive-stockpile',
    pathIncludes: 'harvested/manus-aggressive-stockpile/',
    assetKind: 'mixed_stockpile',
    route: 'specialized_review',
    importers: [
      'scripts/import-sheet.mjs',
      'scripts/merge-staged-props.mjs',
      'scripts/import-background.mjs',
    ],
    genericEligibility: false,
    preserve: ['family', 'role', 'state', 'multi_view', 'qa_status'],
    defaultStates: ['RAW', 'SPECIALIZED', 'REVIEW_REQUIRED'],
    note: 'Mixed props/scenes/overlays must be split by family before import.',
  }),
]);

const FALLBACK_RULE = Object.freeze({
  id: 'unclassified-harvest',
  pathIncludes: 'harvested/',
  assetKind: 'unknown',
  route: 'review',
  importers: [],
  genericEligibility: false,
  preserve: ['source_path', 'inventory_key'],
  defaultStates: ['RAW', 'REVIEW_REQUIRED'],
  note: 'No family rule matched. Fail closed; classify before migration.',
});

export function normalizeRepoPath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^[A-Za-z]:\/[^/]+\/PPT-Lesson-Maker-for-Classin\//i, '');
}

export function ruleForPath(value) {
  const normalized = normalizeRepoPath(value).toLowerCase();
  return FAMILY_RULES.find((rule) => {
    const root = rule.pathIncludes.toLowerCase().replace(/\/+$/, '');
    return normalized === root || normalized.includes(`${root}/`);
  })
    || FALLBACK_RULE;
}

export function shouldSkipLooseHarvestPath(value) {
  const rule = ruleForPath(value);
  return rule.route !== 'background';
}

export function statePriority(states) {
  const order = [
    'JUNK',
    'HOLD',
    'REFERENCE_ONLY',
    'REVIEW_REQUIRED',
    'SPECIALIZED',
    'GENERATOR_ELIGIBLE',
    'ADDRESSABLE',
    'IMPORTED',
    'RAW',
  ];
  const set = new Set(states || []);
  return order.find((state) => set.has(state)) || 'REVIEW_REQUIRED';
}
