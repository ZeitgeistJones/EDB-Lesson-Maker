# -*- coding: utf-8 -*-
"""Generate request-be-k4k5.mjs from structured catalogs."""
from pathlib import Path

# 40 correspondence pairs: clue ↔ counterpart
# reuse_pack = vocab/pack key when counterpart already exists (still generate style-matched pair for lock)
PAIRS = [
  # food / kitchen (avoid microscopic crumb-bank clones — kid-readable plate-scale clues)
  ("plate-crumbs", "cake crumbs on empty plate rim", "cake", "whole cake slice on plate", "cake", True),
  ("melted-ice-cream-puddle", "melted ice-cream puddle + stick", "ice-cream", "ice-cream cone upright", "ice-cream", True),
  ("apple-core", "eaten apple core with seeds", "apple", "whole red apple", "apple", True),
  ("sandwich-crumbs", "sandwich corner crumbs + napkin smear", "sandwich", "whole sandwich", "sandwich", True),
  ("cup-ring", "coffee/tea cup ring stain on table top (cutout)", "cup", "simple cup", "cup", True),
  ("banana-peel", "discarded banana peel", "banana", "whole banana", "banana", False),
  ("juice-spill-trail", "short juice drip trail", "juice-box", "kids juice box blank", None, False),
  ("chocolate-smear", "chocolate smear on napkin", "chocolate-bar", "plain chocolate bar no brand", None, False),
  # outdoor / entry / weather
  ("muddy-paw-prints", "3 muddy dog paw prints in a short trail", "dog", "friendly dog standing still-life", "dog", True),
  ("wet-boot-prints", "2 wet boot footprints trail", "boot", "rain boot", "boot", True),
  ("wet-umbrella-drip", "open wet umbrella dripping + small puddle", "umbrella", "open child umbrella", "umbrella", True),
  ("leaf-trail-indoors", "autumn leaf trail leading inward", "leaf", "single maple-ish leaf", "leaf", True),
  ("sand-spill-from-shoe", "sand spilling from tipped shoe", "shoe", "kid shoe", "shoe", True),
  ("bike-tire-track", "narrow bicycle tire track arc", "bicycle", "simple bicycle side view", "bicycle", True),
  ("snow-boot-print", "deep snow boot print", "winter-boot", "winter boot", None, False),
  ("doormat-mud", "doormat with muddy scuffs", "doormat", "coir doormat blank", None, False),
  # clothing / lost / gift
  ("single-glove", "one lost glove alone", "glove-pair", "matching glove pair together", "glove", True),
  ("scarf-on-rail", "scarf draped on stair rail stub", "scarf", "folded scarf", "scarf", True),
  ("broken-shoelace", "snapped shoelace with tip", "shoe", "laced shoe", "shoe", True),
  ("ribbon-fragment", "torn gift ribbon fragment", "ribbon-gift", "gift box with ribbon blank", "ribbon", True),
  ("sock-mismatch", "one striped sock alone", "sock", "sock pair", "sock", True),
  ("hat-on-floor", "hat dropped on floor", "hat", "sun/winter hat", "hat", True),
  ("coat-on-chair-back", "coat hung on empty chair back", "coat", "kid coat", None, False),
  ("balloon-string-stub", "tied balloon string stub + bit of balloon rubber", "balloon", "inflated balloon", "balloon", True),
  # home / craft / plant
  ("flour-handprint", "LARGE flour handprint (not tiny fingerprint)", "flour-bag", "open flour bag blank", None, False),
  ("smashed-pot-soil", "broken flower pot shards + soil trail", "flower-pot", "intact flower pot with plant", "flower-pot", True),
  ("paint-drip-trail", "paint drip trail dots", "paint", "paint pot + brush", "paint", True),
  ("crayon-scribble-edge", "crayon scribble on paper corner", "crayon", "crayon stick", "crayon", True),
  ("water-drip-trail", "water drip trail from container", "water-bottle", "sports bottle blank", None, False),
  ("damp-towel-heap", "damp towel crumpled heap", "towel", "neat folded towel", "towel", True),
  ("missing-picture-rect", "clean rectangle on wall where picture was", "picture-frame", "picture frame blank art", "picture-frame", True),
  ("toothbrush-paste-smear", "toothpaste smear near sink edge", "toothbrush", "toothbrush", "toothbrush", True),
  # school / paper / bag
  ("torn-paper-corner", "torn paper corner matching a page", "torn-page", "sheet with matching tear edge", "book", True),
  ("pencil-shavings", "pencil shavings pile", "pencil", "pencil", "pencil", True),
  ("backpack-spill", "open backpack spilling a book corner", "backpack", "closed backpack", "backpack", True),
  ("key-dust-outline", "dust outline of a missing key", "key", "house key", "key", True),
  # presence / play / pet
  ("pulled-chair-trace", "chair pulled out + floor scuff", "chair", "simple chair", None, False),
  ("ball-scuff-arc", "ball bounce scuff arc on floor", "ball", "playground ball", "ball", True),
  ("bike-rack-gap", "bike rack with bicycle-shaped empty gap", "bicycle", "bicycle parked silhouette match", "bicycle", True),
  ("pet-hair-clump", "pet hair clump on cushion", "dog", "dog sitting still-life", "dog", True),
]

