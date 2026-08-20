/**
 * Builder-worlds STREAM A — ranks 1–4 (canal-lock, kaiten-belt, beehive-stack, harbor-berth).
 * Stream B owns ranks 5–8 via request-builder-worlds-b.mjs.
 * Stockpile only. No producer wiring.
 *
 *   node scripts/manus/request-builder-worlds.mjs --audit-only
 *   node scripts/manus/request-builder-worlds.mjs --wave=canal-lock --fire
 *   node scripts/manus/request-builder-worlds.mjs --wave=canal-lock --poll-only
 *   node scripts/manus/request-builder-worlds.mjs --next --fire
 *   node scripts/manus/request-builder-worlds.mjs --loop
 *   node scripts/manus/request-builder-worlds.mjs --doc-only
 *
 * Slot: 1 of 4 global Manus — shared with stream B under builder-worlds/ (max 1 in-flight).
 * Art: harvested/builder-worlds/ (PNG — do NOT git-add).
 * Tracked: this script, docs/builder-worlds-portfolio.md|.json, docs/builder-worlds-log.md,
 *          docs/builder-worlds-inventory.json.
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import {
  ROOT,
  createTask,
  pollUntilDone,
  listMessages,
  sendMessage,
  MANUS_SKILLS,
  resolveAgentProfile,
  withEslAssetGeneratorBrief,
  apiKey,
} from './client.mjs';

export const STOCKPILE_REL = 'harvested/builder-worlds';
export const TRACKED_DOC_REL = 'docs/builder-worlds-log.md';
export const PORTFOLIO_MD_REL = 'docs/builder-worlds-portfolio.md';
export const PORTFOLIO_JSON_REL = 'docs/builder-worlds-portfolio.json';
export const INV_REL = 'docs/builder-worlds-inventory.json';
export const PREFIX = 'bw-';
export const BOARD = { width: 1280, height: 590 };

const STOCKPILE = path.join(ROOT, STOCKPILE_REL);
const LOCK = path.join(STOCKPILE, '.inv-bw.lock');
const POLL_MS = 30_000;
const TIMEOUT_MS = 70 * 60 * 1000;
const RATE_WAIT_MS = 90_000;

const STYLE = `STYLE LOCK: ONE coherent child-friendly ClassIn ESL house style — clean sparse vector / soft-matte educational illustration. Same line weight, palette, and padding across every sheet. No photorealism, no glossy 3D, no sticker-pack chaos.
TEXT LOCK: BLANK / text-free only. Do NOT bake English words, captions, labels, letters, numbers, prices, times, dates, handwriting, signs, badges, logos, UI text, or fake readable text.
STOCKPILE LOCK: raw Manus sheets only. Do not wire, import to PropBank, modify renderer, or broaden this list.
QUALITY: default only.
SCALE LOCK: BOARD-SCALE pieces kids can drag on a ~${BOARD.width}×${BOARD.height} ClassIn board. NO tiny fasteners, screws, bolts, nails, hinge pins, or micro hardware.`;

const BASE_LOCK = `FULL-PAGE BASE — one landscape PNG play floor (~16:9). Open play zone ~40–55%. Empty enough to receive modules. Soft children's-book illustration. No people. No text/logos.`;

const CUTOUT_LOCK = `BLACK-FIELD CUTOUT contact sheet — pure #000000 black edge-to-edge with clear gutters. One concept per cell. Nothing crosses cell boundaries. Empty unused cells stay pure black. Isolated still-life / module on black. Generous margin. BOARD-SCALE (not icons).`;

export const ESTATE_AUDIT = [
  { bank: 'BE-K5 town→country route tiles/base', class: 'ALREADY_DEEP', note: 'Do not clone another route kit.' },
  { bank: 'CW A+B empty biomes + habitat companions', class: 'ALREADY_DEEP', note: 'Ecosystem worlds exist.' },
  { bank: 'Aggressive S1 zoo/forest/desert/beach settings', class: 'ALREADY_DEEP', note: 'Place washes, not modular builders.' },
  { bank: 'CW CDE + S4 cutaways', class: 'ALREADY_DEEP', note: 'Not modular builders.' },
  { bank: 'Marketplace/bakery/ferry/marina civic stages', class: 'PARTIAL', note: 'Empty stages exist; modular atoms missing.' },
  { bank: 'Builder-world modular kits', class: 'MISSING', note: 'This stockpile.' },
];

export const SKIPPED_AS_DEEP = [
  'route tiles (K5)',
  'habitat biomes (CW A+B)',
  'zoo enclosure clones',
  'object/building cutaway still-lifes',
  'orchestra wedges (JKLM)',
  'Mia/Leo poses',
  'classroom noun dumps',
  'tiny fasteners',
];

function cell(kit, part, slug, brief) {
  return {
    key: `${PREFIX}${kit}-${part}-${slug}`,
    concept: `${kit}-${part}-${slug}`,
    part,
    brief,
  };
}

function sh(id, title, format, cells) {
  return { id, title, format, cells };
}

function kitWave(slug, title, playPattern, whyNovel, sheets) {
  return {
    id: slug,
    family_id: `${PREFIX}${slug}`,
    title,
    play_pattern: playPattern,
    why_novel: whyNovel,
    sheets,
  };
}

/** Each kit: 1 base + 3 black contact sheets (modules+connectors combined, tokens, problems). */
export const WAVES = {
  'canal-lock': kitWave(
    'canal-lock',
    'BW canal-lock — gated chamber sequence kit',
    'Open/close gates; move boat chamber→chamber',
    'No modular lock atoms; CDE dam is cutaway only',
    [
      sh('S1', 'canal-lock empty corridor base', 'full-page-base', [
        cell('canal-lock', 'base', 'corridor', `${BASE_LOCK} Empty canal lock corridor: two chambers with gate pockets, towpath edges, open water band center. NO boats fused. NO people. NO text.`),
      ]),
      sh('S2', 'canal-lock modules + connectors 3x3', 'black-contact-3x3', [
        cell('canal-lock', 'mod', 'chamber-a', `${CUTOUT_LOCK} BOARD-SCALE empty lock chamber shell (open top), not a map icon.`),
        cell('canal-lock', 'mod', 'chamber-b', `${CUTOUT_LOCK} Second chamber shell matching pitch of chamber-a.`),
        cell('canal-lock', 'mod', 'gate-closed', `${CUTOUT_LOCK} Pair of closed mitre lock gates (board-scale).`),
        cell('canal-lock', 'mod', 'gate-open', `${CUTOUT_LOCK} Pair of open mitre lock gates swung aside.`),
        cell('canal-lock', 'conn', 'gate-pocket', `${CUTOUT_LOCK} Gate recess / pocket wall segment that visually abuts chambers.`),
        cell('canal-lock', 'conn', 'towpath-segment', `${CUTOUT_LOCK} Short towpath bank segment (board-scale connector).`),
        cell('canal-lock', 'conn', 'ladder-rungs', `${CUTOUT_LOCK} Lock wall ladder (BOARD-SCALE, not tiny hardware).`),
        cell('canal-lock', 'mod', 'water-high', `${CUTOUT_LOCK} High water fill overlay shape matching chamber footprint.`),
        cell('canal-lock', 'mod', 'water-low', `${CUTOUT_LOCK} Low water fill overlay shape matching chamber footprint.`),
      ]),
      sh('S3', 'canal-lock tokens 3x3', 'black-contact-3x3', [
        cell('canal-lock', 'tok', 'narrowboat', `${CUTOUT_LOCK} Simple canal narrowboat side view, blank, no logos.`),
        cell('canal-lock', 'tok', 'small-boat', `${CUTOUT_LOCK} Small open boat.`),
        cell('canal-lock', 'tok', 'barge', `${CUTOUT_LOCK} Short cargo barge blank.`),
        cell('canal-lock', 'tok', 'mooring-rope', `${CUTOUT_LOCK} Coil of rope (board-scale token).`),
        cell('canal-lock', 'tok', 'life-ring', `${CUTOUT_LOCK} Life ring blank (no text).`),
        cell('canal-lock', 'tok', 'bollard', `${CUTOUT_LOCK} Quay bollard.`),
        cell('canal-lock', 'tok', 'crate', `${CUTOUT_LOCK} Wooden crate blank.`),
        cell('canal-lock', 'tok', 'duck', `${CUTOUT_LOCK} Simple duck still-life (population token).`),
        cell('canal-lock', 'tok', 'fish-splash', `${CUTOUT_LOCK} Small fish splash mark (no letters).`),
      ]),
      sh('S4', 'canal-lock problem overlays 3x3', 'black-contact-3x3', [
        cell('canal-lock', 'prob', 'gate-stuck', `${CUTOUT_LOCK} Stuck gate with wedged timber (problem overlay).`),
        cell('canal-lock', 'prob', 'leak-spray', `${CUTOUT_LOCK} Water leak spray from gate seam.`),
        cell('canal-lock', 'prob', 'debris-log', `${CUTOUT_LOCK} Floating debris log blocking chamber.`),
        cell('canal-lock', 'prob', 'rope-tangle', `${CUTOUT_LOCK} Tangled rope problem.`),
        cell('canal-lock', 'prob', 'low-water-mud', `${CUTOUT_LOCK} Muddy low-water problem patch.`),
        cell('canal-lock', 'prob', 'missing-gate', `${CUTOUT_LOCK} Empty gate pocket (absence problem).`),
        cell('canal-lock', 'prob', 'overflow-foam', `${CUTOUT_LOCK} Overflow foam at chamber rim.`),
        cell('canal-lock', 'prob', 'crack-wall', `${CUTOUT_LOCK} Cracked lock wall repair target.`),
        cell('canal-lock', 'prob', 'repair-patch', `${CUTOUT_LOCK} Repair patch plate ready to place.`),
      ]),
    ],
  ),
  'kaiten-belt': kitWave(
    'kaiten-belt',
    'BW kaiten-belt — circulating dish loop kit',
    'Circulate plates along a loop; serve/claim',
    'No belt-loop builder; cafe settings are rooms',
    [
      sh('S1', 'kaiten empty belt-loop base', 'full-page-base', [
        cell('kaiten-belt', 'base', 'loop-floor', `${BASE_LOCK} Empty sushi/cafe circulating-belt floor: oval belt path recessed, stools suggested as empty arcs at edges, BIG open center. NO food fused on belt. NO people. NO text.`),
      ]),
      sh('S2', 'kaiten modules + connectors 3x3', 'black-contact-3x3', [
        cell('kaiten-belt', 'mod', 'belt-straight', `${CUTOUT_LOCK} Straight belt segment (board-scale).`),
        cell('kaiten-belt', 'mod', 'belt-curve', `${CUTOUT_LOCK} 90° belt curve segment matching width.`),
        cell('kaiten-belt', 'mod', 'belt-corner-inner', `${CUTOUT_LOCK} Inner corner belt piece.`),
        cell('kaiten-belt', 'mod', 'service-hatch', `${CUTOUT_LOCK} Kitchen pass-through hatch module.`),
        cell('kaiten-belt', 'conn', 'belt-joint', `${CUTOUT_LOCK} Visible belt joint/connector plate (board-scale, not a screw).`),
        cell('kaiten-belt', 'conn', 'rail-guide', `${CUTOUT_LOCK} Side rail guide for plates.`),
        cell('kaiten-belt', 'mod', 'stool-pad', `${CUTOUT_LOCK} Empty stool pad marker.`),
        cell('kaiten-belt', 'mod', 'tray-slot', `${CUTOUT_LOCK} Tray slot recess on belt.`),
        cell('kaiten-belt', 'mod', 'condiment-island', `${CUTOUT_LOCK} Empty condiment island (blank bottles shapes, no labels).`),
      ]),
      sh('S3', 'kaiten tokens 3x3', 'black-contact-3x3', [
        cell('kaiten-belt', 'tok', 'plate-empty', `${CUTOUT_LOCK} Empty round plate.`),
        cell('kaiten-belt', 'tok', 'plate-sushi', `${CUTOUT_LOCK} Plate with simple sushi pieces (no brand).`),
        cell('kaiten-belt', 'tok', 'plate-soup', `${CUTOUT_LOCK} Bowl of soup on plate.`),
        cell('kaiten-belt', 'tok', 'plate-fruit', `${CUTOUT_LOCK} Fruit plate.`),
        cell('kaiten-belt', 'tok', 'chopsticks', `${CUTOUT_LOCK} Chopsticks pair.`),
        cell('kaiten-belt', 'tok', 'teapot', `${CUTOUT_LOCK} Small teapot blank.`),
        cell('kaiten-belt', 'tok', 'cup', `${CUTOUT_LOCK} Tea cup blank.`),
        cell('kaiten-belt', 'tok', 'napkin', `${CUTOUT_LOCK} Folded napkin.`),
        cell('kaiten-belt', 'tok', 'menu-blank', `${CUTOUT_LOCK} Blank folded card (NO text).`),
      ]),
      sh('S4', 'kaiten problem overlays 3x3', 'black-contact-3x3', [
        cell('kaiten-belt', 'prob', 'spill-sauce', `${CUTOUT_LOCK} Sauce spill on belt.`),
        cell('kaiten-belt', 'prob', 'fallen-plate', `${CUTOUT_LOCK} Fallen tipped plate.`),
        cell('kaiten-belt', 'prob', 'jammed-curve', `${CUTOUT_LOCK} Plates jammed at curve.`),
        cell('kaiten-belt', 'prob', 'empty-gap', `${CUTOUT_LOCK} Long empty belt gap (absence).`),
        cell('kaiten-belt', 'prob', 'wrong-order', `${CUTOUT_LOCK} Mismatched dish pile (problem).`),
        cell('kaiten-belt', 'prob', 'wet-towel', `${CUTOUT_LOCK} Wet cleaning towel heap.`),
        cell('kaiten-belt', 'prob', 'broken-rail', `${CUTOUT_LOCK} Broken side rail segment.`),
        cell('kaiten-belt', 'prob', 'repair-clamp', `${CUTOUT_LOCK} Large repair clamp (board-scale, not a screw).`),
        cell('kaiten-belt', 'prob', 'steam-cloud', `${CUTOUT_LOCK} Hot steam cloud overlay.`),
      ]),
    ],
  ),
  'beehive-stack': kitWave(
    'beehive-stack',
    'BW beehive-stack — hive box + frame kit',
    'Stack boxes; pull frames; inspect',
    'No hive modular kit; bee vocab is tokens only',
    [
      sh('S1', 'beehive apiary pad base', 'full-page-base', [
        cell('beehive-stack', 'base', 'apiary-pad', `${BASE_LOCK} Empty grassy apiary pad with flat hive plinths and open play band. NO bees fused as a swarm carpet. NO people. NO text.`),
      ]),
      sh('S2', 'beehive modules + connectors 3x3', 'black-contact-3x3', [
        cell('beehive-stack', 'mod', 'brood-box', `${CUTOUT_LOCK} Empty brood box (open top).`),
        cell('beehive-stack', 'mod', 'honey-super', `${CUTOUT_LOCK} Shallower honey super box.`),
        cell('beehive-stack', 'mod', 'hive-lid', `${CUTOUT_LOCK} Hive lid.`),
        cell('beehive-stack', 'mod', 'hive-base', `${CUTOUT_LOCK} Hive floor/base board.`),
        cell('beehive-stack', 'mod', 'frame-empty', `${CUTOUT_LOCK} Empty wooden frame.`),
        cell('beehive-stack', 'mod', 'frame-comb', `${CUTOUT_LOCK} Frame with honeycomb (no labels).`),
        cell('beehive-stack', 'conn', 'stack-rabbet', `${CUTOUT_LOCK} Stacking rabbet/edge that shows how boxes abut (board-scale).`),
        cell('beehive-stack', 'conn', 'entrance-reducer', `${CUTOUT_LOCK} Entrance reducer bar.`),
        cell('beehive-stack', 'mod', 'stand-legs', `${CUTOUT_LOCK} Hive stand with legs.`),
      ]),
      sh('S3', 'beehive tokens 3x3', 'black-contact-3x3', [
        cell('beehive-stack', 'tok', 'bee', `${CUTOUT_LOCK} Single friendly bee still-life.`),
        cell('beehive-stack', 'tok', 'bee-cluster', `${CUTOUT_LOCK} Small bee cluster token.`),
        cell('beehive-stack', 'tok', 'queen-bee', `${CUTOUT_LOCK} Distinct queen bee (larger abdomen), still-life.`),
        cell('beehive-stack', 'tok', 'honey-jar', `${CUTOUT_LOCK} Honey jar blank (no label text).`),
        cell('beehive-stack', 'tok', 'smoker', `${CUTOUT_LOCK} Bee smoker tool.`),
        cell('beehive-stack', 'tok', 'brush', `${CUTOUT_LOCK} Soft bee brush.`),
        cell('beehive-stack', 'tok', 'flower', `${CUTOUT_LOCK} Flower token.`),
        cell('beehive-stack', 'tok', 'pollen', `${CUTOUT_LOCK} Pollen pellet clump.`),
        cell('beehive-stack', 'tok', 'veil-hat', `${CUTOUT_LOCK} Beekeeper veil hat (object only, no person).`),
      ]),
      sh('S4', 'beehive problem overlays 3x3', 'black-contact-3x3', [
        cell('beehive-stack', 'prob', 'cracked-frame', `${CUTOUT_LOCK} Cracked broken frame.`),
        cell('beehive-stack', 'prob', 'swarm-cloud', `${CUTOUT_LOCK} Swarm cloud overlay.`),
        cell('beehive-stack', 'prob', 'tilted-stack', `${CUTOUT_LOCK} Tilted unstable box stack.`),
        cell('beehive-stack', 'prob', 'missing-lid', `${CUTOUT_LOCK} Open hive without lid (absence).`),
        cell('beehive-stack', 'prob', 'wax-spill', `${CUTOUT_LOCK} Wax drip spill.`),
        cell('beehive-stack', 'prob', 'wet-comb', `${CUTOUT_LOCK} Water-damaged comb.`),
        cell('beehive-stack', 'prob', 'ant-trail', `${CUTOUT_LOCK} Ant trail problem marks.`),
        cell('beehive-stack', 'prob', 'repair-brace', `${CUTOUT_LOCK} Wooden repair brace (board-scale).`),
        cell('beehive-stack', 'prob', 'smoke-puff', `${CUTOUT_LOCK} Smoke puff overlay.`),
      ]),
    ],
  ),
  'harbor-berth': kitWave(
    'harbor-berth',
    'BW harbor-berth — slip / load apron kit',
    'Berth boats; load crates',
    'Marina stage exists; berth-slip modules do not',
    [
      sh('S1', 'harbor quay base', 'full-page-base', [
        cell('harbor-berth', 'base', 'quay', `${BASE_LOCK} Empty harbor quay with open water slips along one edge and wide dock apron play band. NO boats fused. NO people. NO text.`),
      ]),
      sh('S2', 'harbor modules + connectors 3x3', 'black-contact-3x3', [
        cell('harbor-berth', 'mod', 'slip-empty', `${CUTOUT_LOCK} Empty boat slip / berth pocket.`),
        cell('harbor-berth', 'mod', 'pier-finger', `${CUTOUT_LOCK} Finger pier module.`),
        cell('harbor-berth', 'mod', 'dock-plate', `${CUTOUT_LOCK} Dock apron plate.`),
        cell('harbor-berth', 'mod', 'ramp', `${CUTOUT_LOCK} Loading ramp to water.`),
        cell('harbor-berth', 'conn', 'bollard', `${CUTOUT_LOCK} Mooring bollard connector.`),
        cell('harbor-berth', 'conn', 'cleat', `${CUTOUT_LOCK} Deck cleat (board-scale).`),
        cell('harbor-berth', 'conn', 'rope-line', `${CUTOUT_LOCK} Mooring line segment.`),
        cell('harbor-berth', 'mod', 'crane-arm', `${CUTOUT_LOCK} Simple dock crane arm (no logos).`),
        cell('harbor-berth', 'mod', 'fender', `${CUTOUT_LOCK} Dock fender bumper.`),
      ]),
      sh('S3', 'harbor tokens 3x3', 'black-contact-3x3', [
        cell('harbor-berth', 'tok', 'sailboat', `${CUTOUT_LOCK} Simple sailboat.`),
        cell('harbor-berth', 'tok', 'motorboat', `${CUTOUT_LOCK} Small motorboat.`),
        cell('harbor-berth', 'tok', 'fishing-boat', `${CUTOUT_LOCK} Fishing boat blank.`),
        cell('harbor-berth', 'tok', 'crate', `${CUTOUT_LOCK} Cargo crate.`),
        cell('harbor-berth', 'tok', 'barrel', `${CUTOUT_LOCK} Barrel blank.`),
        cell('harbor-berth', 'tok', 'net', `${CUTOUT_LOCK} Fishing net heap.`),
        cell('harbor-berth', 'tok', 'fish-box', `${CUTOUT_LOCK} Fish box (no text).`),
        cell('harbor-berth', 'tok', 'seagull', `${CUTOUT_LOCK} Seagull still-life.`),
        cell('harbor-berth', 'tok', 'life-vest', `${CUTOUT_LOCK} Life vest blank.`),
      ]),
      sh('S4', 'harbor problem overlays 3x3', 'black-contact-3x3', [
        cell('harbor-berth', 'prob', 'oil-spill', `${CUTOUT_LOCK} Oil spill patch on water.`),
        cell('harbor-berth', 'prob', 'loose-line', `${CUTOUT_LOCK} Loose dangling line.`),
        cell('harbor-berth', 'prob', 'tilted-crate', `${CUTOUT_LOCK} Tilted falling crate.`),
        cell('harbor-berth', 'prob', 'broken-fender', `${CUTOUT_LOCK} Broken fender.`),
        cell('harbor-berth', 'prob', 'empty-slip', `${CUTOUT_LOCK} Marked empty slip absence.`),
        cell('harbor-berth', 'prob', 'flooded-apron', `${CUTOUT_LOCK} Flooded dock apron water.`),
        cell('harbor-berth', 'prob', 'tangled-net', `${CUTOUT_LOCK} Tangled net problem.`),
        cell('harbor-berth', 'prob', 'repair-plank', `${CUTOUT_LOCK} Repair plank patch.`),
        cell('harbor-berth', 'prob', 'storm-wave', `${CUTOUT_LOCK} Storm wave splash overlay.`),
      ]),
    ],
  ),
  'bakery-line': kitWave(
    'bakery-line',
    'BW bakery-line — production counter kit',
    'Sequence dough→tray→oven→cool',
    'Bakery shop stage exists; production-line modules do not',
    [
      sh('S1', 'bakery line base', 'full-page-base', [
        cell('bakery-line', 'base', 'kitchen-line', `${BASE_LOCK} Empty bakery production line: long counters left→right with oven alcove and cooling rack silhouette at edges, open floor band. NO bread fused. NO people. NO text.`),
      ]),
      sh('S2', 'bakery modules + connectors 3x3', 'black-contact-3x3', [
        cell('bakery-line', 'mod', 'prep-counter', `${CUTOUT_LOCK} Prep counter module.`),
        cell('bakery-line', 'mod', 'flour-bin', `${CUTOUT_LOCK} Open flour bin.`),
        cell('bakery-line', 'mod', 'oven', `${CUTOUT_LOCK} Bakery oven (blank dials, no numbers).`),
        cell('bakery-line', 'mod', 'cooling-rack', `${CUTOUT_LOCK} Cooling rack empty.`),
        cell('bakery-line', 'mod', 'proofing-shelf', `${CUTOUT_LOCK} Proofing shelf.`),
        cell('bakery-line', 'conn', 'counter-join', `${CUTOUT_LOCK} Counter join plate (board-scale).`),
        cell('bakery-line', 'conn', 'tray-rails', `${CUTOUT_LOCK} Tray rail guides.`),
        cell('bakery-line', 'mod', 'sink', `${CUTOUT_LOCK} Kitchen sink module.`),
        cell('bakery-line', 'mod', 'display-case', `${CUTOUT_LOCK} Empty glass display case.`),
      ]),
      sh('S3', 'bakery tokens 3x3', 'black-contact-3x3', [
        cell('bakery-line', 'tok', 'dough-ball', `${CUTOUT_LOCK} Dough ball.`),
        cell('bakery-line', 'tok', 'dough-rolled', `${CUTOUT_LOCK} Rolled dough sheet.`),
        cell('bakery-line', 'tok', 'loaf-raw', `${CUTOUT_LOCK} Unbaked loaf shape.`),
        cell('bakery-line', 'tok', 'loaf-baked', `${CUTOUT_LOCK} Baked loaf.`),
        cell('bakery-line', 'tok', 'baguette', `${CUTOUT_LOCK} Baguette.`),
        cell('bakery-line', 'tok', 'croissant', `${CUTOUT_LOCK} Croissant.`),
        cell('bakery-line', 'tok', 'tray', `${CUTOUT_LOCK} Baking tray empty.`),
        cell('bakery-line', 'tok', 'rolling-pin', `${CUTOUT_LOCK} Rolling pin.`),
        cell('bakery-line', 'tok', 'oven-mitt', `${CUTOUT_LOCK} Oven mitt.`),
      ]),
      sh('S4', 'bakery problem overlays 3x3', 'black-contact-3x3', [
        cell('bakery-line', 'prob', 'flour-spill', `${CUTOUT_LOCK} Flour spill cloud.`),
        cell('bakery-line', 'prob', 'burnt-loaf', `${CUTOUT_LOCK} Burnt loaf problem.`),
        cell('bakery-line', 'prob', 'collapsed-dough', `${CUTOUT_LOCK} Collapsed dough.`),
        cell('bakery-line', 'prob', 'smoke-oven', `${CUTOUT_LOCK} Oven smoke.`),
        cell('bakery-line', 'prob', 'empty-tray', `${CUTOUT_LOCK} Empty tray absence.`),
        cell('bakery-line', 'prob', 'sticky-mess', `${CUTOUT_LOCK} Sticky dough mess.`),
        cell('bakery-line', 'prob', 'broken-tray', `${CUTOUT_LOCK} Bent broken tray.`),
        cell('bakery-line', 'prob', 'repair-towel', `${CUTOUT_LOCK} Clean-up towel repair token.`),
        cell('bakery-line', 'prob', 'water-drip', `${CUTOUT_LOCK} Water drip from sink.`),
      ]),
    ],
  ),
  'market-stall': kitWave(
    'market-stall',
    'BW market-stall — awning arcade kit',
    'Stock stalls under awnings',
    'Marketplace stage is a place wash; stall atoms missing',
    [
      sh('S1', 'market arcade base', 'full-page-base', [
        cell('market-stall', 'base', 'arcade', `${BASE_LOCK} Empty outdoor market arcade: paved lane center, stall footprints along sides, open play band. NO produce fused. NO people. NO text/prices.`),
      ]),
      sh('S2', 'market modules + connectors 3x3', 'black-contact-3x3', [
        cell('market-stall', 'mod', 'stall-shell', `${CUTOUT_LOCK} Empty stall shell with counter.`),
        cell('market-stall', 'mod', 'awning', `${CUTOUT_LOCK} Striped awning (no text).`),
        cell('market-stall', 'mod', 'crate-stack', `${CUTOUT_LOCK} Empty crate stack module.`),
        cell('market-stall', 'mod', 'scale-blank', `${CUTOUT_LOCK} Balance scale blank (no numbers).`),
        cell('market-stall', 'conn', 'awning-pole', `${CUTOUT_LOCK} Awning pole connector.`),
        cell('market-stall', 'conn', 'stall-join', `${CUTOUT_LOCK} Stall side join panel.`),
        cell('market-stall', 'mod', 'shelf-riser', `${CUTOUT_LOCK} Produce shelf riser empty.`),
        cell('market-stall', 'mod', 'basket-bin', `${CUTOUT_LOCK} Large basket bin empty.`),
        cell('market-stall', 'mod', 'bench', `${CUTOUT_LOCK} Simple bench.`),
      ]),
      sh('S3', 'market tokens 3x3', 'black-contact-3x3', [
        cell('market-stall', 'tok', 'apples', `${CUTOUT_LOCK} Apple pile.`),
        cell('market-stall', 'tok', 'carrots', `${CUTOUT_LOCK} Carrot bunch.`),
        cell('market-stall', 'tok', 'bread', `${CUTOUT_LOCK} Bread loaves.`),
        cell('market-stall', 'tok', 'fish', `${CUTOUT_LOCK} Fresh fish still-life.`),
        cell('market-stall', 'tok', 'flowers', `${CUTOUT_LOCK} Flower bunch.`),
        cell('market-stall', 'tok', 'eggs', `${CUTOUT_LOCK} Egg carton blank.`),
        cell('market-stall', 'tok', 'cheese', `${CUTOUT_LOCK} Cheese wheel blank.`),
        cell('market-stall', 'tok', 'bag', `${CUTOUT_LOCK} Shopping bag blank.`),
        cell('market-stall', 'tok', 'coin-pouch', `${CUTOUT_LOCK} Coin pouch (no currency marks).`),
      ]),
      sh('S4', 'market problem overlays 3x3', 'black-contact-3x3', [
        cell('market-stall', 'prob', 'empty-stall', `${CUTOUT_LOCK} Bare empty stall counter.`),
        cell('market-stall', 'prob', 'fallen-awning', `${CUTOUT_LOCK} Collapsed awning.`),
        cell('market-stall', 'prob', 'spilled-apples', `${CUTOUT_LOCK} Spilled apples.`),
        cell('market-stall', 'prob', 'broken-crate', `${CUTOUT_LOCK} Broken crate.`),
        cell('market-stall', 'prob', 'puddle', `${CUTOUT_LOCK} Rain puddle on lane.`),
        cell('market-stall', 'prob', 'wilting', `${CUTOUT_LOCK} Wilting produce problem.`),
        cell('market-stall', 'prob', 'missing-scale', `${CUTOUT_LOCK} Empty scale footprint absence.`),
        cell('market-stall', 'prob', 'repair-rope', `${CUTOUT_LOCK} Repair rope for awning.`),
        cell('market-stall', 'prob', 'wind-gust', `${CUTOUT_LOCK} Wind gust overlay lines.`),
      ]),
    ],
  ),
  'theatre-wings': kitWave(
    'theatre-wings',
    'BW theatre-wings — stage + flat kit',
    'Dress empty stage with flats/props',
    'Theater setting is empty hall; wing kit missing',
    [
      sh('S1', 'theatre stage base', 'full-page-base', [
        cell('theatre-wings', 'base', 'stage', `${BASE_LOCK} Empty proscenium stage: boards floor, wing pockets L/R, curtain track hint at top, open play band. NO actors. NO text.`),
      ]),
      sh('S2', 'theatre modules + connectors 3x3', 'black-contact-3x3', [
        cell('theatre-wings', 'mod', 'flat-plain', `${CUTOUT_LOCK} Plain scenic flat panel.`),
        cell('theatre-wings', 'mod', 'flat-tree', `${CUTOUT_LOCK} Tree scenic flat (simple).`),
        cell('theatre-wings', 'mod', 'flat-house', `${CUTOUT_LOCK} House scenic flat.`),
        cell('theatre-wings', 'mod', 'curtain-leg', `${CUTOUT_LOCK} Side curtain leg.`),
        cell('theatre-wings', 'mod', 'backdrop', `${CUTOUT_LOCK} Soft backdrop wash panel.`),
        cell('theatre-wings', 'conn', 'flat-brace', `${CUTOUT_LOCK} Flat brace stand (board-scale).`),
        cell('theatre-wings', 'conn', 'track-clip', `${CUTOUT_LOCK} Curtain track clip (large, not a micro fastener).`),
        cell('theatre-wings', 'mod', 'spotlight', `${CUTOUT_LOCK} Stage spotlight fixture.`),
        cell('theatre-wings', 'mod', 'prop-table', `${CUTOUT_LOCK} Empty prop table.`),
      ]),
      sh('S3', 'theatre tokens 3x3', 'black-contact-3x3', [
        cell('theatre-wings', 'tok', 'chair', `${CUTOUT_LOCK} Stage chair.`),
        cell('theatre-wings', 'tok', 'trunk', `${CUTOUT_LOCK} Prop trunk.`),
        cell('theatre-wings', 'tok', 'hat', `${CUTOUT_LOCK} Costume hat.`),
        cell('theatre-wings', 'tok', 'mask', `${CUTOUT_LOCK} Simple mask (no brand).`),
        cell('theatre-wings', 'tok', 'sword-prop', `${CUTOUT_LOCK} Soft prop sword.`),
        cell('theatre-wings', 'tok', 'flower-bouquet', `${CUTOUT_LOCK} Bouquet.`),
        cell('theatre-wings', 'tok', 'script-blank', `${CUTOUT_LOCK} Blank script booklet (NO text).`),
        cell('theatre-wings', 'tok', 'lantern', `${CUTOUT_LOCK} Prop lantern.`),
        cell('theatre-wings', 'tok', 'drum', `${CUTOUT_LOCK} Small drum.`),
      ]),
      sh('S4', 'theatre problem overlays 3x3', 'black-contact-3x3', [
        cell('theatre-wings', 'prob', 'wrong-curtain', `${CUTOUT_LOCK} Twisted wrong curtain.`),
        cell('theatre-wings', 'prob', 'fallen-flat', `${CUTOUT_LOCK} Fallen tipped flat.`),
        cell('theatre-wings', 'prob', 'missing-prop', `${CUTOUT_LOCK} Empty prop outline absence.`),
        cell('theatre-wings', 'prob', 'ripped-backdrop', `${CUTOUT_LOCK} Ripped backdrop.`),
        cell('theatre-wings', 'prob', 'dark-spot', `${CUTOUT_LOCK} Dark unlit spot overlay.`),
        cell('theatre-wings', 'prob', 'cable-tangle', `${CUTOUT_LOCK} Tangled cable (board-scale).`),
        cell('theatre-wings', 'prob', 'broken-brace', `${CUTOUT_LOCK} Broken brace.`),
        cell('theatre-wings', 'prob', 'repair-tape', `${CUTOUT_LOCK} Large repair tape strip.`),
        cell('theatre-wings', 'prob', 'smoke-effect', `${CUTOUT_LOCK} Stage smoke puff.`),
      ]),
    ],
  ),
  'camping-pitch': kitWave(
    'camping-pitch',
    'BW camping-pitch — tent pad kit',
    'Pitch tent + ring + trail markers',
    'Forest/camp settings exist; pitch kit missing',
    [
      sh('S1', 'camping clearing base', 'full-page-base', [
        cell('camping-pitch', 'base', 'clearing', `${BASE_LOCK} Empty forest clearing campsite: flat tent pads, fire-ring footprint, trail edge, open play band. NO tents fused. NO people. NO text.`),
      ]),
      sh('S2', 'camping modules + connectors 3x3', 'black-contact-3x3', [
        cell('camping-pitch', 'mod', 'tent-shell', `${CUTOUT_LOCK} Empty tent shell (door open).`),
        cell('camping-pitch', 'mod', 'tent-pad', `${CUTOUT_LOCK} Ground tent pad rectangle.`),
        cell('camping-pitch', 'mod', 'fire-ring', `${CUTOUT_LOCK} Stone fire ring empty.`),
        cell('camping-pitch', 'mod', 'picnic-table', `${CUTOUT_LOCK} Picnic table.`),
        cell('camping-pitch', 'conn', 'guyline', `${CUTOUT_LOCK} Guyline rope with stake (board-scale stake, not a nail).`),
        cell('camping-pitch', 'conn', 'peg', `${CUTOUT_LOCK} Large tent peg.`),
        cell('camping-pitch', 'mod', 'trail-marker', `${CUTOUT_LOCK} Trail marker post (blank, no letters).`),
        cell('camping-pitch', 'mod', 'log-bench', `${CUTOUT_LOCK} Log bench.`),
        cell('camping-pitch', 'mod', 'clothesline', `${CUTOUT_LOCK} Clothesline between posts empty.`),
      ]),
      sh('S3', 'camping tokens 3x3', 'black-contact-3x3', [
        cell('camping-pitch', 'tok', 'backpack', `${CUTOUT_LOCK} Hiking backpack.`),
        cell('camping-pitch', 'tok', 'sleeping-bag', `${CUTOUT_LOCK} Sleeping bag rolled.`),
        cell('camping-pitch', 'tok', 'lantern', `${CUTOUT_LOCK} Camp lantern.`),
        cell('camping-pitch', 'tok', 'kettle', `${CUTOUT_LOCK} Camp kettle.`),
        cell('camping-pitch', 'tok', 'marshmallow-stick', `${CUTOUT_LOCK} Stick with marshmallow.`),
        cell('camping-pitch', 'tok', 'cooler', `${CUTOUT_LOCK} Cooler blank.`),
        cell('camping-pitch', 'tok', 'map-blank', `${CUTOUT_LOCK} Folded blank map (NO text/roads labels).`),
        cell('camping-pitch', 'tok', 'binoculars', `${CUTOUT_LOCK} Binoculars.`),
        cell('camping-pitch', 'tok', 'raccoon', `${CUTOUT_LOCK} Raccoon still-life.`),
      ]),
      sh('S4', 'camping problem overlays 3x3', 'black-contact-3x3', [
        cell('camping-pitch', 'prob', 'fallen-tent', `${CUTOUT_LOCK} Collapsed tent.`),
        cell('camping-pitch', 'prob', 'rain-puddle', `${CUTOUT_LOCK} Rain puddle on pad.`),
        cell('camping-pitch', 'prob', 'smoke-wrong', `${CUTOUT_LOCK} Smoky fire problem.`),
        cell('camping-pitch', 'prob', 'loose-guyline', `${CUTOUT_LOCK} Loose flapping guyline.`),
        cell('camping-pitch', 'prob', 'missing-peg', `${CUTOUT_LOCK} Empty peg hole absence.`),
        cell('camping-pitch', 'prob', 'torn-fly', `${CUTOUT_LOCK} Torn rainfly.`),
        cell('camping-pitch', 'prob', 'ant-trail', `${CUTOUT_LOCK} Ant trail to cooler.`),
        cell('camping-pitch', 'prob', 'repair-patch', `${CUTOUT_LOCK} Fabric repair patch.`),
        cell('camping-pitch', 'prob', 'wind-gust', `${CUTOUT_LOCK} Wind gust overlay.`),
      ]),
    ],
  ),
};

