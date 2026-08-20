/**
 * Board-enabling K4 + K5 — residue↔object correspondence + ONE route world.
 * Stockpile only. No producer wiring.
 *
 *   node scripts/manus/request-be-k4k5.mjs --wave=k4-01 --fire
 *   node scripts/manus/request-be-k4k5.mjs --wave=k5-tiles --fire
 *   node scripts/manus/request-be-k4k5.mjs --next --fire
 *   node scripts/manus/request-be-k4k5.mjs --poll-only --wave=k4-01
 *   node scripts/manus/request-be-k4k5.mjs --grade=k5-tiles:REG_A --notes="edges join"
 *   node scripts/manus/request-be-k4k5.mjs --doc-only
 *
 * Slot: 1 of 4 global Manus (this stream max 1 in-flight across K4+K5 partitions).
 * Art: harvested/board-enabling/evidence-correspondence/  (K4)
 *      harvested/board-enabling/route-world/               (K5)
 * Tracked: this script, docs/board-enabling-k4k5.md, inventories (JSON only — no PNG git-add).
 *
 * K4: ~40 clue↔counterpart pairs. Prefer family briefs. Reuse pack counterparts where noted.
 *     Not microscopic detective clipart. Not a duplicate of aggressive-s1 crumb residue bank.
 * K5: ONE town→countryside hybrid route system. Fixed pitch/path width/projection. REG grades for tiles.
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

export const K4_REL = 'harvested/board-enabling/evidence-correspondence';
export const K5_REL = 'harvested/board-enabling/route-world';
export const TRACKED_DOC_REL = 'docs/board-enabling-k4k5.md';
export const INV_K4_REL = 'docs/board-enabling-k4-inventory.json';
export const INV_K5_REL = 'docs/board-enabling-k5-inventory.json';
export const PREFIX_K4 = 'be-k4-';
export const PREFIX_K5 = 'be-k5-';
export const BOARD = { width: 1280, height: 590 };

const K4_STOCK = path.join(ROOT, K4_REL);
const K5_STOCK = path.join(ROOT, K5_REL);
const LOCK = path.join(ROOT, 'harvested/board-enabling', '.inv-k4k5.lock');
const POLL_MS = 30_000;
const TIMEOUT_MS = 70 * 60 * 1000;
const RATE_WAIT_MS = 90_000;

const CUTOUT_LOCK = `BLACK-FIELD CUTOUT — isolated still-life on pure #000000.
Generous margin. One subject per cell. Soft children's-book / ClassIn ESL house illustration.
NO readable text, letters, numbers, logos, watermarks.
Kid-readable scale (NOT microscopic forensic dust). quality: default ONLY. STOCKPILE ONLY.`;

const STAGE_LOCK = `EDB BOARD-ENABLING STAGE — full-bleed illustrated play place.
BOARD feel: panoramic ${BOARD.width}×${BOARD.height} landscape per CELL.
Open play surface. Soft children's-book illustration. Empty of readable text/logos.
quality: default ONLY. STOCKPILE ONLY — do not wire producer.`;

const PAIR_RULE = `REGISTERED CORRESPONDENCE PAIR RULE (hard):
- Cells come in clue ↔ counterpart couples (odd then even in reading order).
- SAME illustration style, lighting, edge treatment, and relative scale within each pair.
- Clue alone should feel AMBIGUOUS; with counterpart it should feel LOGICAL.
- Do NOT redraw aggressive-s1 micro crumb/residue bank items as tiny forensic clipart.
- No people faces as subjects (pet dog ok as still-life). No brand labels.`;

const ROUTE_TILE_RULE = `REGISTERED ROUTE TILE FAMILY (hard) — be-k5-town-country:
- FIXED grid pitch (~256px conceptual tile).
- FIXED path/road width across ALL tiles.
- FIXED 3/4 bird's-eye play-world projection (NOT GIS, NOT flat orthographic map icons).
- FIXED edge bevel / grass shoulder style so tiles VISUALLY JOIN edge-to-edge.
- SAME palette: warm town paving → soft countryside verge transition vocabulary.
- Path surface continuous when adjacent tiles abut.
- No text, no shields with letters, no real-world map labels.`;

const ROUTE_WORLD_LOCK = `REGISTERED FAMILY be-k5-town-country. ONE hybrid play world: town streets morphing into countryside lanes.
Illustrated Living Map / board-game play world — NOT satellite GIS.
Consistent pitch, path width, and projection with route tiles.`;

function s(prefix, key, brief, extra = {}) {
  return { key: `${prefix}${key}`, concept: key, brief, ...extra };
}

function sh(id, title, format, cells) {
  return { id, title, format, cells };
}


/** @type {{ slug: string, clue: string, counterpart_slug: string, counterpart: string, reuse_pack: string|null }[]} */
export const PAIRS = [
  { slug: 'plate-crumbs', clue: 'cake crumbs on empty plate rim', counterpart_slug: 'cake', counterpart: 'whole cake slice on plate', reuse_pack: 'cake' },
  { slug: 'melted-ice-cream-puddle', clue: 'melted ice-cream puddle + stick', counterpart_slug: 'ice-cream', counterpart: 'ice-cream cone upright', reuse_pack: 'ice-cream' },
  { slug: 'apple-core', clue: 'eaten apple core with seeds', counterpart_slug: 'apple', counterpart: 'whole red apple', reuse_pack: 'apple' },
  { slug: 'sandwich-crumbs', clue: 'sandwich corner crumbs + napkin smear', counterpart_slug: 'sandwich', counterpart: 'whole sandwich', reuse_pack: 'sandwich' },
  { slug: 'cup-ring', clue: 'coffee/tea cup ring stain on table top (cutout)', counterpart_slug: 'cup', counterpart: 'simple cup', reuse_pack: 'cup' },
  { slug: 'banana-peel', clue: 'discarded banana peel', counterpart_slug: 'banana', counterpart: 'whole banana', reuse_pack: 'banana' },
  { slug: 'juice-spill-trail', clue: 'short juice drip trail', counterpart_slug: 'juice-box', counterpart: 'kids juice box blank', reuse_pack: null },
  { slug: 'chocolate-smear', clue: 'chocolate smear on napkin', counterpart_slug: 'chocolate-bar', counterpart: 'plain chocolate bar no brand', reuse_pack: null },
  { slug: 'muddy-paw-prints', clue: '3 muddy dog paw prints in a short trail', counterpart_slug: 'dog', counterpart: 'friendly dog standing still-life', reuse_pack: 'dog' },
  { slug: 'wet-boot-prints', clue: '2 wet boot footprints trail', counterpart_slug: 'boot', counterpart: 'rain boot', reuse_pack: 'boot' },
  { slug: 'wet-umbrella-drip', clue: 'open wet umbrella dripping + small puddle', counterpart_slug: 'umbrella', counterpart: 'open child umbrella', reuse_pack: 'umbrella' },
  { slug: 'leaf-trail-indoors', clue: 'autumn leaf trail leading inward', counterpart_slug: 'leaf', counterpart: 'single maple-ish leaf', reuse_pack: 'leaf' },
  { slug: 'sand-spill-from-shoe', clue: 'sand spilling from tipped shoe', counterpart_slug: 'shoe', counterpart: 'kid shoe', reuse_pack: 'shoe' },
  { slug: 'bike-tire-track', clue: 'narrow bicycle tire track arc', counterpart_slug: 'bicycle', counterpart: 'simple bicycle side view', reuse_pack: 'bicycle' },
  { slug: 'snow-boot-print', clue: 'deep snow boot print', counterpart_slug: 'winter-boot', counterpart: 'winter boot', reuse_pack: null },
  { slug: 'doormat-mud', clue: 'doormat with muddy scuffs', counterpart_slug: 'doormat', counterpart: 'coir doormat blank', reuse_pack: null },
  { slug: 'single-glove', clue: 'one lost glove alone', counterpart_slug: 'glove-pair', counterpart: 'matching glove pair together', reuse_pack: 'glove' },
  { slug: 'scarf-on-rail', clue: 'scarf draped on stair rail stub', counterpart_slug: 'scarf', counterpart: 'folded scarf', reuse_pack: 'scarf' },
  { slug: 'broken-shoelace', clue: 'snapped shoelace with tip', counterpart_slug: 'shoe', counterpart: 'laced shoe', reuse_pack: 'shoe' },
  { slug: 'ribbon-fragment', clue: 'torn gift ribbon fragment', counterpart_slug: 'ribbon-gift', counterpart: 'gift box with ribbon blank', reuse_pack: 'ribbon' },
  { slug: 'sock-mismatch', clue: 'one striped sock alone', counterpart_slug: 'sock', counterpart: 'sock pair', reuse_pack: 'sock' },
  { slug: 'hat-on-floor', clue: 'hat dropped on floor', counterpart_slug: 'hat', counterpart: 'sun/winter hat', reuse_pack: 'hat' },
  { slug: 'coat-on-chair-back', clue: 'coat hung on empty chair back', counterpart_slug: 'coat', counterpart: 'kid coat', reuse_pack: null },
  { slug: 'balloon-string-stub', clue: 'tied balloon string stub + bit of balloon rubber', counterpart_slug: 'balloon', counterpart: 'inflated balloon', reuse_pack: 'balloon' },
  { slug: 'flour-handprint', clue: 'LARGE flour handprint (not tiny fingerprint)', counterpart_slug: 'flour-bag', counterpart: 'open flour bag blank', reuse_pack: null },
  { slug: 'smashed-pot-soil', clue: 'broken flower pot shards + soil trail', counterpart_slug: 'flower-pot', counterpart: 'intact flower pot with plant', reuse_pack: 'flower-pot' },
  { slug: 'paint-drip-trail', clue: 'paint drip trail dots', counterpart_slug: 'paint', counterpart: 'paint pot + brush', reuse_pack: 'paint' },
  { slug: 'crayon-scribble-edge', clue: 'crayon scribble on paper corner', counterpart_slug: 'crayon', counterpart: 'crayon stick', reuse_pack: 'crayon' },
  { slug: 'water-drip-trail', clue: 'water drip trail from container', counterpart_slug: 'water-bottle', counterpart: 'sports bottle blank', reuse_pack: null },
  { slug: 'damp-towel-heap', clue: 'damp towel crumpled heap', counterpart_slug: 'towel', counterpart: 'neat folded towel', reuse_pack: 'towel' },
  { slug: 'missing-picture-rect', clue: 'clean rectangle on wall where picture was', counterpart_slug: 'picture-frame', counterpart: 'picture frame blank art', reuse_pack: 'picture-frame' },
  { slug: 'toothbrush-paste-smear', clue: 'toothpaste smear near sink edge', counterpart_slug: 'toothbrush', counterpart: 'toothbrush', reuse_pack: 'toothbrush' },
  { slug: 'torn-paper-corner', clue: 'torn paper corner matching a page', counterpart_slug: 'torn-page', counterpart: 'sheet with matching tear edge', reuse_pack: 'book' },
  { slug: 'pencil-shavings', clue: 'pencil shavings pile', counterpart_slug: 'pencil', counterpart: 'pencil', reuse_pack: 'pencil' },
  { slug: 'backpack-spill', clue: 'open backpack spilling a book corner', counterpart_slug: 'backpack', counterpart: 'closed backpack', reuse_pack: 'backpack' },
  { slug: 'key-dust-outline', clue: 'dust outline of a missing key', counterpart_slug: 'key', counterpart: 'house key', reuse_pack: 'key' },
  { slug: 'pulled-chair-trace', clue: 'chair pulled out + floor scuff', counterpart_slug: 'chair', counterpart: 'simple chair', reuse_pack: null },
  { slug: 'ball-scuff-arc', clue: 'ball bounce scuff arc on floor', counterpart_slug: 'ball', counterpart: 'playground ball', reuse_pack: 'ball' },
  { slug: 'bike-rack-gap', clue: 'bike rack with bicycle-shaped empty gap', counterpart_slug: 'bicycle', counterpart: 'bicycle parked silhouette match', reuse_pack: 'bicycle' },
  { slug: 'pet-hair-clump', clue: 'pet hair clump on cushion', counterpart_slug: 'dog', counterpart: 'dog sitting still-life', reuse_pack: 'dog' },
];