assert len(PAIRS) == 40, len(PAIRS)

# Scene-scale subset (8 pairs) — clue in a small place context
SCENES = [
  "muddy-paw-prints", "plate-crumbs", "wet-umbrella-drip", "smashed-pot-soil",
  "bike-rack-gap", "missing-picture-rect", "leaf-trail-indoors", "flour-handprint",
]

ROUTE_TILES = [
  ("tile-straight", "straight path segment, joins N-S"),
  ("tile-straight-ew", "straight path segment, joins E-W"),
  ("tile-corner-ne", "90° corner path joining N+E"),
  ("tile-corner-nw", "90° corner path joining N+W"),
  ("tile-corner-se", "90° corner path joining S+E"),
  ("tile-corner-sw", "90° corner path joining S+W"),
  ("tile-t-junction", "T-junction path, stem south"),
  ("tile-four-way", "four-way path crossroads"),
  ("tile-bridge", "short bridge path over water strip"),
  ("tile-tunnel", "path entering short tunnel mouth"),
  ("tile-footpath", "softer footpath curve joining two edges"),
  ("tile-stairs", "path with short stair risers joining two edges"),
  ("tile-ramp", "gentle ramp path joining two edges"),
  ("tile-roundabout", "small roundabout path ring with 4 joins"),
  ("tile-dead-end", "dead-end path cul-de-sac"),
  ("tile-crossing", "zebra-ish crossing band on path (NO text)"),
]

BLOCKERS = [
  ("block-roadworks", "roadworks barrier + cones blocking path width"),
  ("block-flood", "flood puddle covering path width"),
  ("block-closed-gate", "closed wooden gate across path"),
  ("block-fallen-tree", "fallen tree across path"),
  ("block-ice", "icy patch covering path"),
  ("block-damaged-bridge", "broken bridge gap (path ends)"),
  ("block-delivery", "delivery cart obstructing path"),
  ("block-market-crowd", "market stall cluster blocking path (no faces, silhouettes ok as shapes)"),
  ("block-queue", "long queue of body shapes blocking sidewalk (NO faces)"),
  ("block-construction", "construction fence panels across path"),
]

CHECKPOINTS = [
  ("chk-bus-stop", "bus stop shelter checkpoint token"),
  ("chk-station", "small train station facade checkpoint"),
  ("chk-shop", "neighborhood shop front checkpoint"),
  ("chk-school", "school gate/building checkpoint"),
  ("chk-clinic", "clinic/hospital entrance checkpoint"),
  ("chk-park", "park gate + tree checkpoint"),
  ("chk-harbor", "harbor dock post checkpoint"),
  ("chk-crossroads", "signpost crossroads marker (NO readable text)"),
  ("chk-cafe", "cafe awning checkpoint"),
  ("chk-library", "library entrance checkpoint"),
]

DEST_STATES = [
  # school destination registered states
  ("dest-school-open", "school gate OPEN, path clear into yard"),
  ("dest-school-closed", "school gate CLOSED, quiet"),
  ("dest-school-busy", "school gate open with kid-crowd silhouettes (NO faces)"),
  ("dest-school-repair", "school gate with repair barrier"),
  # park destination
  ("dest-park-open", "park entrance open green"),
  ("dest-park-empty", "park entrance empty quiet"),
  ("dest-park-event", "park entrance with festival bunting shapes (NO text/flags)"),
  ("dest-park-closed", "park gate closed"),
]

TRAVELERS = [
  ("tok-pedestrian", "top-down/3-4 pedestrian token (simple figure, soft face ok)"),
  ("tok-bicycle", "bicycle traveler token same scale"),
  ("tok-bus", "small bus token same scale, blank sides"),
  ("tok-car", "small car token same scale, blank"),
  ("tok-delivery", "delivery van token same scale, blank"),
  ("tok-scooter", "kick scooter traveler token same scale"),
]