/** Stream A owns ranks 1–4. Stream B (`request-builder-worlds-b.mjs`) owns 5–8. */
export const WAVE_ORDER = [
  'canal-lock',
  'kaiten-belt',
  'beehive-stack',
  'harbor-berth',
];

/** Kept in WAVES for reference / --doc; not fired by stream A. */
export const STREAM_B_WAVES = [
  'bakery-line',
  'market-stall',
  'theatre-wings',
  'camping-pitch',
];

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function walkRunJsons(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkRunJsons(p, acc);
    else if (ent.name === 'run.json') acc.push(p);
  }
  return acc;
}

function otherInFlight(thisWaveId) {
  for (const runPath of walkRunJsons(STOCKPILE)) {
    let prev;
    try {
      prev = JSON.parse(fs.readFileSync(runPath, 'utf8'));
    } catch {
      continue;
    }
    if (prev.task_id && !prev.finished_at && prev.wave !== thisWaveId) {
      return { wave: prev.wave, task_id: prev.task_id };
    }
  }
  return null;
}

function waveOutDir(wave) {
  return path.join(STOCKPILE, wave.id);
}

function expectedSheets(wave) {
  return wave.sheets.length;
}

function sheetBlock(sheet) {
  const lines = sheet.cells.map((c, i) => `${i + 1}. ${c.key} — ${c.brief}`);
  if (sheet.format === 'full-page-base') {
    return `SHEET ${sheet.id} — ${sheet.title}
Format: ONE full-page landscape PNG (NOT a contact grid). ~16:9 play base.
${lines.join('\n')}`;
  }
  return `SHEET ${sheet.id} — ${sheet.title}
Format: ONE landscape PNG black-field contact sheet, 3×3 grid, LARGE BOARD-SCALE cells (not icons).
Reading order L→R, T→B:
${lines.join('\n')}`;
}

