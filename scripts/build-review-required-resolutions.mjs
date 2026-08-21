/**
 * Convert clear Phase-C family semantics into durable, fail-closed decisions.
 *
 * This does not activate pixels. It records the intended semantic lane and a
 * concrete activation HOLD while each source sheet is rerun through the
 * field-aware keyer. Art replacements are deliberately excluded: they remain
 * REVIEW_REQUIRED until old/new comparison records a per-cell verdict.
 *
 * Outputs:
 *   docs/review-required-resolutions.json
 *   docs/prop-view-state-relationships.json
 *
 * Usage:
 *   node scripts/build-review-required-resolutions.mjs
 *   node scripts/build-review-required-resolutions.mjs --check
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INPUT = path.join(ROOT, 'docs', 'asset-wiring-migration-inventory.json');
const ACTIVATION_RECEIPTS = path.join(ROOT, 'docs', 'review-required-activation-receipts.json');
const RESOLUTIONS = path.join(ROOT, 'docs', 'review-required-resolutions.json');
const RELATIONSHIPS = path.join(ROOT, 'docs', 'prop-view-state-relationships.json');
const CHECK = process.argv.includes('--check');
const SAMPLE_SEED = 'phase-c-2026-08-20';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function stable(value) {
  const copy = JSON.parse(JSON.stringify(value));
  delete copy.generated_at;
  return JSON.stringify(copy);
}

function hash(value) {
  let h = 2166136261;
  for (const ch of `${SAMPLE_SEED}|${value}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function familyId(row) {
  return `${row.rule}::${row.family}`;
}

function intendedDisposition(row) {
  const family = familyId(row);
  if (family === 'aggressive-stockpile::F') return 'GENERATOR_ELIGIBLE';
  if (family === 'aggressive-stockpile::H') return 'SPECIALIZED';
  if (family === 'aggressive-stockpile::P') return 'SPECIALIZED';
  if (family.startsWith('board-enabling::k2-')) return 'SPECIALIZED';
  if (family === 'aggressive-stockpile::E') {
    return /-shell$/.test(row.key) ? 'SPECIALIZED' : 'GENERATOR_ELIGIBLE';
  }
  if (family === 'aggressive-stockpile::D') {
    return /(?:-fragment|-surface)$/.test(row.key)
      ? 'SPECIALIZED'
      : 'GENERATOR_ELIGIBLE';
  }
  if (family === 'aggressive-stockpile::K') {
    const relation = relationForKey(row.key);
    return relation.generic_candidate ? 'GENERATOR_ELIGIBLE' : 'SPECIALIZED';
  }
  return null;
}

function packFor(row) {
  const family = familyId(row);
  if (family === 'aggressive-stockpile::H') return 'action-poses';
  if (family === 'aggressive-stockpile::P') return 'story-cast';
  if (family === 'board-enabling::k2-mia') return 'epistemic-mia';
  if (family === 'board-enabling::k2-leo') return 'epistemic-leo';
  if (family === 'board-enabling::k2-2shot') return 'epistemic-two-shot';
  if (family === 'aggressive-stockpile::K') return 'prop-view-state';
  return null;
}

function relationForKey(key) {
  const rules = [
    {
      pattern: /^(.+)-side-profile$/,
      type: 'view',
      value: 'side',
      parent: (match) => match[1],
      generic: false,
    },
    {
      pattern: /^(.+)-top-view$/,
      type: 'view',
      value: 'top',
      parent: (match) => match[1],
      generic: false,
    },
    {
      pattern: /^(.+)-front-view$/,
      type: 'view',
      value: 'front',
      parent: (match) => match[1],
      generic: false,
    },
    {
      pattern: /^(.+?)(?:-ring)?-cutaway$/,
      type: 'cutaway',
      value: 'cross-section',
      parent: (match) => match[1],
      generic: true,
    },
    {
      pattern: /^(.+)-cross-section$/,
      type: 'cutaway',
      value: 'cross-section',
      parent: (match) => match[1],
      generic: true,
    },
    {
      pattern: /^(.+)-(bitten|peeled|ajar)-in-use$/,
      type: 'state',
      value: (match) => `${match[2]}-in-use`,
      parent: (match) => match[1],
      generic: false,
    },
    {
      pattern: /^(.+)-in-use(?:-(.+))?$/,
      type: 'state',
      value: (match) => (match[2] ? `in-use-${match[2]}` : 'in-use'),
      parent: (match) => match[1],
      generic: false,
    },
    {
      pattern: /^book-spine-profile$/,
      type: 'view',
      value: 'spine',
      parent: () => 'book',
      generic: false,
    },
    {
      pattern: /^clock-back$/,
      type: 'view',
      value: 'back',
      parent: () => 'clock',
      generic: false,
    },
    {
      pattern: /^egg-in-cup$/,
      type: 'state',
      value: 'in-cup',
      parent: () => 'egg',
      generic: false,
    },
    {
      pattern: /^flashlight-off-profile$/,
      type: 'view_state',
      value: 'profile-off',
      parent: () => 'flashlight',
      generic: false,
    },
    {
      pattern: /^book-open-spread-blank$/,
      type: 'state',
      value: 'open-blank-surface',
      parent: () => 'book',
      generic: false,
    },
    {
      pattern: /^book-top-closed$/,
      type: 'view_state',
      value: 'top-closed',
      parent: () => 'book',
      generic: false,
    },
  ];
  for (const rule of rules) {
    const match = key.match(rule.pattern);
    if (!match) continue;
    return {
      parent_key: rule.parent(match),
      relation_type: rule.type,
      relation_value: typeof rule.value === 'function' ? rule.value(match) : rule.value,
      generic_candidate: rule.generic,
    };
  }
  throw new Error(`K key has no relationship rule: ${key}`);
}

const inventory = readJson(INPUT);
const activationReceiptDoc = readJson(ACTIVATION_RECEIPTS);
const requiredGates = new Set(activationReceiptDoc.required_gates || []);
const activationReceipts = new Map();
for (const receipt of activationReceiptDoc.receipts || []) {
  const key = String(receipt?.key || '').trim();
  if (!key) throw new Error('Activation receipt has no key');
  if (activationReceipts.has(key)) throw new Error(`Duplicate activation receipt: ${key}`);
  if (!['GENERATOR_ELIGIBLE', 'SPECIALIZED'].includes(receipt.disposition)) {
    throw new Error(`Invalid activation disposition for ${key}: ${receipt.disposition}`);
  }
  const passedGates = new Set(receipt.passed_gates || []);
  const missingGates = [...requiredGates].filter(
    (gate) =>
      !passedGates.has(gate)
      && ![...passedGates].some((result) => result.startsWith(`${gate}_NOT_APPLICABLE_`))
  );
  if (missingGates.length) {
    throw new Error(`Activation receipt ${key} is missing gates: ${missingGates.join(', ')}`);
  }
  activationReceipts.set(key, receipt);
}
const sourceRows = (inventory.records || []).filter((row) => {
  if (!row.source?.verified || intendedDisposition(row) == null) return false;
  return !row.live || activationReceipts.has(row.key);
});
const sourceRowsByKey = new Map(sourceRows.map((row) => [row.key, row]));
for (const [key, receipt] of activationReceipts) {
  const row = sourceRowsByKey.get(key);
  if (!row) throw new Error(`Activation receipt has no matching inventory row: ${key}`);
  if (!row.live?.file_exists) throw new Error(`Activation receipt is not addressable: ${key}`);
  if (intendedDisposition(row) !== receipt.disposition) {
    throw new Error(
      `Activation receipt disposition mismatch for ${key}: ${receipt.disposition} != ${intendedDisposition(row)}`
    );
  }
}
const unknownK = [];
for (const row of sourceRows.filter((item) => familyId(item) === 'aggressive-stockpile::K')) {
  try {
    relationForKey(row.key);
  } catch (_) {
    unknownK.push(row.key);
  }
}
if (unknownK.length) {
  throw new Error(`K keys missing relationship rules: ${unknownK.join(', ')}`);
}

const decisions = [];
const relationships = [];
for (const row of sourceRows) {
  const disposition = intendedDisposition(row);
  if (!disposition) continue;
  const pack = packFor(row);
  const relation = familyId(row) === 'aggressive-stockpile::K' ? relationForKey(row.key) : null;
  const activationReceipt = activationReceipts.get(row.key) || null;
  const needsNamedRoute = !activationReceipt && disposition === 'SPECIALIZED' && !pack;
  const states = ['RAW'];
  const removeStates = ['REVIEW_REQUIRED', 'HOLD'];
  if (activationReceipt) {
    states.push(disposition);
    removeStates.push(disposition === 'SPECIALIZED' ? 'GENERATOR_ELIGIBLE' : 'SPECIALIZED');
  } else {
    if (disposition === 'SPECIALIZED') {
      states.push('SPECIALIZED');
      removeStates.push('GENERATOR_ELIGIBLE');
    } else {
      removeStates.push('SPECIALIZED', 'GENERATOR_ELIGIBLE');
    }
    states.push('HOLD');
  }

  decisions.push({
    key: row.key,
    source_inventory_id: row.id,
    family: familyId(row),
    intended_disposition: disposition,
    terminal_state: activationReceipt ? disposition : 'HOLD',
    states,
    remove_states: [...new Set(removeStates)],
    pack,
    relationship_id: relation ? `prop-rel:${row.key}` : null,
    activation_blocker: activationReceipt
      ? null
      : needsNamedRoute
        ? 'SOURCE_QA_AND_EXACT_MECHANIC_ROUTE_REQUIRED'
        : 'SOURCE_SHEET_REQUIRES_FIELD_AWARE_KEYER_QA',
    blocker_detail: activationReceipt
      ? null
      : needsNamedRoute
        ? 'The asset is semantically SPECIALIZED but has no safe family-wide pack. Keep exact-key source identity; activation requires both field-aware C0/C1/C6/C7/C9/C10 visual QA and an explicit mechanic route. Do not expose it generically.'
        : 'Semantic route is resolved. Activation remains held until the exact cell passes C0/C1/C6/C7/C9/C10 and visual QA; force/stage-all is not authorization.',
    activation_receipt: activationReceipt
      ? {
          phase: activationReceipt.phase,
          source_batch: activationReceipt.source_batch,
          source_sheet: activationReceipt.source_sheet,
          source_cell: activationReceipt.source_cell,
          passed_gates: activationReceipt.passed_gates,
          evidence: activationReceipt.evidence,
        }
      : null,
  });

  if (relation) {
    relationships.push({
      relationship_id: `prop-rel:${row.key}`,
      key: row.key,
      parent_key: relation.parent_key,
      relation_type: relation.relation_type,
      relation_value: relation.relation_value,
      intended_disposition: disposition,
      pack: 'prop-view-state',
      variant_of: null,
      source_path: row.source.path,
      activation_state: activationReceipt ? disposition : 'HOLD',
    });
  }
}

decisions.sort((a, b) => a.family.localeCompare(b.family) || a.key.localeCompare(b.key));
relationships.sort((a, b) => a.parent_key.localeCompare(b.parent_key) || a.key.localeCompare(b.key));

const counts = {};
const intendedCounts = {};
const terminalCounts = {};
for (const row of decisions) {
  counts[row.family] = (counts[row.family] || 0) + 1;
  intendedCounts[row.intended_disposition] = (intendedCounts[row.intended_disposition] || 0) + 1;
  terminalCounts[row.terminal_state] = (terminalCounts[row.terminal_state] || 0) + 1;
}

const auditSample = [];
for (const family of Object.keys(counts).sort()) {
  const rows = decisions
    .filter((row) => row.family === family)
    .sort((a, b) => hash(a.key) - hash(b.key) || a.key.localeCompare(b.key))
    .slice(0, 3);
  auditSample.push(...rows.map((row) => ({
    family,
    key: row.key,
    intended_disposition: row.intended_disposition,
    pack: row.pack,
    relationship_id: row.relationship_id,
  })));
}

const resolutionDoc = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  scope: 'Phase C semantic decisions with fail-closed activation holds',
  source: 'docs/asset-wiring-migration-inventory.json',
  policy: {
    decision: 'HYBRID_KEYER_AND_HOLD',
    safe_fields: ['clean-black', 'clean-white'],
    unsupported_fields: ['gradient', 'illustrated', 'ambiguous-border'],
    hard_block_gates: ['C0', 'C1', 'C6', 'C7', 'C9', 'C10'],
    force_is_not_approval: true,
    art_replacements_excluded: 480,
  },
  accounting: {
    decisions: decisions.length,
    activation_receipts: activationReceipts.size,
    by_family: Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))),
    by_intended_disposition: Object.fromEntries(
      Object.entries(intendedCounts).sort(([a], [b]) => a.localeCompare(b))
    ),
    by_terminal_state: Object.fromEntries(
      Object.entries(terminalCounts).sort(([a], [b]) => a.localeCompare(b))
    ),
  },
  specialized_pack_schema: {
    H: 'action-poses',
    P: 'story-cast',
    K_relationship_members: 'prop-view-state',
    K2_mia: 'epistemic-mia',
    K2_leo: 'epistemic-leo',
    K2_two_shot: 'epistemic-two-shot',
  },
  sample_audit: {
    method: `stable pseudo-random sample, seed=${SAMPLE_SEED}, 3 keys per family`,
    rows: auditSample,
  },
  decisions,
};

const relationshipDoc = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  scope: 'Prop-level view/state/cutaway relationships for aggressive-stockpile K',
  invariants: [
    'variantOf is reserved for interchangeable depictions.',
    'View, state, cutaway, and in-use edges always retain parent_key and relation_type.',
    'SPECIALIZED relationship members are retrieved only through named pack or exact key.',
    'GENERATOR_ELIGIBLE is only an intended lane until activation_state becomes ADDRESSABLE.',
  ],
  relationship_count: relationships.length,
  relationships,
};

function writeOrCheck(file, value) {
  if (CHECK) {
    if (!fs.existsSync(file) || stable(readJson(file)) !== stable(value)) {
      console.error(`Missing or stale ${path.relative(ROOT, file)}`);
      process.exitCode = 1;
      return;
    }
    console.log(`PASS current ${path.relative(ROOT, file)}`);
    return;
  }
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  console.log(`Wrote ${path.relative(ROOT, file)}`);
}

writeOrCheck(RESOLUTIONS, resolutionDoc);
writeOrCheck(RELATIONSHIPS, relationshipDoc);
console.log(JSON.stringify({
  decisions: decisions.length,
  activation_receipts: activationReceipts.size,
  relationships: relationships.length,
  by_family: counts,
  intended: intendedCounts,
  terminal: terminalCounts,
  sample_rows: auditSample.length,
}, null, 2));