def esc(s):
  return s.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")

def pair_waves():
  waves = []
  for wi in range(0, 40, 4):
    chunk = PAIRS[wi:wi+4]
    wid = f"k4-{wi//4+1:02d}"
    cells = []
    for slug, clue_brief, cpart_slug, cpart_brief, reuse, _ in chunk:
      cells.append((f"clue-{slug}", f"CLUE: {clue_brief}. Isolated still-life cutout. Kid-readable (not microscopic forensic). Ambiguous alone, logical with counterpart."))
      cells.append((f"obj-{cpart_slug}", f"COUNTERPART to clue-{slug}: {cpart_brief}. SAME style/scale/lighting as its clue sibling. Isolated still-life."))
    title = f"BE-K4 pairs {wi+1}-{wi+4} clue↔object 4×2"
    reuse_notes = ", ".join(f"{c[0]}→pack:{c[4]}" for c in chunk if c[4])
    waves.append((wid, "k4", title, "black-contact-4x2", cells, reuse_notes, chunk))
  return waves

# Build JS
lines = []
A = lines.append

A("""/**
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
export const INV_K4_REL = path.join(K4_REL, 'inventory-k4.json');
export const INV_K5_REL = path.join(K5_REL, 'inventory-k5.json');
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
""")

# PAIRS export
A("\n/** @type {{ slug: string, clue: string, counterpart_slug: string, counterpart: string, reuse_pack: string|null }[]} */")
A("export const PAIRS = [")
for slug, clue, cslug, cbrief, reuse, _ in PAIRS:
  reuse_js = f"'{reuse}'" if reuse else "null"
  A(f"  {{ slug: '{slug}', clue: '{esc(clue)}', counterpart_slug: '{cslug}', counterpart: '{esc(cbrief)}', reuse_pack: {reuse_js} }},")
A("];\n")

A("export const SCENE_PAIR_SLUGS = [")
for x in SCENES:
  A(f"  '{x}',")
A("];\n")

A("export const RESIDUE_AUDIT = [")
A("  { bank: 'aggressive-s1 micro crumbs/piles/residue', class: 'AVOID_DUP', note: 'Micro forensic crumbs/fingerprints/sticker-residue — do not clone; K4 wants kid-readable correspondence pairs.' },")
A("  { bank: 'aggressive-s2 crumb/fingerprint overlays', class: 'AVOID_DUP', note: 'Overlay atoms only; not paired counterparts.' },")
A("  { bank: 'vg attn-footprint-trail', class: 'PARTIAL', note: 'Generic search trail; K4 needs object-linked pairs.' },")
A("  { bank: 'vocab pack dog/cake/umbrella/bicycle/glove/etc.', class: 'REUSE', note: 'Counterparts exist — still generate style-matched pair cells; reuse_pack noted for later wiring.' },")
A("  { bank: 'K4 correspondence pairs', class: 'MISSING', note: 'This stockpile.' },")
A("];\n")

A("export const ROUTE_AUDIT = [")
A("  { bank: 'cw-c10 network/emergency route worlds', class: 'PARTIAL', note: 'Scene illustrations with routes, not modular joinable tiles.' },")
A("  { bank: 'wx-bike-path / town-street stages', class: 'THIN', note: 'Places, not tile system.' },")
A("  { bank: 'K5 modular town→country route system', class: 'MISSING', note: 'This stockpile — one coherent system.' },")
A("];\n")

# Build WAVES
A("export const WAVES = {")

# K4 pair waves
for wi in range(0, 40, 4):
  chunk = PAIRS[wi:wi+4]
  wid = f"k4-{wi//4+1:02d}"
  A(f"  '{wid}': {{")
  A(f"    id: '{wid}',")
  A(f"    kit: 'k4',")
  A(f"    family_id: 'be-k4-pairs-{wi//4+1:02d}',")
  A(f"    title: 'BE-K4 pairs {wi+1}–{wi+4} clue↔object',")
  A(f"    kind: 'correspondence',")
  A(f"    stock_rel: K4_REL,")
  reuse = ", ".join(f"{c[0]}→{c[4]}" for c in chunk if c[4]) or "n/a"
  A(f"    reuse_note: '{esc(reuse)}',")
  A("    sheets: [")
  A(f"      sh('S1', 'pairs {wi+1}-{wi+4} 4x2', 'black-contact-4x2', [")
  for slug, clue, cslug, cbrief, reuse, _ in chunk:
    A(f"        s(PREFIX_K4, 'clue-{slug}', `CLUE ({slug}): {esc(clue)}. Isolated. Kid-readable. Ambiguous alone.`, {{ pair: '{slug}', role: 'clue', reuse_pack: {('null' if not reuse else repr(reuse))} }}),")
    A(f"        s(PREFIX_K4, 'obj-{cslug}', `COUNTERPART to clue-{slug}: {esc(cbrief)}. SAME style/scale/light as clue. Isolated.`, {{ pair: '{slug}', role: 'counterpart', reuse_pack: {('null' if not reuse else repr(reuse))} }}),")
  A("      ]),")
  A("    ],")
  A("  },")