function buildBrief(wave) {
  return withEslAssetGeneratorBrief(`TASK: Produce **${wave.sheets.length}** PNG sheet(s) for builder-world modular kit stockpile.

${STYLE}

KIT: ${wave.family_id}
Play pattern: ${wave.play_pattern}
Why novel: ${wave.why_novel}

HARD RULES:
- Generate ONLY the listed cells/sheets. No extra concepts.
- NO people / faces as subjects (animal still-life tokens ok where listed).
- NO baked readable text / logos.
- NO tiny fasteners.
- Modules/connectors/tokens/problems = black-field cutouts.
- Base = full-page empty play floor.
- quality: default ONLY.
- Keep generating inside THIS task until every listed PNG exists.

${wave.sheets.map((sh) => sheetBlock(sh)).join('\n\n')}

Return exactly ${wave.sheets.length} PNG sheet(s).`);
}

function collectImageAtts(messages) {
  const hits = [];
  for (const m of messages || []) {
    const b = m.assistant_message || (m.type === 'assistant_message' ? m : null);
    if (!b) continue;
    for (const a of b.attachments || []) {
      const url = a.url || a.download_url || a.file_url;
      const name = a.file_name || a.filename || a.name || 'sheet.png';
      const mime = String(a.mime_type || a.content_type || '');
      if (url && (/png|jpeg|jpg|webp|zip/i.test(mime) || /\.(png|jpe?g|webp|zip)$/i.test(name) || !mime)) {
        hits.push({ name, url, mime });
      }
    }
  }
  return hits;
}

