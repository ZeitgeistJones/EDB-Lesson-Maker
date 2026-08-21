/**
 * Build the exact verified, unwired REVIEW_REQUIRED queue after Phase C.
 *
 * This is accounting and policy only: it never imports pixels or mutates a
 * live asset manifest.
 *
 * Usage:
 *   node scripts/audit-review-required-resolution.mjs
 *   node scripts/audit-review-required-resolution.mjs --check
 *   node scripts/audit-review-required-resolution.mjs --proof
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INPUT = path.join(ROOT, 'docs/asset-wiring-migration-inventory.json');
const ART_INPUT = path.join(ROOT, 'docs/art-replacements-stockpile-inventory.json');
const OUTPUT = path.join(ROOT, 'docs/review-required-resolution-inventory.json');
// Phase A baseline was 1862. Phase B (Sonnet 5) legitimately moves keys out of
// this queue wave by wave via real merges/dispositions; EXPECTED_QUEUE and the
// per-family expectations below are the CURRENT baseline after those explained
// moves, not the original Phase A snapshot. Each wave's movement is documented
// in docs/review-required-resolution-phase-b-status.md and its commit.
// Phase C resolves the six aggressive-stockpile families and all K2 families
// into explicit fail-closed HOLD decisions with preserved semantic intent.
// Only the 480 candidates that still require literal old/new comparison remain
// genuinely REVIEW_REQUIRED.
const EXPECTED_QUEUE = 480;
const flag = (name) => process.argv.includes(`--${name}`);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function countBy(rows, getKey) {
  const counts = {};
  for (const row of rows) {
    const key = String(getKey(row));
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))
  );
}

function collectReplacementMetadata(doc) {
  const byKey = new Map();
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (typeof node.replacement_key === 'string' && typeof node.original_key === 'string') {
      byKey.set(node.replacement_key, {
        original_key: node.original_key,
        reason_codes: Array.isArray(node.reason_codes)
          ? [...new Set(node.reason_codes.map(String))].sort()
          : [],
      });
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const child of value) visit(child);
      } else if (value && typeof value === 'object') {
        visit(value);
      }
    }
  }
  visit(doc);
  return byKey;
}

const FAMILY_POLICIES = Object.freeze({
  'aggressive-stockpile::D': {
    family_type: 'story-dressing',
    reason_code: 'STORY_DRESSING_SPLIT_AND_CELL_QA',
    semantic_lane: 'GENERATOR_ELIGIBLE_OR_SPECIALIZED',
    family_rule_resolution: 'SPLIT_BY_ROLE_THEN_SHEET_QA',
    rule: 'Standalone objects may enter generic PropBank after QA. Crops, fragments, shells, and composition-only dressing stay SPECIALIZED. Specificity alone is never a hold reason.',
    relationship_policy: 'Keep stateful or fragment counterparts linked; do not flatten a composable set into unrelated synonyms.',
  },
  'aggressive-stockpile::E': {
    family_type: 'accessibility-and-manipulatives',
    reason_code: 'A11Y_MANIPULATIVE_SPLIT_AND_CELL_QA',
    semantic_lane: 'GENERATOR_ELIGIBLE_OR_SPECIALIZED',
    family_rule_resolution: 'SPLIT_BY_ROLE_THEN_SHEET_QA',
    rule: 'Ordinary standalone aids and manipulatives are generic candidates after identity and dock gates. Blank shells, tile fragments, and system parts stay SPECIALIZED when they require a named board mechanic. Mid-obscure concepts are intentional.',
    relationship_policy: 'Preserve view/state labels and system membership; never demote an aid because it is uncommon.',
  },
  'aggressive-stockpile::F': {
    family_type: 'role-detail-props',
    reason_code: 'ROLE_DETAIL_PROP_CELL_QA',
    semantic_lane: 'GENERATOR_ELIGIBLE',
    family_rule_resolution: 'FAMILY_ROUTE_PLUS_SHEET_QA',
    rule: 'Route clean standalone professional tools to staged PropBank import. A narrow profession-specific identity remains eligible when accurate, safe, sharp, and dock-safe.',
    relationship_policy: 'Retain useful variants with variantOf; do not merge distinct tools merely because they share a profession.',
  },
  'aggressive-stockpile::H': {
    family_type: 'generic-child-micro-actions',
    reason_code: 'ACTION_POSE_NAMED_ROUTE_AND_CELL_QA',
    semantic_lane: 'SPECIALIZED',
    family_rule_resolution: 'FAMILY_ROUTE_PLUS_SHEET_QA',
    rule: 'Import approved action poses into a named action/role pack. Exact mechanic lookup is allowed; generic object and vocab selection is not.',
    relationship_policy: 'Preserve actor, direction, action, and paired-state semantics. Do not collapse action phases into variants.',
  },
  'aggressive-stockpile::K': {
    family_type: 'cutaways-alt-views-and-in-use-states',
    reason_code: 'VIEW_STATE_LINEAGE_AND_CELL_QA',
    semantic_lane: 'GENERATOR_ELIGIBLE_OR_SPECIALIZED',
    family_rule_resolution: 'RELATIONSHIP_SPLIT_PLUS_SHEET_QA',
    rule: 'A complete key such as apple-cutaway may be generically eligible after QA. Pure camera views, before/after states, and coordinated cutaways require explicit parent and relationship metadata.',
    relationship_policy: 'Record base identity plus view/state relation. A camera view or state is not an interchangeable v2 variant.',
  },
  'aggressive-stockpile::P': {
    family_type: 'mia-leo-story-poses',
    reason_code: 'CHARACTER_POSE_NAMED_ROUTE_AND_CELL_QA',
    semantic_lane: 'SPECIALIZED',
    family_rule_resolution: 'FAMILY_ROUTE_PLUS_SHEET_QA',
    rule: 'Import approved Mia/Leo poses only into the named story-cast route with exact character/action identity. Never expose them through generic object or vocab selection.',
    relationship_policy: 'Preserve character identity, facing direction, action, emotion, and any paired pose.',
  },
  'art-replacements::art-replacements': {
    family_type: 'vocab-art-replacements',
    reason_code: 'REPLACEMENT_CELL_QA_AND_COLLISION_DECISION',
    semantic_lane: 'GENERATOR_ELIGIBLE_OR_JUNK',
    family_rule_resolution: 'PER_CELL_LINEAGE_REVIEW_REQUIRED',
    rule: 'Compare each candidate with original_key. PASS replaces that exact live identity and inherits its eligibility; a non-improvement is JUNK as a replacement candidate. Never create a redo-* teach-word.',
    relationship_policy: 'Keep original_key and reason_codes through review. Never overwrite without a recorded PASS decision.',
  },
  'board-enabling::k2-mia': {
    family_type: 'epistemic-mia-singles',
    reason_code: 'EPISTEMIC_POSE_NAMED_ROUTE_AND_CELL_QA',
    semantic_lane: 'SPECIALIZED',
    family_rule_resolution: 'FAMILY_ROUTE_PLUS_SHEET_QA',
    rule: 'Approved Mia epistemic singles belong to a named epistemic/story mechanic, not the generic prop or vocab pool.',
    relationship_policy: 'Preserve character, knowledge state, gaze direction, and counterpart family.',
  },
  'board-enabling::k2-leo': {
    family_type: 'epistemic-leo-singles',
    reason_code: 'EPISTEMIC_POSE_NAMED_ROUTE_AND_CELL_QA',
    semantic_lane: 'SPECIALIZED',
    family_rule_resolution: 'FAMILY_ROUTE_PLUS_SHEET_QA',
    rule: 'Approved Leo epistemic singles belong to a named epistemic/story mechanic, not the generic prop or vocab pool.',
    relationship_policy: 'Preserve character, knowledge state, gaze direction, and counterpart family.',
  },
  'board-enabling::k2-2shot': {
    family_type: 'epistemic-coordinated-two-shots',
    reason_code: 'COORDINATED_CAST_RELATIONSHIP_AND_CELL_QA',
    semantic_lane: 'SPECIALIZED',
    family_rule_resolution: 'FAMILY_ROUTE_PLUS_REGISTRATION_QA',
    rule: 'Two-character knowledge scenes are atomic coordinated assets for exact mechanic lookup. Do not split or flatten them into independent character poses.',
    relationship_policy: 'Preserve relative eyeline, actor roles, knowledge asymmetry, and registration as one family.',
  },
});

const VISUAL_REPRESENTATIVES = Object.freeze([
  {
    family: 'aggressive-stockpile::F',
    file: 'harvested/manus-aggressive-stockpile/s4-roles-a11y/s4f-role-detail-props/sheets/01.png',
    observation: 'Nine isolated profession tools are semantically standalone; the white field requires normal keying/gate QA, not a family hold.',
  },
  {
    family: 'aggressive-stockpile::E',
    file: 'harvested/manus-aggressive-stockpile/s4-roles-a11y/s4e-a11y-manipulatives/sheets/01.png',
    observation: 'Aids and manipulatives are clear on black; ordinary objects can be generic while the blank communication-board shell remains system-specialized.',
  },
  {
    family: 'aggressive-stockpile::H',
    file: 'harvested/manus-aggressive-stockpile/s4-roles-a11y/s4hk-micro-actions-altviews/sheets/01.png',
    observation: 'The cells depict child actions, sometimes with scene fragments or another person; named action-pack routing is required.',
  },
  {
    family: 'aggressive-stockpile::K',
    file: 'harvested/manus-aggressive-stockpile/s4-roles-a11y/s4hk-micro-actions-altviews/sheets/02.png',
    observation: 'Cutaways, side profiles, blank states, and in-use states are visibly distinct semantic views; parent/view/state lineage must survive.',
  },
  {
    family: 'aggressive-stockpile::P',
    file: 'harvested/manus-aggressive-stockpile/s4-mia-leo-story/s4ml1-mia-leo-story-poses-dressing/sheets/01.png',
    observation: 'Leo action poses are character-specific and compositional; they belong in exact story-cast retrieval, not generic vocab.',
  },
  {
    family: 'aggressive-stockpile::D',
    file: 'harvested/manus-aggressive-stockpile/s4-mia-leo-story/s4ml1-mia-leo-story-poses-dressing/sheets/03.png',
    observation: 'The dressing sheet mixes standalone objects with blank shells/surfaces, proving the need for a role split rather than one family verdict.',
  },
  {
    family: 'art-replacements::art-replacements',
    file: 'harvested/manus-art-replacements/art-redo-wave1/sheets/01.png',
    observation: 'Replacement art is plausible but only meaningful against its ordered original_key list; visual quality alone cannot authorize overwrite.',
  },
  {
    family: 'board-enabling::k2-mia',
    file: 'harvested/board-enabling/epistemic-character-poses/k2-mia/sheets/01.png',
    observation: 'Mia singles encode gaze, knowledge, concealment, and message actions; those semantics require named retrieval.',
  },
  {
    family: 'board-enabling::k2-leo',
    file: 'harvested/board-enabling/epistemic-character-poses/k2-leo/sheets/01.png',
    observation: 'Leo singles encode distinct epistemic states and counterparts; they must preserve character and knowledge-state metadata.',
  },
  {
    family: 'board-enabling::k2-2shot',
    file: 'harvested/board-enabling/epistemic-character-poses/k2-2shot/sheets/01.png',
    observation: 'Two-shots visibly depend on relative eyeline and role asymmetry; splitting them would destroy the teaching meaning.',
  },
]);

function policyFor(record) {
  return FAMILY_POLICIES[`${record.rule}::${record.family}`] || null;
}

function proofRow(id, actual, expected, evidence) {
  return { id, pass: actual === expected, actual, expected, evidence };
}

const migration = readJson(INPUT);
const replacements = collectReplacementMetadata(readJson(ART_INPUT));
const reviewStateRows = migration.records.filter(
  (record) => record.terminal_state === 'REVIEW_REQUIRED'
);
const excludedUnverified = reviewStateRows.filter((record) => !record.source.verified);
const excludedAddressable = reviewStateRows.filter(
  (record) => record.source.verified && record.live?.file_exists
);
const queue = reviewStateRows.filter(
  (record) => record.source.verified && !record.live
);

const missingPolicies = queue.filter((record) => !policyFor(record));
if (missingPolicies.length > 0) {
  throw new Error(
    `Missing review policy: ${JSON.stringify(countBy(missingPolicies, (record) => `${record.rule}::${record.family}`))}`
  );
}

const records = queue.map((record) => {
  const policy = policyFor(record);
  const replacement = replacements.get(record.key);
  return {
    key: record.key,
    source_inventory_id: record.id,
    source_path: record.source.path,
    rule: record.rule,
    source_family: record.family,
    family_type: policy.family_type,
    reason_code: policy.reason_code,
    semantic_lane: policy.semantic_lane,
    family_rule_resolution: policy.family_rule_resolution,
    relationship_policy: policy.relationship_policy,
    target_key: replacement?.original_key || record.target_key || null,
    source_reason_codes: replacement?.reason_codes || [],
    variant_of: record.variant_of,
    registration_grade: record.registration_grade,
  };
});

const grouped = new Map();
for (const row of queue) {
  const id = `${row.rule}::${row.family}`;
  if (!grouped.has(id)) grouped.set(id, []);
  grouped.get(id).push(row);
}
const familyGroups = [...grouped.entries()].map(([id, rows]) => {
  const policy = FAMILY_POLICIES[id];
  return {
    rule: rows[0].rule,
    source_family: rows[0].family,
    family_type: policy.family_type,
    count: rows.length,
    reason_code: policy.reason_code,
    semantic_lane: policy.semantic_lane,
    family_rule_resolution: policy.family_rule_resolution,
    rule_text: policy.rule,
    relationship_policy: policy.relationship_policy,
    representative_keys: rows.slice(0, 3).map((row) => row.key),
    source_roots: [...new Set(rows.map((row) => row.source.path))].sort(),
  };
}).sort((a, b) => a.rule.localeCompare(b.rule) || a.source_family.localeCompare(b.source_family));

const familyExpected = {
  'art-replacements::art-replacements': 480,
};
const familyCounts = countBy(queue, (record) => `${record.rule}::${record.family}`);
const representativeProof = Object.entries(familyExpected).map(([id, expected]) =>
  proofRow(id, familyCounts[id] || 0, expected, FAMILY_POLICIES[id].family_type)
);

const reasonCounts = countBy(records, (record) => record.reason_code);
const replacementTriggerCounts = {};
for (const record of records.filter((row) => row.rule === 'art-replacements')) {
  for (const reason of record.source_reason_codes) {
    replacementTriggerCounts[reason] = (replacementTriggerCounts[reason] || 0) + 1;
  }
}

const globalChecks = [
  proofRow('exact-review-required-queue', queue.length, EXPECTED_QUEUE, 'verified source + no live row'),
  proofRow('review-state-total', reviewStateRows.length, 840, 'current migration inventory'),
  proofRow('excluded-inventory-only', excludedUnverified.length, 309, 'not in verified baseline'),
  proofRow('excluded-already-addressable', excludedAddressable.length, 51, 'not unwired'),
  proofRow('family-proof-count', representativeProof.length, 1, 'only replacement comparisons remain'),
  proofRow(
    'replacement-lineage-complete',
    records.filter((record) => record.rule === 'art-replacements' && record.target_key).length,
    480,
    'replacement_key -> original_key'
  ),
  proofRow('all-records-have-policy', records.filter((record) => record.reason_code).length, EXPECTED_QUEUE, 'reason and lane assigned'),
  proofRow(
    'visual-representative-files',
    VISUAL_REPRESENTATIVES.filter((row) => fs.existsSync(path.join(ROOT, row.file))).length,
    10,
    'one locally inspected sheet for each proof family'
  ),
];
const proofPassed = [...globalChecks, ...representativeProof].every((row) => row.pass);

const report = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  scope: 'Exact verified-unwired REVIEW_REQUIRED queue after Phase C semantic resolution',
  source_inventory: 'docs/asset-wiring-migration-inventory.json',
  accounting: {
    review_state_total: reviewStateRows.length,
    less_inventory_only_unverified: excludedUnverified.length,
    less_already_addressable: excludedAddressable.length,
    review_required_verified_unwired: queue.length,
    equation: `${reviewStateRows.length} - ${excludedUnverified.length} - ${excludedAddressable.length} = ${queue.length}`,
  },
  top_level_reasons: [
    {
      reason: 'AGGRESSIVE_MIXED_ROUTE_AND_CELL_QA',
      count: queue.filter((record) => record.rule === 'aggressive-stockpile').length,
      evidence: 'Source inventories are stockpile-only/no_wiring and mix generic props, named poses, views, states, fragments, and system parts.',
    },
    {
      reason: 'REPLACEMENT_CELL_QA_AND_COLLISION_DECISION',
      count: queue.filter((record) => record.rule === 'art-replacements').length,
      evidence: 'Every candidate targets original_key, but no candidate has a per-cell PASS/HOLD collision verdict.',
    },
    {
      reason: 'SPECIALIZED_EPISTEMIC_ROUTE_AND_CELL_QA',
      count: queue.filter((record) => record.rule === 'board-enabling').length,
      evidence: 'K2 singles and coordinated two-shots have named knowledge-state semantics and no generic route.',
    },
  ],
  detailed_reason_counts: reasonCounts,
  art_replacement_source_trigger_counts: Object.fromEntries(
    Object.entries(replacementTriggerCounts).sort(([a], [b]) => a.localeCompare(b))
  ),
  disposition_contract: {
    GENERATOR_ELIGIBLE: 'Only after import/addressability plus identity, sharpness, alpha, dock, topic, and family gates. Obscure but accurate kid-interest is allowed.',
    SPECIALIZED: 'Use through an exact named mechanic, pack, character/action route, sequence, state, or relationship-aware selector; exclude from generic pools.',
    REFERENCE_ONLY: 'Preserve source and relationship metadata when useful evidence is not itself selectable.',
    HOLD: 'Only for a real blocker: explicit lock, missing mechanic/schema, uncertain identity above threshold, unsafe source pending verdict, or unresolved relationship.',
    JUNK: 'A reviewed failed/rejected candidate. Never preserve junk as a variant or delete a valid live original when its replacement candidate is junk.',
  },
  invariants: [
    'Specificity or low expected frequency is not a HOLD reason.',
    'Distinct useful depictions remain variants; preserve variantOf when interchangeable.',
    'Camera views, state changes, paired poses, two-shots, world zooms, and builder sequences are relationships, not v2 variants.',
    'Long-tail lock remains outside this queue and must not be reopened by a broad aggressive-stockpile rule.',
    'Art replacements retain original_key lineage and never become redo-* teach-word identities.',
    'One uncertain member creates an exception row; it does not freeze an otherwise resolvable family.',
  ],
  family_groups: familyGroups,
  sonnet_waves: [
    { wave: 'R1-R5', families: ['aggressive-stockpile::D/E/F/H/K/P', 'board-enabling::k2-*'], default_lane: 'RESOLVED_TO_ACTIVATED_OR_FAIL_CLOSED_HOLD', purpose: 'Semantic routes are durable; future pixel activation must use the field-aware keyer and QA receipts.' },
    { wave: 'R6', families: ['art-replacements::art-replacements'], default_lane: 'PER_CELL_REPLACEMENT', purpose: 'Only genuine review queue: compare candidate to original and record evidence-backed PASS/HOLD/JUNK before overwrite.' },
  ],
  proof: {
    pass: proofPassed,
    representative_family_count: representativeProof.length,
    global_checks: globalChecks,
    representative_families: representativeProof,
    visual_representatives: VISUAL_REPRESENTATIVES,
  },
  records,
};

function stable(value) {
  const copy = JSON.parse(JSON.stringify(value));
  delete copy.generated_at;
  return JSON.stringify(copy);
}

if (flag('check')) {
  if (!fs.existsSync(OUTPUT) || stable(readJson(OUTPUT)) !== stable(report)) {
    console.error(`Missing or stale ${path.relative(ROOT, OUTPUT)}`);
    process.exit(1);
  }
  console.log(`PASS current ${path.relative(ROOT, OUTPUT)}`);
} else if (!flag('proof')) {
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${path.relative(ROOT, OUTPUT)}`);
}

console.log(JSON.stringify({
  review_state_total: reviewStateRows.length,
  excluded_inventory_only: excludedUnverified.length,
  excluded_addressable: excludedAddressable.length,
  verified_unwired_review_required: queue.length,
  family_counts: familyCounts,
  reason_counts: reasonCounts,
  proof_pass: proofPassed,
  representative_families: representativeProof.length,
}, null, 2));

if (!proofPassed) {
  for (const check of [...globalChecks, ...representativeProof].filter((row) => !row.pass)) {
    console.error(`PROOF FAIL ${check.id}: ${check.actual} !== ${check.expected}`);
  }
  process.exit(1);
}