# K4 scenes
A("  'k4-scenes': {")
A("    id: 'k4-scenes',")
A("    kit: 'k4',")
A("    family_id: 'be-k4-scenes',")
A("    title: 'BE-K4 scene-scale correspondence 2×4',")
A("    kind: 'correspondence-scene',")
A("    stock_rel: K4_REL,")
A("    reuse_note: 'scene versions of 8 key pairs',")
A("    sheets: [")
A("      sh('S1', 'scene-scale clues A 2x2', 'landscape-contact-2x2', [")
for slug in SCENES[:4]:
  pair = next(p for p in PAIRS if p[0]==slug)
  A(f"        s(PREFIX_K4, 'scene-{slug}', `SCENE-SCALE: {esc(pair[1])} visible in a small place context that hints the counterpart ({pair[2]}) without spelling it out. Open floor. No people faces. No text.`, {{ pair: '{slug}', role: 'scene' }}),")
A("      ]),")
A("      sh('S2', 'scene-scale clues B 2x2', 'landscape-contact-2x2', [")
for slug in SCENES[4:]:
  pair = next(p for p in PAIRS if p[0]==slug)
  A(f"        s(PREFIX_K4, 'scene-{slug}', `SCENE-SCALE: {esc(pair[1])} visible in a small place context that hints the counterpart ({pair[2]}) without spelling it out. Open floor. No people faces. No text.`, {{ pair: '{slug}', role: 'scene' }}),")
A("      ]),")
A("    ],")
A("  },")

# K5 base
A("  'k5-base': {")
A("    id: 'k5-base',")
A("    kit: 'k5',")
A("    family_id: 'be-k5-town-country',")
A("    title: 'BE-K5 town→country base map',")
A("    kind: 'route-base',")
A("    stock_rel: K5_REL,")
A("    reuse_note: 'new modular system — not cw-c10 clone',")
A("    sheets: [")
A("      sh('S1', 'base world plan', 'landscape-single', [")
A("        s(PREFIX_K5, 'base-map', `${ROUTE_WORLD_LOCK} BASE MAP: left/center = town blocks with blank shop fronts + plaza; right = fields, trees, farm lane. Clear main path spine town→country. Open path for tokens. No people as subjects. No text/flags/maps labels.`, { role: 'base' }),")
A("      ]),")
A("    ],")
A("  },")

# K5 tiles (16) — two 4x2 sheets for REG
A("  'k5-tiles': {")
A("    id: 'k5-tiles',")
A("    kit: 'k5',")
A("    family_id: 'be-k5-town-country-tiles',")
A("    title: 'BE-K5 route path tiles (REG critical)',")
A("    kind: 'route-tiles',")
A("    stock_rel: K5_REL,")
A("    reuse_note: 'registration grade targets this wave',")
A("    sheets: [")
A("      sh('S1', 'path tiles A 4x2', 'black-contact-4x2', [")
for key, brief in ROUTE_TILES[:8]:
  A(f"        s(PREFIX_K5, '{key}', `${{ROUTE_TILE_RULE}} TILE: {esc(brief)}. Isolated tile on black with full square footprint + joinable edges.`, {{ role: 'tile', family_id: 'be-k5-town-country-tiles' }}),")
A("      ]),")
A("      sh('S2', 'path tiles B 4x2', 'black-contact-4x2', [")
for key, brief in ROUTE_TILES[8:]:
  A(f"        s(PREFIX_K5, '{key}', `${{ROUTE_TILE_RULE}} TILE: {esc(brief)}. Isolated tile on black with full square footprint + joinable edges.`, {{ role: 'tile', family_id: 'be-k5-town-country-tiles' }}),")
A("      ]),")
A("    ],")
A("  },")