function sniffKind(buf, name) {
  if (buf[0] === 0x50 && buf[1] === 0x4b) return 'zip';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (/\.zip$/i.test(name)) return 'zip';
  if (/\.jpe?g$/i.test(name)) return 'jpg';
  return 'png';
}

function safeName(name, fallback) {
  const base = path.basename(String(name || fallback)).replace(/[^\w.\-]+/g, '_');
  return base || fallback;
}

function extractZip(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const r = spawnSync('tar', ['-xf', zipPath, '-C', destDir], { encoding: 'utf8' });
  if (r.status !== 0) {
    const r2 = spawnSync(
      'powershell',
      ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${destDir}' -Force`],
      { encoding: 'utf8' },
    );
    if (r2.status !== 0) throw new Error(`unzip failed ${zipPath}: ${r.stderr || r2.stderr}`);
  }
}

function walkPngs(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkPngs(p, acc);
    else if (/\.(png|jpe?g|webp)$/i.test(ent.name)) acc.push(p);
  }
  return acc;
}

function clearNumberedSheets(sheetDir) {
  if (!fs.existsSync(sheetDir)) return;
  for (const f of fs.readdirSync(sheetDir)) {
    if (/^\d{2}\.(png|jpg|jpeg|webp)$/i.test(f)) fs.unlinkSync(path.join(sheetDir, f));
  }
}

