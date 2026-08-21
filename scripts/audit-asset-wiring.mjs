/**
 * Build the machine-readable harvested-asset migration inventory.
 *
 * This is deliberately read-only except for its JSON report. It compares
 * logical inventory items with the three live address spaces:
 *   - 07_vocab-pack/index.json
 *   - 08_backgrounds/manifest.json (scenes + flats)
 *   - 09_props/manifest.json
 *
 * Usage:
 *   node scripts/audit-asset-wiring.mjs
 *   node scripts/audit-asset-wiring.mjs --check
 *   node scripts/audit-asset-wiring.mjs --proof
 *   node scripts/audit-asset-wiring.mjs --output=tmp/asset-wiring.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ASSET_STATES,
  FAMILY_RULES,
  normalizeRepoPath,
  ruleForPath,
  statePriority,
} from './lib/asset-wiring-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = path.join(ROOT, 'docs');
const HARVESTED = path.join(ROOT, 'harvested');
const DEFAULT_OUTPUT = path.join(DOCS, 'asset-wiring-migration-inventory.json');

function arg(name, fallback = '') {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const flag = (name) => process.argv.includes(`--${name}`);
const OUTPUT = path.resolve(ROOT, arg('output', path.relative(ROOT, DEFAULT_OUTPUT)));

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function repoPath(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function absoluteFromRepoish(value) {
  if (!value) return null;
  const raw = String(value);
  if (path.isAbsolute(raw)) return path.normalize(raw);
  return path.resolve(ROOT, normalizeRepoPath(raw));
}

function walkFiles(root, accept, out = []) {
  if (!fs.existsSync(root)) return out;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) walkFiles(file, accept, out);
    else if (accept(file)) out.push(file);
  }
  return out;
}

const harvestedPngs = walkFiles(
  HARVESTED,
  (file) => path.extname(file).toLowerCase() === '.png'
);
const harvestedPngRepo = harvestedPngs.map(repoPath);
const harvestedPngSet = new Set(harvestedPngs.map((file) => path.normalize(file).toLowerCase()));

const propsManifestPath = path.join(ROOT, 'public/assets/09_props/manifest.json');
const backgroundsManifestPath = path.join(ROOT, 'public/assets/08_backgrounds/manifest.json');
const vocabIndexPath = path.join(ROOT, 'public/assets/07_vocab-pack/index.json');
const propsManifest = readJson(propsManifestPath);
const backgroundsManifest = readJson(backgroundsManifestPath);
const vocabIndex = readJson(vocabIndexPath);
const props = propsManifest.props || {};
const scenes = backgroundsManifest.scenes || {};
const flats = backgroundsManifest.flats || {};

function liveLocation(key) {
  if (props[key]) {
    return {
      bank: '09_props',
      manifestPath: 'public/assets/09_props/manifest.json',
      file: `public/assets/09_props/img/${props[key].file}`,
      row: props[key],
    };
  }
  if (scenes[key]) {
    return {
      bank: '08_backgrounds.scenes',
      manifestPath: 'public/assets/08_backgrounds/manifest.json',
      file: `public/assets/08_backgrounds/img/${scenes[key].file}`,
      row: scenes[key],
    };
  }
  if (flats[key]) {
    return {
      bank: '08_backgrounds.flats',
      manifestPath: 'public/assets/08_backgrounds/manifest.json',
      file: `public/assets/08_backgrounds/img/${flats[key].file}`,
      row: flats[key],
    };
  }
  if (vocabIndex[key]) {
    return {
      bank: '07_vocab-pack',
      manifestPath: 'public/assets/07_vocab-pack/index.json',
      file: `public/assets/07_vocab-pack/img/${vocabIndex[key].file}`,
      row: vocabIndex[key],
    };
  }
  return null;
}

function liveFileExists(live) {
  return !!(live && live.file && fs.existsSync(path.join(ROOT, live.file)));
}

function sourceEvidence(item, context) {
  const values = [
    item.source_path,
    item.harvest_file,
    item.harvest_sheet,
    item.sheet,
    item.path,
    context.sourcePath,
  ].filter(Boolean);
  const filename = item.filename || item.file;
  if (filename && context.sourcePath) {
    values.unshift(path.join(String(context.sourcePath), String(filename)));
  }

  for (const value of values) {
    const absolute = absoluteFromRepoish(value);
    if (!absolute || !fs.existsSync(absolute)) continue;
    const stat = fs.statSync(absolute);
    if (stat.isFile()) {
      if (path.extname(absolute).toLowerCase() === '.png') {
        return { verified: true, precision: 'exact_file', path: repoPath(absolute) };
      }
      continue;
    }
    const prefix = path.normalize(absolute).toLowerCase() + path.sep;
    const png = harvestedPngs.find((candidate) =>
      path.normalize(candidate).toLowerCase().startsWith(prefix)
    );
    if (png) {
      return { verified: true, precision: 'family_sheet', path: repoPath(absolute) };
    }
  }

  if (filename) {
    const matches = harvestedPngs.filter(
      (candidate) => path.basename(candidate).toLowerCase() === String(filename).toLowerCase()
    );
    if (matches.length === 1) {
      return { verified: true, precision: 'unique_filename', path: repoPath(matches[0]) };
    }
  }

  return { verified: false, precision: 'inventory_only', path: null };
}

function looksJunk(item, source) {
  const status = [
    item.qa,
    item.qa_status,
    item.status,
    item.classification,
    item.bucket,
    item.note,
    item.qa_note,
    source.path,
  ].filter(Boolean).join(' ').toLowerCase();
  return item.obvious_fail === true
    || /\b(junk|reject(?:ed)?|hard[-_ ]?fail|failed[-_ ]?qa)\b/.test(status)
    || /held-or-failed|rejected-original/.test(status);
}

function propGeneratorEligible(row) {
  if (!row || row.alpha !== true || row.dockSafe === false) return false;
  const w = Number(row.srcW);
  const h = Number(row.srcH);
  return w >= 120 && h >= 120;
}

function candidateRecord(item, context, inventoryFile, sequence) {
  const rawKey = item.replacement_key || item.key || item.asset_id || item.concept || item.id;
  if (!rawKey || typeof rawKey !== 'string') return null;
  const key = String(rawKey).trim();
  if (!key) return null;

  const source = sourceEvidence(item, context);
  const ruleInput = source.path || context.sourcePath || context.durableRoot || `harvested/${context.rootHint || ''}`;
  const rule = ruleForPath(ruleInput);
  const live = liveLocation(key);
  const addressable = liveFileExists(live);
  const states = new Set(rule.defaultStates);
  if (!source.verified) states.delete('RAW');
  if (live) states.add('IMPORTED');
  if (addressable) states.add('ADDRESSABLE');
  if (
    addressable
    && rule.genericEligibility
    && (
      live.bank === '07_vocab-pack'
      || live.bank === '08_backgrounds.scenes'
      || live.bank === '08_backgrounds.flats'
      || (live.bank === '09_props' && propGeneratorEligible(live.row))
    )
  ) {
    states.add('GENERATOR_ELIGIBLE');
    states.delete('REVIEW_REQUIRED');
  }
  if (looksJunk(item, source)) {
    states.add('JUNK');
    states.delete('GENERATOR_ELIGIBLE');
  }

  const family = String(
    item.family
    || item.family_id
    || item.wave
    || context.family
    || rule.id
  );
  const sortedStates = ASSET_STATES.filter((state) => states.has(state));
  return {
    id: `${repoPath(inventoryFile)}#${sequence}`,
    key,
    family,
    rule: rule.id,
    asset_kind: rule.assetKind,
    route: rule.route,
    source,
    live: live
      ? {
          bank: live.bank,
          file: live.file,
          file_exists: addressable,
        }
      : null,
    states: sortedStates,
    terminal_state: statePriority(sortedStates),
    qa: item.qa_status || item.qa || null,
    target_key: item.original_key || null,
    variant_of: item.variantOf || item.variant_of || null,
    registration_grade: item.registration_grade || context.registrationGrade || null,
    ...(context.semanticAuthority
      ? { semantic_authority: context.semanticAuthority }
      : {}),
  };
}

function inventoryRootHint(doc, file) {
  if (doc && typeof doc.durable_root === 'string') return doc.durable_root;
  if (path.basename(file) === 'prea1-stockpile-inventory.json') {
    return 'harvested/manus-prea1-stockpile';
  }
  const text = JSON.stringify(doc).match(/harvested[\\/][^"\\]+(?:[\\/][^"\\]+)?/i);
  if (text) return text[0].replace(/\\/g, '/');
  return `harvested/${path.basename(file, '.json').replace(/-inventory$/, '')}`;
}

const COLLECTION_KEYS = new Set(['items', 'cells', 'assets']);

function collectInventoryCandidates(doc, file) {
  const records = [];
  let sequence = 0;
  const rootHint = inventoryRootHint(doc, file);

  function visit(node, context, collectionName = '') {
    if (!node || typeof node !== 'object') return;
    const next = { ...context };
    if (typeof node.durable_root === 'string') next.durableRoot = node.durable_root;
    if (typeof node.sheet_dir === 'string') next.sourcePath = node.sheet_dir;
    else if (typeof node.harvest_dir === 'string') next.sourcePath = node.harvest_dir;
    else if (typeof node.path === 'string') next.sourcePath = node.path;
    if (node.family || node.family_id || node.wave) {
      next.family = node.family || node.family_id || node.wave;
    }
    if (node.registration_grade) next.registrationGrade = node.registration_grade;

    if (collectionName && COLLECTION_KEYS.has(collectionName)) {
      const record = candidateRecord(node, next, file, sequence++);
      if (record) records.push(record);
    }

    for (const [key, value] of Object.entries(node)) {
      if (key === 'saved' || key === 'imported_scenes') continue;
      if (Array.isArray(value)) {
        for (const child of value) visit(child, next, key);
      } else if (value && typeof value === 'object') {
        if (COLLECTION_KEYS.has(key)) {
          for (const child of Object.values(value)) visit(child, next, key);
        } else {
          visit(value, next, key);
        }
      }
    }
  }

  visit(doc, { rootHint, durableRoot: doc.durable_root || rootHint });
  return records;
}

function collectZoomCandidates(file) {
  const doc = readJson(file);
  const records = [];
  let sequence = 0;
  for (const world of Object.values(doc.worlds || {})) {
    const imported = world.imported_scenes || [];
    const saved = world.saved || [];
    for (let index = 0; index < saved.length; index++) {
      const item = {
        ...saved[index],
        key: imported[index] || path.basename(saved[index].filename || '', '.png'),
        family: world.world_id,
        qa_status: world.qa,
        registration_grade: world.qa,
      };
      const record = candidateRecord(
        item,
        {
          rootHint: 'harvested/world-zoom-completions',
          durableRoot: 'harvested/world-zoom-completions',
          family: world.world_id,
          registrationGrade: world.qa,
        },
        file,
        sequence++
      );
      if (record) records.push(record);
    }
  }
  return records;
}

function collectRelationshipCandidates(file) {
  const doc = readJson(file);
  const records = [];
  let sequence = 0;

  for (const family of doc.multi_view_families || []) {
    if (family.source !== 'board-enabling-k3' || !family.live_background_key) continue;
    const record = candidateRecord(
      {
        key: family.live_background_key,
        family: family.view_family_id,
        harvest_sheet: family.harvest_sheet,
        registration_grade: family.registration_grade,
      },
      {
        rootHint: 'harvested/board-enabling/multi-view-environments',
        sourcePath: family.harvest_sheet,
        family: family.view_family_id,
        registrationGrade: family.registration_grade,
        semanticAuthority: 'world-zoom-relationships',
      },
      file,
      sequence++
    );
    if (record) records.push(record);
  }

  const ladders = doc.k1_state_ladders_note || {};
  for (const familyId of ladders.family_ids || []) {
    const record = candidateRecord(
      {
        key: familyId,
        family: familyId,
        harvest_dir: ladders.harvest_root,
      },
      {
        rootHint: ladders.harvest_root,
        sourcePath: ladders.harvest_root,
        family: familyId,
        semanticAuthority: 'world-zoom-relationships',
      },
      file,
      sequence++
    );
    if (record) records.push(record);
  }
  return records;
}

const inventoryFiles = fs.readdirSync(DOCS)
  .filter((name) => /inventory\.json$/i.test(name))
  .filter((name) => name !== path.basename(DEFAULT_OUTPUT))
  .map((name) => path.join(DOCS, name))
  .sort();

let records = [];
for (const file of inventoryFiles) {
  if (path.basename(file) === 'world-zoom-completions-inventory.json') {
    records.push(...collectZoomCandidates(file));
  } else {
    records.push(...collectInventoryCandidates(readJson(file), file));
  }
}
records.push(
  ...collectRelationshipCandidates(path.join(DOCS, 'world-zoom-relationships.json'))
);

// Same logical key may be repeated across a mop inventory and its original.
// Keep the strongest record: addressable > exact source > family-sheet > raw.
const precisionRank = { exact_file: 3, unique_filename: 2, family_sheet: 1, inventory_only: 0 };
const recordRank = (record) =>
  (record.live && record.live.file_exists ? 100 : 0)
  + (record.semantic_authority ? 10 : 0)
  + precisionRank[record.source.precision]
  + (record.states.includes('JUNK') ? -10 : 0);
const byLogicalKey = new Map();
for (const record of records) {
  const id = record.key.toLowerCase();
  const prior = byLogicalKey.get(id);
  if (!prior || recordRank(record) > recordRank(prior)) byLogicalKey.set(id, record);
}
records = [...byLogicalKey.values()].sort(
  (a, b) => a.rule.localeCompare(b.rule) || a.family.localeCompare(b.family) || a.key.localeCompare(b.key)
);

function countStates(rows) {
  const out = Object.fromEntries(ASSET_STATES.map((state) => [state, 0]));
  for (const row of rows) {
    for (const state of row.states) out[state]++;
  }
  return out;
}

function familySummaries(rows) {
  const groups = new Map();
  for (const record of rows) {
    const id = `${record.rule}::${record.family}`;
    if (!groups.has(id)) {
      groups.set(id, {
        rule: record.rule,
        family: record.family,
        route: record.route,
        asset_kind: record.asset_kind,
        logical_assets: 0,
        source_verified: 0,
        imported: 0,
        addressable: 0,
        generator_eligible: 0,
        hold: 0,
        junk: 0,
      });
    }
    const group = groups.get(id);
    group.logical_assets++;
    if (record.source.verified) group.source_verified++;
    if (record.states.includes('IMPORTED')) group.imported++;
    if (record.states.includes('ADDRESSABLE')) group.addressable++;
    if (record.states.includes('GENERATOR_ELIGIBLE')) group.generator_eligible++;
    if (record.states.includes('HOLD')) group.hold++;
    if (record.states.includes('JUNK')) group.junk++;
  }
  return [...groups.values()].sort(
    (a, b) => a.rule.localeCompare(b.rule) || a.family.localeCompare(b.family)
  );
}

function allLiveRows(map, bank, base) {
  return Object.entries(map).map(([key, row]) => ({
    key,
    bank,
    file: `${base}/${row.file}`,
    row,
  }));
}

const liveRows = [
  ...allLiveRows(props, '09_props', 'public/assets/09_props/img'),
  ...allLiveRows(scenes, '08_backgrounds.scenes', 'public/assets/08_backgrounds/img'),
  ...allLiveRows(flats, '08_backgrounds.flats', 'public/assets/08_backgrounds/img'),
  ...allLiveRows(vocabIndex, '07_vocab-pack', 'public/assets/07_vocab-pack/img'),
];

function proofRow(id, route, intendedState, checks, details = {}) {
  const failed = checks.filter((check) => !check.ok);
  return {
    id,
    route,
    intended_state: intendedState,
    pass: failed.length === 0,
    checks,
    ...details,
  };
}

function fileCheck(label, file) {
  return { label, ok: fs.existsSync(path.join(ROOT, file)), value: file };
}

function countCheck(label, value, minimum) {
  return { label, ok: value >= minimum, value, minimum };
}

function buildProof() {
  const relationshipPath = path.join(DOCS, 'world-zoom-relationships.json');
  const relationships = readJson(relationshipPath);
  const zoomInventory = readJson(path.join(DOCS, 'world-zoom-completions-inventory.json'));
  const zoomWorlds = Object.values(zoomInventory.worlds || {});
  const zoomKeys = zoomWorlds.flatMap((world) => world.imported_scenes || []);
  const zoomRelationFamilies = (relationships.multi_view_families || []).filter(
    (family) => family.source === 'orphan-world-zoom-completions'
  );
  const zoomChecks = [
    countCheck('nine recovered zoom families', zoomWorlds.length, 9),
    { label: 'exactly twelve recovered zoom scenes', ok: zoomKeys.length === 12, value: zoomKeys.length, expected: 12 },
    countCheck('nine relationship families', zoomRelationFamilies.length, 9),
  ];
  for (const world of zoomWorlds) {
    zoomChecks.push({
      label: `${world.world_id} is REG_A`,
      ok: world.qa === 'REG_A',
      value: world.qa,
    });
    zoomChecks.push({
      label: `${world.world_id} parent overview addressable`,
      ok: !!scenes[world.parent_overview] && liveFileExists(liveLocation(world.parent_overview)),
      value: world.parent_overview,
    });
    for (const key of world.imported_scenes || []) {
      const live = liveLocation(key);
      zoomChecks.push({
        label: `${key} addressable`,
        ok: !!live && live.bank === '08_backgrounds.scenes' && liveFileExists(live),
        value: live && live.file,
      });
      zoomChecks.push({
        label: `${key} represented in relationships`,
        ok: zoomRelationFamilies.some((family) =>
          (family.live_background_keys || []).includes(key)
        ),
        value: key,
      });
    }
  }

  const countProps = (predicate) => Object.entries(props).filter(([key, row]) => predicate(key, row)).length;
  const countScenes = (predicate) => Object.entries(scenes).filter(([key, row]) => predicate(key, row)).length;
  const k3Families = (relationships.multi_view_families || []).filter(
    (family) => family.source === 'board-enabling-k3'
  );
  const k3Addressable = k3Families.filter((family) =>
    family.live_background_key
    && liveFileExists(liveLocation(family.live_background_key))
  ).length;
  const registeredRoot = path.join(HARVESTED, 'board-enabling/registered-scene-states');
  const horizontalRoot = path.join(HARVESTED, 'manus-horizontal-stockpile');
  const registeredPngs = harvestedPngs.filter((file) => file.startsWith(registeredRoot + path.sep)).length;
  const horizontalPngs = harvestedPngs.filter((file) => file.startsWith(horizontalRoot + path.sep)).length;

  return [
    proofRow(
      'world-zoom-completions',
      'import-background -> 08_backgrounds.scenes + relationship registry',
      'ADDRESSABLE+SPECIALIZED',
      zoomChecks,
      { scene_keys: zoomKeys }
    ),
    proofRow(
      'overview-worlds',
      'import-background -> 08_backgrounds.scenes',
      'GENERATOR_ELIGIBLE',
      [
        countCheck('overview-prefixed live scenes', countScenes((key) => key.startsWith('ow-')), 20),
        fileCheck('background manifest exists', 'public/assets/08_backgrounds/manifest.json'),
      ]
    ),
    proofRow(
      'builder-worlds',
      'import-background -> sequence-specialized scenes',
      'ADDRESSABLE+SPECIALIZED',
      [
        countCheck('builder-world live scenes', countScenes((key) => key.startsWith('ow-bw-')), 4),
        { label: 'builder relationship chain preserved', ok: (relationships.zoom_chains || []).some((chain) => chain.chain_id === 'canal-waterworks-zoom'), value: 'canal-waterworks-zoom' },
      ]
    ),
    proofRow(
      'content-worlds',
      'import-background -> 08_backgrounds.scenes',
      'GENERATOR_ELIGIBLE',
      [
        countCheck('content-world live scenes', countScenes((key) => key.startsWith('ow-cw-')), 1),
      ]
    ),
    proofRow(
      'kid-interest-props',
      'import-sheet -> staged rows -> merge-staged-props -> 09_props',
      'GENERATOR_ELIGIBLE',
      [
        countCheck('kid-interest live props', countProps((key) => key.startsWith('ki-')), 9),
        countCheck('kid-interest dock-sharp props', countProps((key, row) => key.startsWith('ki-') && propGeneratorEligible(row)), 6),
      ]
    ),
    proofRow(
      'hero-targets',
      'import-sheet -> merge-staged-props -> specialized king-stage eligibility',
      'ADDRESSABLE+SPECIALIZED',
      [
        countCheck('hero-target rows', countProps((key, row) => row.pack === 'hero-targets' || key.startsWith('hero-')), 1),
      ]
    ),
    proofRow(
      'story-cast',
      'import-sheet -> merge-staged-props -> StoryScene specialized selector',
      'ADDRESSABLE+SPECIALIZED',
      [
        countCheck('story-cast rows', countProps((key, row) => row.pack === 'story-cast' || key.startsWith('story-cast-')), 1),
      ]
    ),
    proofRow(
      'hide-reveal',
      'import-sheet -> merge-staged-props -> held state-pair mechanic',
      'ADDRESSABLE+SPECIALIZED+HOLD',
      [
        countCheck('hide-reveal rows', countProps((key, row) => row.pack === 'hide-reveal' || key.startsWith('hide-')), 1),
      ]
    ),
    proofRow(
      'vocab-pack',
      'import-vocab-sheet -> 07_vocab-pack/index.json -> VocabIcons/VocabArt',
      'GENERATOR_ELIGIBLE',
      [
        countCheck('vocab index rows', Object.keys(vocabIndex).length, 1000),
        fileCheck('vocab index exists', 'public/assets/07_vocab-pack/index.json'),
      ]
    ),
    proofRow(
      'board-enabling-multi-view',
      'relationship registry only; generic background scan blocked',
      'REFERENCE_ONLY+SPECIALIZED',
      [
        countCheck('K3 relationship families', k3Families.length, 12),
        { label: 'all K3 live sheets remain addressable', ok: k3Addressable === k3Families.length, value: k3Addressable, expected: k3Families.length },
      ]
    ),
    proofRow(
      'registered-and-horizontal-holds',
      'preserve source + metadata; no generic manifest activation',
      'SPECIALIZED+HOLD',
      [
        countCheck('registered-state source PNGs', registeredPngs, 1),
        countCheck('horizontal source PNGs', horizontalPngs, 1),
        { label: 'K1 state ladder metadata present', ok: (relationships.k1_state_ladders_note?.family_ids || []).length >= 11, value: (relationships.k1_state_ladders_note?.family_ids || []).length, minimum: 11 },
      ]
    ),
  ];
}

const representativeProof = buildProof();
const proofPassed = representativeProof.every((row) => row.pass);
const estimatedUnwired = records.filter((record) => !record.live).length;
const verifiedUnwired = records.filter((record) => !record.live && record.source.verified).length;
const unverifiedUnwired = records.filter((record) => !record.live && !record.source.verified).length;
const alreadyWired = records.filter((record) => record.states.includes('ADDRESSABLE')).length;
const externalEstimate = 5100;

const report = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  scope: 'Phase A harvested asset wiring audit and representative proof',
  architecture: {
    wired_definition: {
      imported: 'A row exists in the relevant live manifest/index.',
      addressable: 'The row exists and its referenced live file exists.',
      generator_eligible: 'A current selector may return it without bypassing family, safety, sharpness, or specialization gates.',
      prop_path: '09_props manifest -> PropBank index -> identity/pack/role selector -> VocabArt or activity/story renderer.',
      background_path: '08_backgrounds manifest -> SceneBackgrounds selector -> section/story/activity renderer.',
      vocab_path: '07_vocab-pack index -> VocabIcons -> VocabArt.',
      harvested_path: 'Inventory family -> rule -> existing importer -> manifest/index -> selector eligibility or explicit exception.',
    },
    live_counts: {
      props: Object.keys(props).length,
      background_scenes: Object.keys(scenes).length,
      background_flats: Object.keys(flats).length,
      vocab_entries: Object.keys(vocabIndex).length,
      live_rows_total: liveRows.length,
      missing_live_files: liveRows.filter((row) => !fs.existsSync(path.join(ROOT, row.file))).length,
    },
  },
  estimate_reconciliation: {
    user_estimated_unwired: externalEstimate,
    inventoried_logical_assets: records.length,
    estimated_unwired: estimatedUnwired,
    verified_unwired: verifiedUnwired,
    unverified_unwired: unverifiedUnwired,
    already_addressable_from_inventories: alreadyWired,
    delta_user_estimate_to_verified: verifiedUnwired - externalEstimate,
    discrepancy_explanation: [
      'The ~5,100 figure is a planning estimate, while verified_unwired counts unique logical inventory keys with surviving source evidence and no exact live address.',
      'One harvested PNG is often a 3x3, 4x4, 4x8, or mixed contact sheet, so PNG file counts and logical asset counts are intentionally different.',
      'Mop/recovery inventories repeat original keys; this audit de-duplicates by logical key and keeps the strongest source/live evidence.',
      'Inventory-only rows with no surviving exact file or family sheet are ESTIMATED_UNWIRED but not VERIFIED_UNWIRED.',
      'Exact keys already present in 07/08/09 are removed from unwired counts even when their harvested source remains.',
    ],
  },
  harvested_files: {
    png_total: harvestedPngs.length,
    likely_original_or_backup: harvestedPngRepo.filter((file) => /\.(orig|original)\.png$/i.test(file) || /backup|rejected-original/i.test(file)).length,
    held_or_failed_paths: harvestedPngRepo.filter((file) => /held|failed|rejected|junk/i.test(file)).length,
  },
  taxonomy: {
    states: ASSET_STATES,
    counts: countStates(records),
    mapping: {
      RAW: 'Surviving harvested PNG evidence exists; this does not imply QA or usability.',
      IMPORTED: 'An exact logical key has a row in 07_vocab, 08_backgrounds, or 09_props.',
      ADDRESSABLE: 'The live row points to an existing file.',
      GENERATOR_ELIGIBLE: 'Current generic selectors may return it after safety/identity/sharpness checks.',
      SPECIALIZED: 'Usable only by its named mechanic, pack, sequence, state family, or relationship-aware selector.',
      REFERENCE_ONLY: 'Metadata/source is intentionally preserved but generic generation must not select it.',
      REVIEW_REQUIRED: 'Identity, QA, route, or family semantics need a human/family rule before merge.',
      HOLD: 'A required planner/renderer/state mechanic does not exist or the stockpile is explicitly closed.',
      JUNK: 'Known failed/rejected source; never import or use as a variant.',
    },
  },
  family_rules: FAMILY_RULES,
  families: familySummaries(records),
  proof: {
    pass: proofPassed,
    representative_family_count: representativeProof.length,
    representative_families: representativeProof,
  },
  records,
};

function stable(value) {
  const copy = JSON.parse(JSON.stringify(value));
  delete copy.generated_at;
  return JSON.stringify(copy);
}

if (flag('check')) {
  if (!fs.existsSync(OUTPUT)) {
    console.error(`Missing migration inventory: ${repoPath(OUTPUT)}`);
    process.exit(1);
  }
  const current = readJson(OUTPUT);
  if (stable(current) !== stable(report)) {
    console.error(`Migration inventory is stale: ${repoPath(OUTPUT)}`);
    process.exit(1);
  }
  console.log(`PASS inventory current: ${repoPath(OUTPUT)}`);
} else if (!flag('proof')) {
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${repoPath(OUTPUT)}`);
}

console.log(JSON.stringify({
  inventoried: records.length,
  estimated_unwired: estimatedUnwired,
  verified_unwired: verifiedUnwired,
  already_addressable: alreadyWired,
  harvested_pngs: harvestedPngs.length,
  proof_pass: proofPassed,
  proof_families: representativeProof.length,
}, null, 2));

if (!proofPassed) {
  for (const family of representativeProof.filter((row) => !row.pass)) {
    console.error(`PROOF FAIL ${family.id}`);
    for (const check of family.checks.filter((row) => !row.ok)) {
      console.error(`  - ${check.label}: ${JSON.stringify(check.value)}`);
    }
  }
  process.exit(1);
}