export const SCENE_PAIR_SLUGS = [
  'muddy-paw-prints',
  'plate-crumbs',
  'wet-umbrella-drip',
  'smashed-pot-soil',
  'bike-rack-gap',
  'missing-picture-rect',
  'leaf-trail-indoors',
  'flour-handprint',
];

export const RESIDUE_AUDIT = [
  { bank: 'aggressive-s1 micro crumbs/piles/residue', class: 'AVOID_DUP', note: 'Micro forensic crumbs/fingerprints/sticker-residue — do not clone; K4 wants kid-readable correspondence pairs.' },
  { bank: 'aggressive-s2 crumb/fingerprint overlays', class: 'AVOID_DUP', note: 'Overlay atoms only; not paired counterparts.' },
  { bank: 'vg attn-footprint-trail', class: 'PARTIAL', note: 'Generic search trail; K4 needs object-linked pairs.' },
  { bank: 'vocab pack dog/cake/umbrella/bicycle/glove/etc.', class: 'REUSE', note: 'Counterparts exist — still generate style-matched pair cells; reuse_pack noted for later wiring.' },
  { bank: 'K4 correspondence pairs', class: 'MISSING', note: 'This stockpile.' },
];

export const ROUTE_AUDIT = [
  { bank: 'cw-c10 network/emergency route worlds', class: 'PARTIAL', note: 'Scene illustrations with routes, not modular joinable tiles.' },
  { bank: 'wx-bike-path / town-street stages', class: 'THIN', note: 'Places, not tile system.' },
  { bank: 'K5 modular town→country route system', class: 'MISSING', note: 'This stockpile — one coherent system.' },
];