function materializePngs(sheetDir) {
  const rawDir = path.join(sheetDir, 'raw');
  const unzipRoot = path.join(sheetDir, 'zip-extract');
  const byName = new Map();
  for (const p of [...walkPngs(unzipRoot), ...walkPngs(rawDir)]) {
    const key = path.basename(p).toLowerCase();
    if (!byName.has(key)) byName.set(key, p);
  }
  const sorted = [...byName.values()].sort((a, b) => path.basename(a).localeCompare(path.basename(b), 'en'));
  clearNumberedSheets(sheetDir);
  const saved = [];
  sorted.forEach((src, i) => {
    const file = `${String(i + 1).padStart(2, '0')}.png`;
    const dest = path.join(sheetDir, file);
    fs.copyFileSync(src, dest);
    saved.push({ dest, bytes: fs.statSync(dest).size, name: path.basename(src), file });
  });
  return saved;
}

async function downloadSheets(messages, sheetDir) {
  fs.mkdirSync(sheetDir, { recursive: true });
  const rawDir = path.join(sheetDir, 'raw');
  const unzipRoot = path.join(sheetDir, 'zip-extract');
  fs.mkdirSync(rawDir, { recursive: true });
  if (fs.existsSync(unzipRoot)) fs.rmSync(unzipRoot, { recursive: true, force: true });
  fs.mkdirSync(unzipRoot, { recursive: true });

  const seen = new Set();
  let i = 0;
  let zipN = 0;
  for (const img of collectImageAtts(messages)) {
    if (!img.url || seen.has(img.url)) continue;
    seen.add(img.url);
    i += 1;
    const res = await fetch(img.url);
    if (!res.ok) throw new Error(`download ${res.status} ${img.url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const kind = sniffKind(buf, img.name);
    const fallback = `${String(i).padStart(2, '0')}.${kind === 'zip' ? 'zip' : kind === 'jpg' ? 'jpg' : 'png'}`;
    const dest = path.join(rawDir, safeName(img.name, fallback));
    fs.writeFileSync(dest, buf);
    if (kind === 'zip') {
      zipN += 1;
      extractZip(dest, path.join(unzipRoot, `z${zipN}`));
    }
  }
  return materializePngs(sheetDir);
}

async function withInvLock(fn) {
  fs.mkdirSync(STOCKPILE, { recursive: true });
  for (let i = 0; i < 80; i += 1) {
    try {
      fs.writeFileSync(LOCK, String(process.pid), { flag: 'wx' });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 80));
    }
    if (i === 79) fs.rmSync(LOCK, { force: true });
  }
  try {
    return fn();
  } finally {
    fs.rmSync(LOCK, { force: true });
  }
}

async function withRateBackoff(fn) {
  try {
    return await fn();
  } catch (err) {
    const msg = String(err && err.message || err);
    if (!/429|rate/i.test(msg)) throw err;
    console.error(JSON.stringify({ phase: 'rate-wait', ms: RATE_WAIT_MS, err: msg }));
    await new Promise((r) => setTimeout(r, RATE_WAIT_MS));
    return fn();
  }
}

function emptyInv() {
  return {
    kind: 'builder-worlds',
    prefix: PREFIX,
    estate_audit: ESTATE_AUDIT,
    skipped_as_deep: SKIPPED_AS_DEEP,
    waves: {},
    families: {},
    running_total: {},
  };
}

function loadInv() {
  const invPath = path.join(ROOT, INV_REL);
  if (!fs.existsSync(invPath)) return emptyInv();
  return JSON.parse(fs.readFileSync(invPath, 'utf8'));
}

function recomputeTotals(inv) {
  const waves = Object.values(inv.waves || {});
  const fams = Object.values(inv.families || {});
  inv.running_total = {
    tasks: waves.filter((w) => w.task_id).length,
    sheets_downloaded: waves.reduce((n, w) => n + (w.sheets || []).length, 0),
    kits_planned: WAVE_ORDER.length,
    kits_done: waves.filter((w) => w.finished_at && (w.sheets || []).length >= (w.expected_sheets || 1)).length,
    asset_cells: waves.reduce((n, w) => n + (w.cell_count || 0), 0),
    novelty_pct: 100,
    zoo_amusement_route_share_pct: 0,
  };
  inv.families_count = fams.length;
}

function writeInv(inv) {
  inv.updated_at = new Date().toISOString();
  if (!inv.waves) inv.waves = {};
  if (!inv.families) inv.families = {};
  recomputeTotals(inv);
  fs.mkdirSync(STOCKPILE, { recursive: true });
  fs.mkdirSync(path.dirname(path.join(ROOT, INV_REL)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, INV_REL), JSON.stringify(inv, null, 2));
  return path.join(ROOT, INV_REL);
}

function upsertInventory(wave, dump) {
  const inv = loadInv();
  const siblings = wave.sheets.flatMap((sh) => sh.cells.map((c) => c.key));
  const haveLarge = (dump.saved || []).filter((x) => x.bytes > 80_000).length >= expectedSheets(wave);
  inv.waves[wave.id] = {
    family_id: wave.family_id,
    title: wave.title,
    play_pattern: wave.play_pattern,
    task_id: dump.task_id || null,
    task_url: dump.task_url || null,
    agent_status: dump.agent_status || null,
    sheet_dir: dump.sheet_dir || null,
    expected_sheets: expectedSheets(wave),
    cell_count: siblings.length,
    sheets: (dump.saved || []).map((x) => ({ file: x.file || path.basename(x.dest || ''), bytes: x.bytes, name: x.name || null })),
    finished_at: dump.finished_at || null,
    holds: dump.holds || [],
  };
  const prev = inv.families[wave.family_id] || {};
  inv.families[wave.family_id] = {
    family_id: wave.family_id,
    wave: wave.id,
    play_pattern: wave.play_pattern,
    why_novel: wave.why_novel,
    siblings,
    manus_task_id: dump.task_id || prev.manus_task_id || null,
    task_url: dump.task_url || prev.task_url || null,
    sheet_dir: dump.sheet_dir || prev.sheet_dir || null,
    status: haveLarge ? 'generated_raw' : dump.task_id ? 'fired' : 'pending',
    qa: prev.qa || '',
  };
  return writeInv(inv);
}

function appendLog(line) {
  const p = path.join(ROOT, TRACKED_DOC_REL);
  const stamp = new Date().toISOString();
  const block = `- ${stamp} — ${line}\n`;
  if (!fs.existsSync(p)) {
    fs.writeFileSync(
      p,
      `# Builder-worlds manufacture log\n\nStockpile only. Art → \`${STOCKPILE_REL}/\` (do not git-add PNG).\n\n## Events\n\n${block}`,
    );
  } else {
    fs.appendFileSync(p, block);
  }
}