# blockers
A("  'k5-blockers': {")
A("    id: 'k5-blockers',")
A("    kit: 'k5',")
A("    family_id: 'be-k5-town-country-blockers',")
A("    title: 'BE-K5 route blockers',")
A("    kind: 'route-blockers',")
A("    stock_rel: K5_REL,")
A("    reuse_note: 'scale-matched to path width',")
A("    sheets: [")
A("      sh('S1', 'blockers 2x5', 'black-contact-5x2', [")
# 10 blockers - use 5x2 = 10
for key, brief in BLOCKERS:
  A(f"        s(PREFIX_K5, '{key}', `${{ROUTE_TILE_RULE}} BLOCKER spans FULL path width: {esc(brief)}. Isolated on black. No political symbols. No text.`, {{ role: 'blocker' }}),")
A("      ]),")
A("    ],")
A("  },")

# checkpoints
A("  'k5-checks': {")
A("    id: 'k5-checks',")
A("    kit: 'k5',")
A("    family_id: 'be-k5-town-country-checks',")
A("    title: 'BE-K5 route checkpoints',")
A("    kind: 'route-checkpoints',")
A("    stock_rel: K5_REL,")
A("    reuse_note: 'token scale matched to tiles',")
A("    sheets: [")
A("      sh('S1', 'checkpoints 5x2', 'black-contact-5x2', [")
for key, brief in CHECKPOINTS:
  A(f"        s(PREFIX_K5, '{key}', `${{ROUTE_TILE_RULE}} CHECKPOINT building/marker at traveler scale: {esc(brief)}. Isolated. Blank signs (ZERO letters).`, {{ role: 'checkpoint' }}),")
A("      ]),")
A("    ],")
A("  },")

# destinations
A("  'k5-dest': {")
A("    id: 'k5-dest',")
A("    kit: 'k5',")
A("    family_id: 'be-k5-town-country-dest',")
A("    title: 'BE-K5 destination states school+park',")
A("    kind: 'route-destinations',")
A("    stock_rel: K5_REL,")
A("    reuse_note: 'registered destination states',")
A("    sheets: [")
A("      sh('S1', 'dest school+park states 4x2', 'black-contact-4x2', [")
for key, brief in DEST_STATES:
  A(f"        s(PREFIX_K5, '{key}', `${{ROUTE_WORLD_LOCK}} DESTINATION STATE: {esc(brief)}. SAME school or park identity across its states. Isolated/plate. No text.`, {{ role: 'destination' }}),")
A("      ]),")
A("    ],")
A("  },")

# travelers
A("  'k5-travel': {")
A("    id: 'k5-travel',")
A("    kit: 'k5',")
A("    family_id: 'be-k5-town-country-travel',")
A("    title: 'BE-K5 traveler tokens',")
A("    kind: 'route-travelers',")
A("    stock_rel: K5_REL,")
A("    reuse_note: 'fixed scale vs path width',")
A("    sheets: [")
A("      sh('S1', 'travelers 3x2', 'black-contact-3x2', [")
for key, brief in TRAVELERS:
  A(f"        s(PREFIX_K5, '{key}', `${{ROUTE_TILE_RULE}} TRAVELER TOKEN: {esc(brief)}. Scale fits path width. Isolated on black.`, {{ role: 'traveler' }}),")
A("      ]),")
A("    ],")
A("  },")

A("};\n")

A("export const WAVE_ORDER = Object.keys(WAVES);\n")

# Count assets
k4_cells = 40 * 2 + 8  # pairs + scenes
k5_cells = 1 + 16 + 10 + 10 + 8 + 6
A(f"export const PLANNED_COUNTS = {{ k4_pairs: 40, k4_cells: {k4_cells}, k5_assets: {k5_cells}, k5_tiles: 16 }};\n")

# Rest of infrastructure - copy adapted from K1
A(r'''
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
  fs.writeFileSync(path.join(ROOT, rel), JSON.stringify(inv, null, 2));
  return path.join(ROOT, rel);
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
    `| K4 residue↔object | \`be-k4-\` | \`${K4_REL}/\` | \`inventory-k4.json\` |`,
    `| K5 route world | \`be-k5-\` | \`${K5_REL}/\` | \`inventory-k5.json\` |`,
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
''')

out = Path(r'C:/dev/PPT-Lesson-Maker-for-Classin/scripts/manus/request-be-k4k5.mjs')
out.write_text('\n'.join(lines), encoding='utf-8')
print('wrote', out, 'lines', len(lines), 'pairs', len(PAIRS), 'k5', k5_cells)