export const WAVES = {
  'k4-01': {
    id: 'k4-01',
    kit: 'k4',
    family_id: 'be-k4-pairs-01',
    title: 'BE-K4 pairs 1–4 clue↔object',
    kind: 'correspondence',
    stock_rel: K4_REL,
    reuse_note: 'plate-crumbs→cake, melted-ice-cream-puddle→ice-cream, apple-core→apple, sandwich-crumbs→sandwich',
    sheets: [
      sh('S1', 'pairs 1-4 4x2', 'black-contact-4x2', [
        s(PREFIX_K4, 'clue-plate-crumbs', `CLUE (plate-crumbs): cake crumbs on empty plate rim. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'plate-crumbs', role: 'clue', reuse_pack: 'cake' }),
        s(PREFIX_K4, 'obj-cake', `COUNTERPART to clue-plate-crumbs: whole cake slice on plate. SAME style/scale/light as clue. Isolated.`, { pair: 'plate-crumbs', role: 'counterpart', reuse_pack: 'cake' }),
        s(PREFIX_K4, 'clue-melted-ice-cream-puddle', `CLUE (melted-ice-cream-puddle): melted ice-cream puddle + stick. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'melted-ice-cream-puddle', role: 'clue', reuse_pack: 'ice-cream' }),
        s(PREFIX_K4, 'obj-ice-cream', `COUNTERPART to clue-melted-ice-cream-puddle: ice-cream cone upright. SAME style/scale/light as clue. Isolated.`, { pair: 'melted-ice-cream-puddle', role: 'counterpart', reuse_pack: 'ice-cream' }),
        s(PREFIX_K4, 'clue-apple-core', `CLUE (apple-core): eaten apple core with seeds. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'apple-core', role: 'clue', reuse_pack: 'apple' }),
        s(PREFIX_K4, 'obj-apple', `COUNTERPART to clue-apple-core: whole red apple. SAME style/scale/light as clue. Isolated.`, { pair: 'apple-core', role: 'counterpart', reuse_pack: 'apple' }),
        s(PREFIX_K4, 'clue-sandwich-crumbs', `CLUE (sandwich-crumbs): sandwich corner crumbs + napkin smear. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'sandwich-crumbs', role: 'clue', reuse_pack: 'sandwich' }),
        s(PREFIX_K4, 'obj-sandwich', `COUNTERPART to clue-sandwich-crumbs: whole sandwich. SAME style/scale/light as clue. Isolated.`, { pair: 'sandwich-crumbs', role: 'counterpart', reuse_pack: 'sandwich' }),
      ]),
    ],
  },
  'k4-02': {
    id: 'k4-02',
    kit: 'k4',
    family_id: 'be-k4-pairs-02',
    title: 'BE-K4 pairs 5–8 clue↔object',
    kind: 'correspondence',
    stock_rel: K4_REL,
    reuse_note: 'cup-ring→cup, banana-peel→banana',
    sheets: [
      sh('S1', 'pairs 5-8 4x2', 'black-contact-4x2', [
        s(PREFIX_K4, 'clue-cup-ring', `CLUE (cup-ring): coffee/tea cup ring stain on table top (cutout). Isolated. Kid-readable. Ambiguous alone.`, { pair: 'cup-ring', role: 'clue', reuse_pack: 'cup' }),
        s(PREFIX_K4, 'obj-cup', `COUNTERPART to clue-cup-ring: simple cup. SAME style/scale/light as clue. Isolated.`, { pair: 'cup-ring', role: 'counterpart', reuse_pack: 'cup' }),
        s(PREFIX_K4, 'clue-banana-peel', `CLUE (banana-peel): discarded banana peel. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'banana-peel', role: 'clue', reuse_pack: 'banana' }),
        s(PREFIX_K4, 'obj-banana', `COUNTERPART to clue-banana-peel: whole banana. SAME style/scale/light as clue. Isolated.`, { pair: 'banana-peel', role: 'counterpart', reuse_pack: 'banana' }),
        s(PREFIX_K4, 'clue-juice-spill-trail', `CLUE (juice-spill-trail): short juice drip trail. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'juice-spill-trail', role: 'clue', reuse_pack: null }),
        s(PREFIX_K4, 'obj-juice-box', `COUNTERPART to clue-juice-spill-trail: kids juice box blank. SAME style/scale/light as clue. Isolated.`, { pair: 'juice-spill-trail', role: 'counterpart', reuse_pack: null }),
        s(PREFIX_K4, 'clue-chocolate-smear', `CLUE (chocolate-smear): chocolate smear on napkin. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'chocolate-smear', role: 'clue', reuse_pack: null }),
        s(PREFIX_K4, 'obj-chocolate-bar', `COUNTERPART to clue-chocolate-smear: plain chocolate bar no brand. SAME style/scale/light as clue. Isolated.`, { pair: 'chocolate-smear', role: 'counterpart', reuse_pack: null }),
      ]),
    ],
  },
  'k4-03': {
    id: 'k4-03',
    kit: 'k4',
    family_id: 'be-k4-pairs-03',
    title: 'BE-K4 pairs 9–12 clue↔object',
    kind: 'correspondence',
    stock_rel: K4_REL,
    reuse_note: 'muddy-paw-prints→dog, wet-boot-prints→boot, wet-umbrella-drip→umbrella, leaf-trail-indoors→leaf',
    sheets: [
      sh('S1', 'pairs 9-12 4x2', 'black-contact-4x2', [
        s(PREFIX_K4, 'clue-muddy-paw-prints', `CLUE (muddy-paw-prints): 3 muddy dog paw prints in a short trail. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'muddy-paw-prints', role: 'clue', reuse_pack: 'dog' }),
        s(PREFIX_K4, 'obj-dog', `COUNTERPART to clue-muddy-paw-prints: friendly dog standing still-life. SAME style/scale/light as clue. Isolated.`, { pair: 'muddy-paw-prints', role: 'counterpart', reuse_pack: 'dog' }),
        s(PREFIX_K4, 'clue-wet-boot-prints', `CLUE (wet-boot-prints): 2 wet boot footprints trail. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'wet-boot-prints', role: 'clue', reuse_pack: 'boot' }),
        s(PREFIX_K4, 'obj-boot', `COUNTERPART to clue-wet-boot-prints: rain boot. SAME style/scale/light as clue. Isolated.`, { pair: 'wet-boot-prints', role: 'counterpart', reuse_pack: 'boot' }),
        s(PREFIX_K4, 'clue-wet-umbrella-drip', `CLUE (wet-umbrella-drip): open wet umbrella dripping + small puddle. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'wet-umbrella-drip', role: 'clue', reuse_pack: 'umbrella' }),
        s(PREFIX_K4, 'obj-umbrella', `COUNTERPART to clue-wet-umbrella-drip: open child umbrella. SAME style/scale/light as clue. Isolated.`, { pair: 'wet-umbrella-drip', role: 'counterpart', reuse_pack: 'umbrella' }),
        s(PREFIX_K4, 'clue-leaf-trail-indoors', `CLUE (leaf-trail-indoors): autumn leaf trail leading inward. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'leaf-trail-indoors', role: 'clue', reuse_pack: 'leaf' }),
        s(PREFIX_K4, 'obj-leaf', `COUNTERPART to clue-leaf-trail-indoors: single maple-ish leaf. SAME style/scale/light as clue. Isolated.`, { pair: 'leaf-trail-indoors', role: 'counterpart', reuse_pack: 'leaf' }),
      ]),
    ],
  },
  'k4-04': {
    id: 'k4-04',
    kit: 'k4',
    family_id: 'be-k4-pairs-04',
    title: 'BE-K4 pairs 13–16 clue↔object',
    kind: 'correspondence',
    stock_rel: K4_REL,
    reuse_note: 'sand-spill-from-shoe→shoe, bike-tire-track→bicycle',
    sheets: [
      sh('S1', 'pairs 13-16 4x2', 'black-contact-4x2', [
        s(PREFIX_K4, 'clue-sand-spill-from-shoe', `CLUE (sand-spill-from-shoe): sand spilling from tipped shoe. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'sand-spill-from-shoe', role: 'clue', reuse_pack: 'shoe' }),
        s(PREFIX_K4, 'obj-shoe', `COUNTERPART to clue-sand-spill-from-shoe: kid shoe. SAME style/scale/light as clue. Isolated.`, { pair: 'sand-spill-from-shoe', role: 'counterpart', reuse_pack: 'shoe' }),
        s(PREFIX_K4, 'clue-bike-tire-track', `CLUE (bike-tire-track): narrow bicycle tire track arc. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'bike-tire-track', role: 'clue', reuse_pack: 'bicycle' }),
        s(PREFIX_K4, 'obj-bicycle', `COUNTERPART to clue-bike-tire-track: simple bicycle side view. SAME style/scale/light as clue. Isolated.`, { pair: 'bike-tire-track', role: 'counterpart', reuse_pack: 'bicycle' }),
        s(PREFIX_K4, 'clue-snow-boot-print', `CLUE (snow-boot-print): deep snow boot print. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'snow-boot-print', role: 'clue', reuse_pack: null }),
        s(PREFIX_K4, 'obj-winter-boot', `COUNTERPART to clue-snow-boot-print: winter boot. SAME style/scale/light as clue. Isolated.`, { pair: 'snow-boot-print', role: 'counterpart', reuse_pack: null }),
        s(PREFIX_K4, 'clue-doormat-mud', `CLUE (doormat-mud): doormat with muddy scuffs. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'doormat-mud', role: 'clue', reuse_pack: null }),
        s(PREFIX_K4, 'obj-doormat', `COUNTERPART to clue-doormat-mud: coir doormat blank. SAME style/scale/light as clue. Isolated.`, { pair: 'doormat-mud', role: 'counterpart', reuse_pack: null }),
      ]),
    ],
  },
  'k4-05': {
    id: 'k4-05',
    kit: 'k4',
    family_id: 'be-k4-pairs-05',
    title: 'BE-K4 pairs 17–20 clue↔object',
    kind: 'correspondence',
    stock_rel: K4_REL,
    reuse_note: 'single-glove→glove, scarf-on-rail→scarf, broken-shoelace→shoe, ribbon-fragment→ribbon',
    sheets: [
      sh('S1', 'pairs 17-20 4x2', 'black-contact-4x2', [
        s(PREFIX_K4, 'clue-single-glove', `CLUE (single-glove): one lost glove alone. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'single-glove', role: 'clue', reuse_pack: 'glove' }),
        s(PREFIX_K4, 'obj-glove-pair', `COUNTERPART to clue-single-glove: matching glove pair together. SAME style/scale/light as clue. Isolated.`, { pair: 'single-glove', role: 'counterpart', reuse_pack: 'glove' }),
        s(PREFIX_K4, 'clue-scarf-on-rail', `CLUE (scarf-on-rail): scarf draped on stair rail stub. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'scarf-on-rail', role: 'clue', reuse_pack: 'scarf' }),
        s(PREFIX_K4, 'obj-scarf', `COUNTERPART to clue-scarf-on-rail: folded scarf. SAME style/scale/light as clue. Isolated.`, { pair: 'scarf-on-rail', role: 'counterpart', reuse_pack: 'scarf' }),
        s(PREFIX_K4, 'clue-broken-shoelace', `CLUE (broken-shoelace): snapped shoelace with tip. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'broken-shoelace', role: 'clue', reuse_pack: 'shoe' }),
        s(PREFIX_K4, 'obj-shoe', `COUNTERPART to clue-broken-shoelace: laced shoe. SAME style/scale/light as clue. Isolated.`, { pair: 'broken-shoelace', role: 'counterpart', reuse_pack: 'shoe' }),
        s(PREFIX_K4, 'clue-ribbon-fragment', `CLUE (ribbon-fragment): torn gift ribbon fragment. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'ribbon-fragment', role: 'clue', reuse_pack: 'ribbon' }),
        s(PREFIX_K4, 'obj-ribbon-gift', `COUNTERPART to clue-ribbon-fragment: gift box with ribbon blank. SAME style/scale/light as clue. Isolated.`, { pair: 'ribbon-fragment', role: 'counterpart', reuse_pack: 'ribbon' }),
      ]),
    ],
  },
  'k4-06': {
    id: 'k4-06',
    kit: 'k4',
    family_id: 'be-k4-pairs-06',
    title: 'BE-K4 pairs 21–24 clue↔object',
    kind: 'correspondence',
    stock_rel: K4_REL,
    reuse_note: 'sock-mismatch→sock, hat-on-floor→hat, balloon-string-stub→balloon',
    sheets: [
      sh('S1', 'pairs 21-24 4x2', 'black-contact-4x2', [
        s(PREFIX_K4, 'clue-sock-mismatch', `CLUE (sock-mismatch): one striped sock alone. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'sock-mismatch', role: 'clue', reuse_pack: 'sock' }),
        s(PREFIX_K4, 'obj-sock', `COUNTERPART to clue-sock-mismatch: sock pair. SAME style/scale/light as clue. Isolated.`, { pair: 'sock-mismatch', role: 'counterpart', reuse_pack: 'sock' }),
        s(PREFIX_K4, 'clue-hat-on-floor', `CLUE (hat-on-floor): hat dropped on floor. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'hat-on-floor', role: 'clue', reuse_pack: 'hat' }),
        s(PREFIX_K4, 'obj-hat', `COUNTERPART to clue-hat-on-floor: sun/winter hat. SAME style/scale/light as clue. Isolated.`, { pair: 'hat-on-floor', role: 'counterpart', reuse_pack: 'hat' }),
        s(PREFIX_K4, 'clue-coat-on-chair-back', `CLUE (coat-on-chair-back): coat hung on empty chair back. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'coat-on-chair-back', role: 'clue', reuse_pack: null }),
        s(PREFIX_K4, 'obj-coat', `COUNTERPART to clue-coat-on-chair-back: kid coat. SAME style/scale/light as clue. Isolated.`, { pair: 'coat-on-chair-back', role: 'counterpart', reuse_pack: null }),
        s(PREFIX_K4, 'clue-balloon-string-stub', `CLUE (balloon-string-stub): tied balloon string stub + bit of balloon rubber. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'balloon-string-stub', role: 'clue', reuse_pack: 'balloon' }),
        s(PREFIX_K4, 'obj-balloon', `COUNTERPART to clue-balloon-string-stub: inflated balloon. SAME style/scale/light as clue. Isolated.`, { pair: 'balloon-string-stub', role: 'counterpart', reuse_pack: 'balloon' }),
      ]),
    ],
  },
  'k4-07': {
    id: 'k4-07',
    kit: 'k4',
    family_id: 'be-k4-pairs-07',
    title: 'BE-K4 pairs 25–28 clue↔object',
    kind: 'correspondence',
    stock_rel: K4_REL,
    reuse_note: 'smashed-pot-soil→flower-pot, paint-drip-trail→paint, crayon-scribble-edge→crayon',
    sheets: [
      sh('S1', 'pairs 25-28 4x2', 'black-contact-4x2', [
        s(PREFIX_K4, 'clue-flour-handprint', `CLUE (flour-handprint): LARGE flour handprint (not tiny fingerprint). Isolated. Kid-readable. Ambiguous alone.`, { pair: 'flour-handprint', role: 'clue', reuse_pack: null }),
        s(PREFIX_K4, 'obj-flour-bag', `COUNTERPART to clue-flour-handprint: open flour bag blank. SAME style/scale/light as clue. Isolated.`, { pair: 'flour-handprint', role: 'counterpart', reuse_pack: null }),
        s(PREFIX_K4, 'clue-smashed-pot-soil', `CLUE (smashed-pot-soil): broken flower pot shards + soil trail. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'smashed-pot-soil', role: 'clue', reuse_pack: 'flower-pot' }),
        s(PREFIX_K4, 'obj-flower-pot', `COUNTERPART to clue-smashed-pot-soil: intact flower pot with plant. SAME style/scale/light as clue. Isolated.`, { pair: 'smashed-pot-soil', role: 'counterpart', reuse_pack: 'flower-pot' }),
        s(PREFIX_K4, 'clue-paint-drip-trail', `CLUE (paint-drip-trail): paint drip trail dots. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'paint-drip-trail', role: 'clue', reuse_pack: 'paint' }),
        s(PREFIX_K4, 'obj-paint', `COUNTERPART to clue-paint-drip-trail: paint pot + brush. SAME style/scale/light as clue. Isolated.`, { pair: 'paint-drip-trail', role: 'counterpart', reuse_pack: 'paint' }),
        s(PREFIX_K4, 'clue-crayon-scribble-edge', `CLUE (crayon-scribble-edge): crayon scribble on paper corner. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'crayon-scribble-edge', role: 'clue', reuse_pack: 'crayon' }),
        s(PREFIX_K4, 'obj-crayon', `COUNTERPART to clue-crayon-scribble-edge: crayon stick. SAME style/scale/light as clue. Isolated.`, { pair: 'crayon-scribble-edge', role: 'counterpart', reuse_pack: 'crayon' }),
      ]),
    ],
  },
  'k4-08': {
    id: 'k4-08',
    kit: 'k4',
    family_id: 'be-k4-pairs-08',
    title: 'BE-K4 pairs 29–32 clue↔object',
    kind: 'correspondence',
    stock_rel: K4_REL,
    reuse_note: 'damp-towel-heap→towel, missing-picture-rect→picture-frame, toothbrush-paste-smear→toothbrush',
    sheets: [
      sh('S1', 'pairs 29-32 4x2', 'black-contact-4x2', [
        s(PREFIX_K4, 'clue-water-drip-trail', `CLUE (water-drip-trail): water drip trail from container. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'water-drip-trail', role: 'clue', reuse_pack: null }),
        s(PREFIX_K4, 'obj-water-bottle', `COUNTERPART to clue-water-drip-trail: sports bottle blank. SAME style/scale/light as clue. Isolated.`, { pair: 'water-drip-trail', role: 'counterpart', reuse_pack: null }),
        s(PREFIX_K4, 'clue-damp-towel-heap', `CLUE (damp-towel-heap): damp towel crumpled heap. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'damp-towel-heap', role: 'clue', reuse_pack: 'towel' }),
        s(PREFIX_K4, 'obj-towel', `COUNTERPART to clue-damp-towel-heap: neat folded towel. SAME style/scale/light as clue. Isolated.`, { pair: 'damp-towel-heap', role: 'counterpart', reuse_pack: 'towel' }),
        s(PREFIX_K4, 'clue-missing-picture-rect', `CLUE (missing-picture-rect): clean rectangle on wall where picture was. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'missing-picture-rect', role: 'clue', reuse_pack: 'picture-frame' }),
        s(PREFIX_K4, 'obj-picture-frame', `COUNTERPART to clue-missing-picture-rect: picture frame blank art. SAME style/scale/light as clue. Isolated.`, { pair: 'missing-picture-rect', role: 'counterpart', reuse_pack: 'picture-frame' }),
        s(PREFIX_K4, 'clue-toothbrush-paste-smear', `CLUE (toothbrush-paste-smear): toothpaste smear near sink edge. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'toothbrush-paste-smear', role: 'clue', reuse_pack: 'toothbrush' }),
        s(PREFIX_K4, 'obj-toothbrush', `COUNTERPART to clue-toothbrush-paste-smear: toothbrush. SAME style/scale/light as clue. Isolated.`, { pair: 'toothbrush-paste-smear', role: 'counterpart', reuse_pack: 'toothbrush' }),
      ]),
    ],
  },
  'k4-09': {
    id: 'k4-09',
    kit: 'k4',
    family_id: 'be-k4-pairs-09',
    title: 'BE-K4 pairs 33–36 clue↔object',
    kind: 'correspondence',
    stock_rel: K4_REL,
    reuse_note: 'torn-paper-corner→book, pencil-shavings→pencil, backpack-spill→backpack, key-dust-outline→key',
    sheets: [
      sh('S1', 'pairs 33-36 4x2', 'black-contact-4x2', [
        s(PREFIX_K4, 'clue-torn-paper-corner', `CLUE (torn-paper-corner): torn paper corner matching a page. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'torn-paper-corner', role: 'clue', reuse_pack: 'book' }),
        s(PREFIX_K4, 'obj-torn-page', `COUNTERPART to clue-torn-paper-corner: sheet with matching tear edge. SAME style/scale/light as clue. Isolated.`, { pair: 'torn-paper-corner', role: 'counterpart', reuse_pack: 'book' }),
        s(PREFIX_K4, 'clue-pencil-shavings', `CLUE (pencil-shavings): pencil shavings pile. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'pencil-shavings', role: 'clue', reuse_pack: 'pencil' }),
        s(PREFIX_K4, 'obj-pencil', `COUNTERPART to clue-pencil-shavings: pencil. SAME style/scale/light as clue. Isolated.`, { pair: 'pencil-shavings', role: 'counterpart', reuse_pack: 'pencil' }),
        s(PREFIX_K4, 'clue-backpack-spill', `CLUE (backpack-spill): open backpack spilling a book corner. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'backpack-spill', role: 'clue', reuse_pack: 'backpack' }),
        s(PREFIX_K4, 'obj-backpack', `COUNTERPART to clue-backpack-spill: closed backpack. SAME style/scale/light as clue. Isolated.`, { pair: 'backpack-spill', role: 'counterpart', reuse_pack: 'backpack' }),
        s(PREFIX_K4, 'clue-key-dust-outline', `CLUE (key-dust-outline): dust outline of a missing key. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'key-dust-outline', role: 'clue', reuse_pack: 'key' }),
        s(PREFIX_K4, 'obj-key', `COUNTERPART to clue-key-dust-outline: house key. SAME style/scale/light as clue. Isolated.`, { pair: 'key-dust-outline', role: 'counterpart', reuse_pack: 'key' }),
      ]),
    ],
  },
  'k4-10': {
    id: 'k4-10',
    kit: 'k4',
    family_id: 'be-k4-pairs-10',
    title: 'BE-K4 pairs 37–40 clue↔object',
    kind: 'correspondence',
    stock_rel: K4_REL,
    reuse_note: 'ball-scuff-arc→ball, bike-rack-gap→bicycle, pet-hair-clump→dog',
    sheets: [
      sh('S1', 'pairs 37-40 4x2', 'black-contact-4x2', [
        s(PREFIX_K4, 'clue-pulled-chair-trace', `CLUE (pulled-chair-trace): chair pulled out + floor scuff. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'pulled-chair-trace', role: 'clue', reuse_pack: null }),
        s(PREFIX_K4, 'obj-chair', `COUNTERPART to clue-pulled-chair-trace: simple chair. SAME style/scale/light as clue. Isolated.`, { pair: 'pulled-chair-trace', role: 'counterpart', reuse_pack: null }),
        s(PREFIX_K4, 'clue-ball-scuff-arc', `CLUE (ball-scuff-arc): ball bounce scuff arc on floor. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'ball-scuff-arc', role: 'clue', reuse_pack: 'ball' }),
        s(PREFIX_K4, 'obj-ball', `COUNTERPART to clue-ball-scuff-arc: playground ball. SAME style/scale/light as clue. Isolated.`, { pair: 'ball-scuff-arc', role: 'counterpart', reuse_pack: 'ball' }),
        s(PREFIX_K4, 'clue-bike-rack-gap', `CLUE (bike-rack-gap): bike rack with bicycle-shaped empty gap. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'bike-rack-gap', role: 'clue', reuse_pack: 'bicycle' }),
        s(PREFIX_K4, 'obj-bicycle', `COUNTERPART to clue-bike-rack-gap: bicycle parked silhouette match. SAME style/scale/light as clue. Isolated.`, { pair: 'bike-rack-gap', role: 'counterpart', reuse_pack: 'bicycle' }),
        s(PREFIX_K4, 'clue-pet-hair-clump', `CLUE (pet-hair-clump): pet hair clump on cushion. Isolated. Kid-readable. Ambiguous alone.`, { pair: 'pet-hair-clump', role: 'clue', reuse_pack: 'dog' }),
        s(PREFIX_K4, 'obj-dog', `COUNTERPART to clue-pet-hair-clump: dog sitting still-life. SAME style/scale/light as clue. Isolated.`, { pair: 'pet-hair-clump', role: 'counterpart', reuse_pack: 'dog' }),
      ]),
    ],
  },
  'k4-scenes': {
    id: 'k4-scenes',
    kit: 'k4',
    family_id: 'be-k4-scenes',
    title: 'BE-K4 scene-scale correspondence 2×4',
    kind: 'correspondence-scene',
    stock_rel: K4_REL,
    reuse_note: 'scene versions of 8 key pairs',
    sheets: [
      sh('S1', 'scene-scale clues A 2x2', 'landscape-contact-2x2', [
        s(PREFIX_K4, 'scene-muddy-paw-prints', `SCENE-SCALE: 3 muddy dog paw prints in a short trail visible in a small place context that hints the counterpart (dog) without spelling it out. Open floor. No people faces. No text.`, { pair: 'muddy-paw-prints', role: 'scene' }),
        s(PREFIX_K4, 'scene-plate-crumbs', `SCENE-SCALE: cake crumbs on empty plate rim visible in a small place context that hints the counterpart (cake) without spelling it out. Open floor. No people faces. No text.`, { pair: 'plate-crumbs', role: 'scene' }),
        s(PREFIX_K4, 'scene-wet-umbrella-drip', `SCENE-SCALE: open wet umbrella dripping + small puddle visible in a small place context that hints the counterpart (umbrella) without spelling it out. Open floor. No people faces. No text.`, { pair: 'wet-umbrella-drip', role: 'scene' }),
        s(PREFIX_K4, 'scene-smashed-pot-soil', `SCENE-SCALE: broken flower pot shards + soil trail visible in a small place context that hints the counterpart (flower-pot) without spelling it out. Open floor. No people faces. No text.`, { pair: 'smashed-pot-soil', role: 'scene' }),
      ]),
      sh('S2', 'scene-scale clues B 2x2', 'landscape-contact-2x2', [
        s(PREFIX_K4, 'scene-bike-rack-gap', `SCENE-SCALE: bike rack with bicycle-shaped empty gap visible in a small place context that hints the counterpart (bicycle) without spelling it out. Open floor. No people faces. No text.`, { pair: 'bike-rack-gap', role: 'scene' }),
        s(PREFIX_K4, 'scene-missing-picture-rect', `SCENE-SCALE: clean rectangle on wall where picture was visible in a small place context that hints the counterpart (picture-frame) without spelling it out. Open floor. No people faces. No text.`, { pair: 'missing-picture-rect', role: 'scene' }),
        s(PREFIX_K4, 'scene-leaf-trail-indoors', `SCENE-SCALE: autumn leaf trail leading inward visible in a small place context that hints the counterpart (leaf) without spelling it out. Open floor. No people faces. No text.`, { pair: 'leaf-trail-indoors', role: 'scene' }),
        s(PREFIX_K4, 'scene-flour-handprint', `SCENE-SCALE: LARGE flour handprint (not tiny fingerprint) visible in a small place context that hints the counterpart (flour-bag) without spelling it out. Open floor. No people faces. No text.`, { pair: 'flour-handprint', role: 'scene' }),
      ]),
    ],
  },
  'k5-base': {
    id: 'k5-base',
    kit: 'k5',
    family_id: 'be-k5-town-country',
    title: 'BE-K5 town→country base map',
    kind: 'route-base',
    stock_rel: K5_REL,
    reuse_note: 'new modular system — not cw-c10 clone',
    sheets: [
      sh('S1', 'base world plan', 'landscape-single', [
        s(PREFIX_K5, 'base-map', `${ROUTE_WORLD_LOCK} BASE MAP: left/center = town blocks with blank shop fronts + plaza; right = fields, trees, farm lane. Clear main path spine town→country. Open path for tokens. No people as subjects. No text/flags/maps labels.`, { role: 'base' }),
      ]),
    ],
  },
  'k5-tiles': {
    id: 'k5-tiles',
    kit: 'k5',
    family_id: 'be-k5-town-country-tiles',
    title: 'BE-K5 route path tiles (REG critical)',
    kind: 'route-tiles',
    stock_rel: K5_REL,
    reuse_note: 'registration grade targets this wave',
    sheets: [
      sh('S1', 'path tiles A 4x2', 'black-contact-4x2', [
        s(PREFIX_K5, 'tile-straight', `${ROUTE_TILE_RULE} TILE: straight path segment, joins N-S. Isolated tile on black with full square footprint + joinable edges.`, { role: 'tile', family_id: 'be-k5-town-country-tiles' }),
        s(PREFIX_K5, 'tile-straight-ew', `${ROUTE_TILE_RULE} TILE: straight path segment, joins E-W. Isolated tile on black with full square footprint + joinable edges.`, { role: 'tile', family_id: 'be-k5-town-country-tiles' }),
        s(PREFIX_K5, 'tile-corner-ne', `${ROUTE_TILE_RULE} TILE: 90° corner path joining N+E. Isolated tile on black with full square footprint + joinable edges.`, { role: 'tile', family_id: 'be-k5-town-country-tiles' }),
        s(PREFIX_K5, 'tile-corner-nw', `${ROUTE_TILE_RULE} TILE: 90° corner path joining N+W. Isolated tile on black with full square footprint + joinable edges.`, { role: 'tile', family_id: 'be-k5-town-country-tiles' }),
        s(PREFIX_K5, 'tile-corner-se', `${ROUTE_TILE_RULE} TILE: 90° corner path joining S+E. Isolated tile on black with full square footprint + joinable edges.`, { role: 'tile', family_id: 'be-k5-town-country-tiles' }),
        s(PREFIX_K5, 'tile-corner-sw', `${ROUTE_TILE_RULE} TILE: 90° corner path joining S+W. Isolated tile on black with full square footprint + joinable edges.`, { role: 'tile', family_id: 'be-k5-town-country-tiles' }),
        s(PREFIX_K5, 'tile-t-junction', `${ROUTE_TILE_RULE} TILE: T-junction path, stem south. Isolated tile on black with full square footprint + joinable edges.`, { role: 'tile', family_id: 'be-k5-town-country-tiles' }),
        s(PREFIX_K5, 'tile-four-way', `${ROUTE_TILE_RULE} TILE: four-way path crossroads. Isolated tile on black with full square footprint + joinable edges.`, { role: 'tile', family_id: 'be-k5-town-country-tiles' }),
      ]),
      sh('S2', 'path tiles B 4x2', 'black-contact-4x2', [
        s(PREFIX_K5, 'tile-bridge', `${ROUTE_TILE_RULE} TILE: short bridge path over water strip. Isolated tile on black with full square footprint + joinable edges.`, { role: 'tile', family_id: 'be-k5-town-country-tiles' }),
        s(PREFIX_K5, 'tile-tunnel', `${ROUTE_TILE_RULE} TILE: path entering short tunnel mouth. Isolated tile on black with full square footprint + joinable edges.`, { role: 'tile', family_id: 'be-k5-town-country-tiles' }),
        s(PREFIX_K5, 'tile-footpath', `${ROUTE_TILE_RULE} TILE: softer footpath curve joining two edges. Isolated tile on black with full square footprint + joinable edges.`, { role: 'tile', family_id: 'be-k5-town-country-tiles' }),
        s(PREFIX_K5, 'tile-stairs', `${ROUTE_TILE_RULE} TILE: path with short stair risers joining two edges. Isolated tile on black with full square footprint + joinable edges.`, { role: 'tile', family_id: 'be-k5-town-country-tiles' }),
        s(PREFIX_K5, 'tile-ramp', `${ROUTE_TILE_RULE} TILE: gentle ramp path joining two edges. Isolated tile on black with full square footprint + joinable edges.`, { role: 'tile', family_id: 'be-k5-town-country-tiles' }),
        s(PREFIX_K5, 'tile-roundabout', `${ROUTE_TILE_RULE} TILE: small roundabout path ring with 4 joins. Isolated tile on black with full square footprint + joinable edges.`, { role: 'tile', family_id: 'be-k5-town-country-tiles' }),
        s(PREFIX_K5, 'tile-dead-end', `${ROUTE_TILE_RULE} TILE: dead-end path cul-de-sac. Isolated tile on black with full square footprint + joinable edges.`, { role: 'tile', family_id: 'be-k5-town-country-tiles' }),
        s(PREFIX_K5, 'tile-crossing', `${ROUTE_TILE_RULE} TILE: zebra-ish crossing band on path (NO text). Isolated tile on black with full square footprint + joinable edges.`, { role: 'tile', family_id: 'be-k5-town-country-tiles' }),
      ]),
    ],
  },
  'k5-blockers': {
    id: 'k5-blockers',
    kit: 'k5',
    family_id: 'be-k5-town-country-blockers',
    title: 'BE-K5 route blockers',
    kind: 'route-blockers',
    stock_rel: K5_REL,
    reuse_note: 'scale-matched to path width',
    sheets: [
      sh('S1', 'blockers 2x5', 'black-contact-5x2', [
        s(PREFIX_K5, 'block-roadworks', `${ROUTE_TILE_RULE} BLOCKER spans FULL path width: roadworks barrier + cones blocking path width. Isolated on black. No political symbols. No text.`, { role: 'blocker' }),
        s(PREFIX_K5, 'block-flood', `${ROUTE_TILE_RULE} BLOCKER spans FULL path width: flood puddle covering path width. Isolated on black. No political symbols. No text.`, { role: 'blocker' }),
        s(PREFIX_K5, 'block-closed-gate', `${ROUTE_TILE_RULE} BLOCKER spans FULL path width: closed wooden gate across path. Isolated on black. No political symbols. No text.`, { role: 'blocker' }),
        s(PREFIX_K5, 'block-fallen-tree', `${ROUTE_TILE_RULE} BLOCKER spans FULL path width: fallen tree across path. Isolated on black. No political symbols. No text.`, { role: 'blocker' }),
        s(PREFIX_K5, 'block-ice', `${ROUTE_TILE_RULE} BLOCKER spans FULL path width: icy patch covering path. Isolated on black. No political symbols. No text.`, { role: 'blocker' }),
        s(PREFIX_K5, 'block-damaged-bridge', `${ROUTE_TILE_RULE} BLOCKER spans FULL path width: broken bridge gap (path ends). Isolated on black. No political symbols. No text.`, { role: 'blocker' }),
        s(PREFIX_K5, 'block-delivery', `${ROUTE_TILE_RULE} BLOCKER spans FULL path width: delivery cart obstructing path. Isolated on black. No political symbols. No text.`, { role: 'blocker' }),
        s(PREFIX_K5, 'block-market-crowd', `${ROUTE_TILE_RULE} BLOCKER spans FULL path width: market stall cluster blocking path (no faces, silhouettes ok as shapes). Isolated on black. No political symbols. No text.`, { role: 'blocker' }),
        s(PREFIX_K5, 'block-queue', `${ROUTE_TILE_RULE} BLOCKER spans FULL path width: long queue of body shapes blocking sidewalk (NO faces). Isolated on black. No political symbols. No text.`, { role: 'blocker' }),
        s(PREFIX_K5, 'block-construction', `${ROUTE_TILE_RULE} BLOCKER spans FULL path width: construction fence panels across path. Isolated on black. No political symbols. No text.`, { role: 'blocker' }),
      ]),
    ],
  },
  'k5-checks': {
    id: 'k5-checks',
    kit: 'k5',
    family_id: 'be-k5-town-country-checks',
    title: 'BE-K5 route checkpoints',
    kind: 'route-checkpoints',
    stock_rel: K5_REL,
    reuse_note: 'token scale matched to tiles',
    sheets: [
      sh('S1', 'checkpoints 5x2', 'black-contact-5x2', [
        s(PREFIX_K5, 'chk-bus-stop', `${ROUTE_TILE_RULE} CHECKPOINT building/marker at traveler scale: bus stop shelter checkpoint token. Isolated. Blank signs (ZERO letters).`, { role: 'checkpoint' }),
        s(PREFIX_K5, 'chk-station', `${ROUTE_TILE_RULE} CHECKPOINT building/marker at traveler scale: small train station facade checkpoint. Isolated. Blank signs (ZERO letters).`, { role: 'checkpoint' }),
        s(PREFIX_K5, 'chk-shop', `${ROUTE_TILE_RULE} CHECKPOINT building/marker at traveler scale: neighborhood shop front checkpoint. Isolated. Blank signs (ZERO letters).`, { role: 'checkpoint' }),
        s(PREFIX_K5, 'chk-school', `${ROUTE_TILE_RULE} CHECKPOINT building/marker at traveler scale: school gate/building checkpoint. Isolated. Blank signs (ZERO letters).`, { role: 'checkpoint' }),
        s(PREFIX_K5, 'chk-clinic', `${ROUTE_TILE_RULE} CHECKPOINT building/marker at traveler scale: clinic/hospital entrance checkpoint. Isolated. Blank signs (ZERO letters).`, { role: 'checkpoint' }),
        s(PREFIX_K5, 'chk-park', `${ROUTE_TILE_RULE} CHECKPOINT building/marker at traveler scale: park gate + tree checkpoint. Isolated. Blank signs (ZERO letters).`, { role: 'checkpoint' }),
        s(PREFIX_K5, 'chk-harbor', `${ROUTE_TILE_RULE} CHECKPOINT building/marker at traveler scale: harbor dock post checkpoint. Isolated. Blank signs (ZERO letters).`, { role: 'checkpoint' }),
        s(PREFIX_K5, 'chk-crossroads', `${ROUTE_TILE_RULE} CHECKPOINT building/marker at traveler scale: signpost crossroads marker (NO readable text). Isolated. Blank signs (ZERO letters).`, { role: 'checkpoint' }),
        s(PREFIX_K5, 'chk-cafe', `${ROUTE_TILE_RULE} CHECKPOINT building/marker at traveler scale: cafe awning checkpoint. Isolated. Blank signs (ZERO letters).`, { role: 'checkpoint' }),
        s(PREFIX_K5, 'chk-library', `${ROUTE_TILE_RULE} CHECKPOINT building/marker at traveler scale: library entrance checkpoint. Isolated. Blank signs (ZERO letters).`, { role: 'checkpoint' }),
      ]),
    ],
  },
  'k5-dest': {
    id: 'k5-dest',
    kit: 'k5',
    family_id: 'be-k5-town-country-dest',
    title: 'BE-K5 destination states school+park',
    kind: 'route-destinations',
    stock_rel: K5_REL,
    reuse_note: 'registered destination states',
    sheets: [
      sh('S1', 'dest school+park states 4x2', 'black-contact-4x2', [
        s(PREFIX_K5, 'dest-school-open', `${ROUTE_WORLD_LOCK} DESTINATION STATE: school gate OPEN, path clear into yard. SAME school or park identity across its states. Isolated/plate. No text.`, { role: 'destination' }),
        s(PREFIX_K5, 'dest-school-closed', `${ROUTE_WORLD_LOCK} DESTINATION STATE: school gate CLOSED, quiet. SAME school or park identity across its states. Isolated/plate. No text.`, { role: 'destination' }),
        s(PREFIX_K5, 'dest-school-busy', `${ROUTE_WORLD_LOCK} DESTINATION STATE: school gate open with kid-crowd silhouettes (NO faces). SAME school or park identity across its states. Isolated/plate. No text.`, { role: 'destination' }),
        s(PREFIX_K5, 'dest-school-repair', `${ROUTE_WORLD_LOCK} DESTINATION STATE: school gate with repair barrier. SAME school or park identity across its states. Isolated/plate. No text.`, { role: 'destination' }),
        s(PREFIX_K5, 'dest-park-open', `${ROUTE_WORLD_LOCK} DESTINATION STATE: park entrance open green. SAME school or park identity across its states. Isolated/plate. No text.`, { role: 'destination' }),
        s(PREFIX_K5, 'dest-park-empty', `${ROUTE_WORLD_LOCK} DESTINATION STATE: park entrance empty quiet. SAME school or park identity across its states. Isolated/plate. No text.`, { role: 'destination' }),
        s(PREFIX_K5, 'dest-park-event', `${ROUTE_WORLD_LOCK} DESTINATION STATE: park entrance with festival bunting shapes (NO text/flags). SAME school or park identity across its states. Isolated/plate. No text.`, { role: 'destination' }),
        s(PREFIX_K5, 'dest-park-closed', `${ROUTE_WORLD_LOCK} DESTINATION STATE: park gate closed. SAME school or park identity across its states. Isolated/plate. No text.`, { role: 'destination' }),
      ]),
    ],
  },
  'k5-travel': {
    id: 'k5-travel',
    kit: 'k5',
    family_id: 'be-k5-town-country-travel',
    title: 'BE-K5 traveler tokens',
    kind: 'route-travelers',
    stock_rel: K5_REL,
    reuse_note: 'fixed scale vs path width',
    sheets: [
      sh('S1', 'travelers 3x2', 'black-contact-3x2', [
        s(PREFIX_K5, 'tok-pedestrian', `${ROUTE_TILE_RULE} TRAVELER TOKEN: top-down/3-4 pedestrian token (simple figure, soft face ok). Scale fits path width. Isolated on black.`, { role: 'traveler' }),
        s(PREFIX_K5, 'tok-bicycle', `${ROUTE_TILE_RULE} TRAVELER TOKEN: bicycle traveler token same scale. Scale fits path width. Isolated on black.`, { role: 'traveler' }),
        s(PREFIX_K5, 'tok-bus', `${ROUTE_TILE_RULE} TRAVELER TOKEN: small bus token same scale, blank sides. Scale fits path width. Isolated on black.`, { role: 'traveler' }),
        s(PREFIX_K5, 'tok-car', `${ROUTE_TILE_RULE} TRAVELER TOKEN: small car token same scale, blank. Scale fits path width. Isolated on black.`, { role: 'traveler' }),
        s(PREFIX_K5, 'tok-delivery', `${ROUTE_TILE_RULE} TRAVELER TOKEN: delivery van token same scale, blank. Scale fits path width. Isolated on black.`, { role: 'traveler' }),
        s(PREFIX_K5, 'tok-scooter', `${ROUTE_TILE_RULE} TRAVELER TOKEN: kick scooter traveler token same scale. Scale fits path width. Isolated on black.`, { role: 'traveler' }),
      ]),
    ],
  },
};

export const WAVE_ORDER = Object.keys(WAVES);

export const PLANNED_COUNTS = { k4_pairs: 40, k4_cells: 88, k5_assets: 51, k5_tiles: 16 };


function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function isRateLimitError(err) {
  return /429/.test(String(err && err.message));
}

async function withRateBackoff(fn) {
  try {
    return await fn();
  } catch (err) {
    if (!isRateLimitError(err)) throw err;
    console.error(`429 — waiting ${RATE_WAIT_MS / 1000}s then one retry`);
    await new Promise((r) => setTimeout(r, RATE_WAIT_MS));
    try {
      return await fn();
    } catch (err2) {
      if (!isRateLimitError(err2)) throw err2;
      const wait2 = RATE_WAIT_MS * 2;
      console.error(`429 again — backing off ${wait2 / 1000}s`);
      await new Promise((r) => setTimeout(r, wait2));
      throw err2;
    }
  }
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
  for (const root of [K4_STOCK, K5_STOCK]) {
    for (const runPath of walkRunJsons(root)) {
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
  }
  return null;
}

function waveOutDir(wave) {
  return path.join(ROOT, wave.stock_rel, wave.id);
}

function expectedSheets(wave) {
  return wave.sheets.length;
}

function formatHint(format) {
  if (format === 'landscape-single') return 'ONE landscape PNG (full board stage, not a grid).';
  if (format === 'landscape-contact-2x2') return 'ONE landscape PNG contact sheet, 2×2 grid, LARGE cells.';
  if (format === 'black-contact-4x2') return 'ONE PNG contact sheet on BLACK, 4×2 grid (8 cells).';
  if (format === 'black-contact-5x2') return 'ONE PNG contact sheet on BLACK, 5×2 grid (10 cells).';
  if (format === 'black-contact-3x2') return 'ONE PNG contact sheet on BLACK, 3×2 grid (6 cells).';
  return `ONE PNG contact sheet, format ${format}.`;
}

function sheetBlock(sheet) {
  const lines = sheet.cells.map((c, i) => `${i + 1}. ${c.key} — ${c.brief}`);
  return `SHEET ${sheet.id} — ${sheet.title}
Format: ${formatHint(sheet.format)}
Reading order L→R, T→B:
${lines.join('\n')}`;
}

function buildBrief(wave) {
  const sheets = wave.sheets;
  const kitLock = wave.kit === 'k5'
    ? `${STAGE_LOCK}\n\n${wave.kind === 'route-tiles' || wave.kind === 'route-blockers' || wave.kind === 'route-checkpoints' || wave.kind === 'route-travelers' ? ROUTE_TILE_RULE : ROUTE_WORLD_LOCK}`
    : `${CUTOUT_LOCK}\n\n${wave.kind === 'correspondence-scene' ? STAGE_LOCK : PAIR_RULE}`;
  return withEslAssetGeneratorBrief(`TASK: Produce **${sheets.length}** PNG sheet(s) for board-enabling ${wave.kit.toUpperCase()} stockpile.

${kitLock}

Family: ${wave.family_id}
Reuse note: ${wave.reuse_note || 'n/a'}

HARD RULES:
- Generate ONLY the listed cells. No extra concepts.
- NO baked readable text / logos / flags.
- quality: default ONLY.
- Keep generating inside THIS task until every listed PNG exists.
${wave.kit === 'k4' ? '- Prefer correspondence families: clue then counterpart in reading order.' : ''}
${wave.kind === 'route-tiles' ? '- REGISTRATION CRITICAL: tiles must join visually (pitch, path width, projection, edge geometry).' : ''}

${sheets.map((sh) => sheetBlock(sh)).join('\n\n')}

Return exactly ${sheets.length} PNG sheet(s).`);
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
    const r2 = spawnSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${destDir}' -Force`], { encoding: 'utf8' });
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
  fs.mkdirSync(path.dirname(LOCK), { recursive: true });
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

function emptyInv(kit) {
  return {
    kind: kit === 'k4' ? 'board-enabling-k4' : 'board-enabling-k5',
    prefix: kit === 'k4' ? PREFIX_K4 : PREFIX_K5,
    waves: {},
    families: {},
    pairs: kit === 'k4' ? PAIRS : undefined,
    running_total: {},
    residue_audit: kit === 'k4' ? RESIDUE_AUDIT : undefined,
    route_audit: kit === 'k5' ? ROUTE_AUDIT : undefined,
  };
}

function loadInv(kit) {
  const rel = kit === 'k4' ? INV_K4_REL : INV_K5_REL;
  const invPath = path.join(ROOT, rel);
  if (!fs.existsSync(invPath)) return emptyInv(kit);
  return JSON.parse(fs.readFileSync(invPath, 'utf8'));
}

function recomputeTotals(inv, kit) {
  const waves = Object.values(inv.waves || {});
  const fams = Object.values(inv.families || {});
  const cells = waves.reduce((n, w) => n + (w.cell_count || 0), 0);
  inv.running_total = {
    tasks: waves.filter((w) => w.task_id).length,
    sheets_downloaded: waves.reduce((n, w) => n + (w.sheets || []).length, 0),
    waves_planned: WAVE_ORDER.filter((id) => WAVES[id].kit === kit).length,
    waves_done: waves.filter((w) => w.finished_at && (w.sheets || []).length >= (w.expected_sheets || 1)).length,
    families_graded: fams.filter((f) => f.registration_grade && f.registration_grade !== 'PENDING' && f.registration_grade !== 'FIRED').length,
    reg_a: fams.filter((f) => f.registration_grade === 'REG_A').length,
    reg_b: fams.filter((f) => f.registration_grade === 'REG_B').length,
    reg_c: fams.filter((f) => f.registration_grade === 'REG_C').length,
    reg_fail: fams.filter((f) => f.registration_grade === 'REG_FAIL').length,
    asset_cells: cells,
    pairs: kit === 'k4' ? PAIRS.length : undefined,
  };
}

function writeInv(inv, kit) {
  inv.updated_at = new Date().toISOString();
  if (!inv.waves) inv.waves = {};
  if (!inv.families) inv.families = {};
  recomputeTotals(inv, kit);
  const rel = kit === 'k4' ? INV_K4_REL : INV_K5_REL;
  const stock = kit === 'k4' ? K4_STOCK : K5_STOCK;
  fs.mkdirSync(stock, { recursive: true });
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(inv, null, 2));
  return abs;
}

function upsertInventory(wave, dump) {
  const kit = wave.kit;
  const inv = loadInv(kit);
  const siblings = wave.sheets.flatMap((sh) => sh.cells.map((c) => c.key));
  const haveLarge = (dump.saved || []).filter((x) => x.bytes > 80_000).length >= expectedSheets(wave);
  inv.waves[wave.id] = {
    family_id: wave.family_id,
    title: wave.title,
    kind: wave.kind,
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
    kind: wave.kind,
    reuse_note: wave.reuse_note,
    siblings,
    registration_grade: prev.registration_grade || (haveLarge ? 'PENDING' : dump.task_id ? 'FIRED' : 'PENDING'),
    grade_notes: prev.grade_notes || '',
    manus_task_id: dump.task_id || prev.manus_task_id || null,
    task_url: dump.task_url || prev.task_url || null,
    sheet_dir: dump.sheet_dir || prev.sheet_dir || null,
    status: haveLarge ? 'generated_raw' : dump.task_id ? 'fired' : 'pending',
  };
  return writeInv(inv, kit);
}

function writeDocStub() {
  const inv4 = loadInv('k4');
  const inv5 = loadInv('k5');
  const t4 = inv4.running_total || {};
  const t5 = inv5.running_total || {};
  const lines = [
    '# Board-enabling K4 + K5 — correspondence pairs + route world',
    '',
    'Stockpile only. No producer wiring.',
    '',
    '| Kit | Prefix | Art partition (PNG — do not git-add) | Inventory |',
    '|---|---|---|---|',
    `| K4 residue↔object | \`be-k4-\` | \`${K4_REL}/\` | \`${INV_K4_REL}\` |`,
    `| K5 route world | \`be-k5-\` | \`${K5_REL}/\` | \`${INV_K5_REL}\` |`,
    '',
    'Tracked: `scripts/manus/request-be-k4k5.mjs`, this doc, inventories.',
    '',
    '## K4 — correspondence pairs',
    '',
    'Clue alone = ambiguous; with counterpart = logical. Kid-readable (not microscopic detective clipart).',
    'Avoid duplicating aggressive-s1 micro residue bank.',
    '',
    `Planned pairs: **${PAIRS.length}**. Scene-scale extras: **${SCENE_PAIR_SLUGS.length}**.`,
    '',
    '### Residue audit',
    '',
    '| Bank | Class | Note |',
    '|---|---|---|',
  ];
  for (const row of RESIDUE_AUDIT) {
    lines.push(`| ${row.bank} | ${row.class} | ${row.note} |`);
  }
  lines.push(
    '',
    '### K4 running totals',
    '',
    '| Metric | Count |',
    '|---|---:|',
    `| Pairs planned | ${PAIRS.length} |`,
    `| Tasks | ${t4.tasks || 0} |`,
    `| Sheets downloaded | ${t4.sheets_downloaded || 0} |`,
    `| Waves done | ${t4.waves_done || 0} |`,
    `| Asset cells | ${t4.asset_cells || 0} |`,
    '',
    '### K4 pair list',
    '',
  );
  PAIRS.forEach((p, i) => {
    lines.push(`${i + 1}. **${p.slug}** ↔ **${p.counterpart_slug}**${p.reuse_pack ? ` (reuse pack: \`${p.reuse_pack}\`)` : ''}`);
  });
  lines.push(
    '',
    '## K5 — ONE town→countryside route system',
    '',
    'Modular illustrated play world (not GIS). Fixed pitch / path width / projection.',
    'REG grades apply especially to **k5-tiles** (joinability).',
    '',
    '### Route audit',
    '',
    '| Bank | Class | Note |',
    '|---|---|---|',
  );
  for (const row of ROUTE_AUDIT) {
    lines.push(`| ${row.bank} | ${row.class} | ${row.note} |`);
  }
  lines.push(
    '',
    '### K5 running totals',
    '',
    '| Metric | Count |',
    '|---|---:|',
    `| Assets planned | ${PLANNED_COUNTS.k5_assets} |`,
    `| Path tiles | ${PLANNED_COUNTS.k5_tiles} |`,
    `| Tasks | ${t5.tasks || 0} |`,
    `| Sheets downloaded | ${t5.sheets_downloaded || 0} |`,
    `| Waves done | ${t5.waves_done || 0} |`,
    `| REG_A | ${t5.reg_a || 0} |`,
    `| REG_B | ${t5.reg_b || 0} |`,
    `| REG_C | ${t5.reg_c || 0} |`,
    `| REG_FAIL | ${t5.reg_fail || 0} |`,
    '',
    '## Waves',
    '',
  );
  for (const id of WAVE_ORDER) {
    const meta = WAVES[id];
    const inv = meta.kit === 'k4' ? inv4 : inv5;
    const fam = (inv.families || {})[meta.family_id];
    const w = (inv.waves || {})[id];
    const grade = (fam && fam.registration_grade) || 'unfired';
    const url = (w && w.task_url) || (fam && fam.task_url) || 'unfired';
    const cells = meta.sheets.reduce((n, sh) => n + sh.cells.length, 0);
    lines.push(`- **${id}** \`${meta.family_id}\` — ${grade} — ${url} — ${meta.kind} — ${cells} cells — ${meta.reuse_note || 'n/a'}`);
  }
  lines.push(
    '',
    '## QA notes',
    '',
    '- Stream C+D shares **1** Manus slot (max 1 in-flight across both partitions).',
    '- Prefer family briefs; grade route tiles for edge join (REG_A/B/C/FAIL).',
    '- Commit scripts/docs/json only — never git-add PNGs.',
    '',
  );
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
  // Prefer K5 tiles early (REG critical), then base, then K4, then rest of K5
  const prefer = ['k5-tiles', 'k5-base', ...WAVE_ORDER.filter((id) => id.startsWith('k4-')), 'k5-blockers', 'k5-checks', 'k5-dest', 'k5-travel'];
  const seen = new Set();
  for (const id of prefer) {
    if (seen.has(id) || !WAVES[id]) continue;
    seen.add(id);
    if (!waveIsDone(WAVES[id])) return id;
  }
  for (const id of WAVE_ORDER) {
    if (!waveIsDone(WAVES[id])) return id;
  }
  return null;
}

function applyGrade(spec) {
  const [target, grade, ...rest] = String(spec).split(':');
  const notes = rest.join(':') || arg('notes', '');
  if (!target || !grade) throw new Error('Need --grade=waveOrFamily:REG_A|REG_B|REG_C|REG_FAIL');
  const ok = ['REG_A', 'REG_B', 'REG_C', 'REG_FAIL'];
  if (!ok.includes(grade)) throw new Error(`grade must be one of ${ok.join('|')}`);
  let wave = WAVES[target];
  let familyId = wave ? wave.family_id : target;
  let kit = wave ? wave.kit : null;
  if (!kit) {
    if (String(familyId).includes('k4') || String(target).includes('k4')) kit = 'k4';
    else kit = 'k5';
  }
  const inv = loadInv(kit);
  if (!wave) {
    const hit = Object.values(WAVES).find((w) => w.family_id === familyId || w.family_id === `${w.kit === 'k4' ? PREFIX_K4 : PREFIX_K5}${target}`);
    if (hit) {
      wave = hit;
      familyId = hit.family_id;
      kit = hit.kit;
    }
  }
  if (!inv.families[familyId]) {
    inv.families[familyId] = { family_id: familyId, siblings: [], registration_grade: grade, grade_notes: notes };
  } else {
    inv.families[familyId].registration_grade = grade;
    inv.families[familyId].grade_notes = notes;
  }
  writeInv(inv, kit);
  writeDocStub();
  return { family_id: familyId, kit, registration_grade: grade, notes };
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
        kit: wave.kit,
        family_id: wave.family_id,
        kind: wave.kind,
        reuse_note: wave.reuse_note,
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
    kind: `board-enabling-${wave.kit}`,
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
      console.error(`REFUSING fire — max 1 in-flight (K4+K5). ${busy.wave} ${busy.task_id} still open`);
      process.exit(3);
    }
    const brief = buildBrief(wave);
    const content = [{ type: 'text', text: brief }];
    const created = await withRateBackoff(() => createTask({
      title: wave.title,
      agent_profile: resolveAgentProfile(),
      force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
      interactive_mode: false,
      message: { content },
    }));
    taskId = created.task_id || created.id;
    dump.task_id = taskId;
    dump.task_url = created.task_url || `https://manus.im/app/${taskId}`;
    dump.created_at = new Date().toISOString();
    dump.brief = typeof brief === 'string' ? brief.slice(0, 2000) : '';
    fs.writeFileSync(RUN_JSON, JSON.stringify(dump, null, 2));
    await withInvLock(() => {
      upsertInventory(wave, dump);
      writeDocStub();
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
    await withRateBackoff(() => sendMessage(taskId, {
      force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
      message: withEslAssetGeneratorBrief(
        `Continue THIS task. You returned ${large.length} usable PNG sheet(s); we need exactly ${NEED_SHEETS} sheet(s) listed in the original brief. Do not restart. Do not add text. Keep firing generate_image until every listed sheet exists.`,
      ),
    }));
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
    writeDocStub();
    return p;
  });
  console.log(JSON.stringify({
    phase: 'downloaded',
    wave: wave.id,
    kit: wave.kit,
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

const isMain = process.argv[1] && path.normalize(process.argv[1]).endsWith('request-be-k4k5.mjs');
if (isMain) {
  if (process.argv.includes('--doc-only')) {
    writeInv(loadInv('k4'), 'k4');
    writeInv(loadInv('k5'), 'k5');
    writeDocStub();
    console.log(JSON.stringify({
      phase: 'doc',
      path: TRACKED_DOC_REL,
      inventory_k4: INV_K4_REL,
      inventory_k5: INV_K5_REL,
      planned: PLANNED_COUNTS,
      waves: WAVE_ORDER.length,
    }, null, 2));
    process.exit(0);
  }
  const gradeSpec = arg('grade', '');
  if (gradeSpec) {
    const g = applyGrade(gradeSpec);
    console.log(JSON.stringify({ phase: 'graded', ...g }, null, 2));
    process.exit(0);
  }
  apiKey();
  let names = (arg('wave', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (process.argv.includes('--next')) {
    const n = nextWaveName();
    if (!n) {
      console.log(JSON.stringify({ phase: 'all-done', waves: WAVE_ORDER.length, planned: PLANNED_COUNTS }, null, 2));
      process.exit(0);
    }
    names = [n];
  }
  if (!names.length) throw new Error(`Need --wave=${WAVE_ORDER.join('|')} or --next`);
  for (const n of names) {
    await runWave(n);
  }
}