function writeDocStub(inv) {
  const tot = inv.running_total || {};
  const lines = [
    '# Builder-worlds manufacture log (STREAM A)',
    '',
    'Stockpile only. No producer wiring. Prefix `bw-`. Stream A = ranks 1–4.',
    'Stream B owns bakery/market/theatre/camping — see `docs/builder-worlds-b-log.md`.',
    `Art: \`${STOCKPILE_REL}/\` (PNG — **do not git-add**).`,
    'Tracked: `scripts/manus/request-builder-worlds.mjs`, `docs/builder-worlds-portfolio.md`, inventory JSON, this log.',
    '',
    '## Novelty',
    '',
    `- Selected portfolio (A+B): **8** families; prompt-named in selected: **0** → novelty **${tot.novelty_pct || 100}%**`,
    `- Zoo + amusement + route share: **${tot.zoo_amusement_route_share_pct || 0}%**`,
    '',
    '## Running totals (Stream A)',
    '',
    '| Metric | Count |',
    '|---|---:|',
    `| Kits planned (A) | ${tot.kits_planned || WAVE_ORDER.length} |`,
    `| Tasks | ${tot.tasks || 0} |`,
    `| Sheets downloaded | ${tot.sheets_downloaded || 0} |`,
    `| Kits done | ${tot.kits_done || 0} |`,
    `| Asset cells | ${tot.asset_cells || 0} |`,
    '',
    '## Skipped-as-deep',
    '',
    ...SKIPPED_AS_DEEP.map((s) => `- ${s}`),
    '',
    '## Waves (Stream A)',
    '',
  ];
  for (const id of WAVE_ORDER) {
    const meta = WAVES[id];
    const fam = (inv.families || {})[meta.family_id];
    const w = (inv.waves || {})[id];
    const status = (fam && fam.status) || 'unfired';
    const url = (w && w.task_url) || (fam && fam.task_url) || 'unfired';
    const cells = meta.sheets.reduce((n, sh) => n + sh.cells.length, 0);
    const sheets = expectedSheets(meta);
    lines.push(`- **${id}** \`${meta.family_id}\` — ${status} — ${url} — ${sheets} sheets / ${cells} cells — ${meta.play_pattern}`);
  }
  lines.push(
    '',
    '## Stream B (owned elsewhere)',
    '',
    ...STREAM_B_WAVES.map((id) => `- **${id}** — see \`request-builder-worlds-b.mjs\``),
    '',
    '## Events',
    '',
  );
  const existing = fs.existsSync(path.join(ROOT, TRACKED_DOC_REL))
    ? fs.readFileSync(path.join(ROOT, TRACKED_DOC_REL), 'utf8')
    : '';
  const eventMatch = existing.match(/## Events\n\n([\s\S]*)$/);
  const events = eventMatch ? eventMatch[1].trim() : '_none yet_';
  lines.push(events || '_none yet_');
  lines.push('');
  fs.writeFileSync(path.join(ROOT, TRACKED_DOC_REL), `${lines.join('\n')}\n`);
}

function waveIsDone(wave) {
  const runPath = path.join(waveOutDir(wave), 'run.json');
  if (!fs.existsSync(runPath)) return false;
  try {
    const prev = JSON.parse(fs.readFileSync(runPath, 'utf8'));
    const large = (prev.saved || []).filter((x) => x.bytes > 80_000).length;
    return Boolean(prev.finished_at && large >= expectedSheets(wave));
  } catch {
    return false;
  }
}

function nextWaveName() {
  return WAVE_ORDER.find((id) => !waveIsDone(WAVES[id])) || null;
}

export async function runWave(waveName) {
  const wave = WAVES[waveName];
  if (!wave) throw new Error(`Need --wave=${WAVE_ORDER.join('|')}`);

  const OUT_DIR = waveOutDir(wave);
  const SHEET_DIR = path.join(OUT_DIR, 'sheets');
  const RUN_JSON = path.join(OUT_DIR, 'run.json');
  const fireOnly = process.argv.includes('--fire') || process.argv.includes('--create-only');
  const pollOnly = process.argv.includes('--poll-only');
  const NEED_SHEETS = expectedSheets(wave);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(SHEET_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, 'keys.json'),
    JSON.stringify(
      {
        wave: wave.id,
        family_id: wave.family_id,
        play_pattern: wave.play_pattern,
        why_novel: wave.why_novel,
        siblings: wave.sheets.flatMap((sh) => sh.cells.map((c) => c.key)),
        expected_sheets: NEED_SHEETS,
        sheets: wave.sheets.map((sh) => ({
          id: sh.id,
          title: sh.title,
          format: sh.format,
          keys: sh.cells.map((c) => c.key),
        })),
      },
      null,
      2,
    ),
  );

  const dump = {
    started_at: new Date().toISOString(),
    kind: 'builder-worlds',
    wave: wave.id,
    family_id: wave.family_id,
    sheet_dir: SHEET_DIR,
    expected_sheets: NEED_SHEETS,
  };

  let taskId = arg('task');

  if (!pollOnly) {
    if (fs.existsSync(RUN_JSON) && !process.env.MANUS_FORCE_RERUN) {
      const prev = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8'));
      if (prev.task_id) {
        console.error('REFUSING duplicate', prev.task_id);
        process.exit(2);
      }
    }
    const busy = otherInFlight(wave.id);
    if (busy) {
      console.error(`REFUSING fire — max 1 in-flight (builder-worlds). ${busy.wave} ${busy.task_id} still open`);
      process.exit(3);
    }
    const brief = buildBrief(wave);
    const created = await withRateBackoff(() =>
      createTask({
        title: wave.title,
        agent_profile: resolveAgentProfile(),
        force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
        interactive_mode: false,
        message: { content: [{ type: 'text', text: brief }] },
      }),
    );
    taskId = created.task_id || created.id;
    dump.task_id = taskId;
    dump.task_url = created.task_url || `https://manus.im/app/${taskId}`;
    dump.created_at = new Date().toISOString();
    dump.brief = typeof brief === 'string' ? brief.slice(0, 2000) : '';
    fs.writeFileSync(RUN_JSON, JSON.stringify(dump, null, 2));
    await withInvLock(() => {
      upsertInventory(wave, dump);
      writeDocStub(loadInv());
      appendLog(`FIRED ${wave.id} → ${dump.task_url}`);
    });
    console.log(JSON.stringify({ phase: 'created', ...dump }, null, 2));
    if (fireOnly) return dump;
  } else {
    if (!taskId && fs.existsSync(RUN_JSON)) {
      const prev = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8'));
      taskId = prev.task_id;
      dump.started_at = prev.started_at || dump.started_at;
      dump.task_url = prev.task_url;
    }
    if (!taskId) throw new Error('--poll-only needs --task= or an existing run.json');
    dump.task_id = taskId;
    dump.task_url = dump.task_url || `https://manus.im/app/${taskId}`;
  }

  const result = await pollUntilDone(taskId, {
    intervalMs: POLL_MS,
    timeoutMs: TIMEOUT_MS,
    onTick: ({ agent_status }) => {
      console.log(JSON.stringify({ phase: 'tick', task_id: taskId, agent_status: agent_status || 'unknown' }));
    },
  });
  let msgs = await listMessages(taskId, { order: 'asc', limit: 120 });
  let saved = await downloadSheets(msgs.messages || result.messages || [], SHEET_DIR);
  let large = saved.filter((x) => x.bytes > 80_000);

  if (large.length < NEED_SHEETS) {
    console.log(JSON.stringify({ phase: 'need-more-sheets', have: large.length, need: NEED_SHEETS }, null, 2));
    await withRateBackoff(() =>
      sendMessage(taskId, {
        force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
        message: withEslAssetGeneratorBrief(
          `Continue THIS task. You returned ${large.length} usable PNG sheet(s); we need exactly ${NEED_SHEETS} sheet(s) listed in the original brief. Do not restart. Do not add text. No tiny fasteners. Keep firing generate_image until every listed sheet exists.`,
        ),
      }),
    );
    const result2 = await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
    msgs = await listMessages(taskId, { order: 'asc', limit: 120 });
    saved = await downloadSheets(msgs.messages || result2.messages || [], SHEET_DIR);
    large = saved.filter((x) => x.bytes > 80_000);
  }

  dump.saved = saved;
  dump.agent_status = result && result.agent_status;
  dump.finished_at = new Date().toISOString();
  if (large.length < NEED_SHEETS) {
    dump.holds = [`Downloaded ${large.length}/${NEED_SHEETS} large PNG sheets; raw kept for mop.`];
  }
  if (fs.existsSync(RUN_JSON)) {
    const prev = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8'));
    dump.started_at = prev.started_at || dump.started_at;
    dump.created_at = prev.created_at;
    dump.task_url = dump.task_url || prev.task_url;
    dump.brief = prev.brief;
  }
  fs.writeFileSync(RUN_JSON, JSON.stringify(dump, null, 2));
  const invPath = await withInvLock(() => {
    const p = upsertInventory(wave, dump);
    writeDocStub(loadInv());
    appendLog(`DOWNLOADED ${wave.id} sheets=${saved.length} large=${large.length}/${NEED_SHEETS} → ${SHEET_DIR}`);
    return p;
  });
  console.log(JSON.stringify({
    phase: 'downloaded',
    wave: wave.id,
    family_id: wave.family_id,
    task_id: taskId,
    task_url: dump.task_url,
    count: saved.length,
    large: large.length,
    expected_sheets: NEED_SHEETS,
    sheet_dir: SHEET_DIR,
    inventory: invPath,
  }, null, 2));
  if (large.length < NEED_SHEETS) process.exitCode = 2;
  return dump;
}

const isMain = process.argv[1] && path.normalize(process.argv[1]).endsWith('request-builder-worlds.mjs');
if (isMain) {
  if (process.argv.includes('--audit-only')) {
    console.log(JSON.stringify({
      phase: 'audit',
      estate_audit: ESTATE_AUDIT,
      skipped_as_deep: SKIPPED_AS_DEEP,
      selected: WAVE_ORDER,
      novelty_pct: 100,
      zoo_amusement_route_share_pct: 0,
    }, null, 2));
    process.exit(0);
  }
  if (process.argv.includes('--doc-only')) {
    const inv = loadInv();
    writeInv(inv);
    writeDocStub(inv);
    console.log(JSON.stringify({
      phase: 'doc',
      log: TRACKED_DOC_REL,
      inventory: INV_REL,
      portfolio_md: PORTFOLIO_MD_REL,
      portfolio_json: PORTFOLIO_JSON_REL,
      waves: WAVE_ORDER.length,
    }, null, 2));
    process.exit(0);
  }
  apiKey();
  if (process.argv.includes('--loop')) {
    while (true) {
      const n = nextWaveName();
      if (!n) {
        console.log(JSON.stringify({ phase: 'all-done', waves: WAVE_ORDER.length }, null, 2));
        break;
      }
      console.log(JSON.stringify({ phase: 'loop-next', wave: n }, null, 2));
      await runWave(n);
      if (process.exitCode && process.exitCode !== 0) break;
    }
    process.exit(process.exitCode || 0);
  }
  let names = (arg('wave', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (process.argv.includes('--next')) {
    const n = nextWaveName();
    if (!n) {
      console.log(JSON.stringify({ phase: 'all-done', waves: WAVE_ORDER.length }, null, 2));
      process.exit(0);
    }
    names = [n];
  }
  if (!names.length) throw new Error(`Need --wave=${WAVE_ORDER.join('|')} or --next or --loop`);
  for (const n of names) {
    await runWave(n);
  }
}
