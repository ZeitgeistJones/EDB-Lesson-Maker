/**
 * Long-tail visual stockpile keys.
 * Repo-grounded against live 07_vocab-pack (exact stem), 09_props, harvested keys.
 * Visual-grammar harvest (23361b9b) is inventory only — do not regenerate those cells.
 * Stockpile only — no producer wiring.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const STOCKPILE_REL = 'harvested/manus-long-tail-stockpile';
export const TRACKED_INV_REL = 'docs/long-tail-stockpile-inventory.json';
export const TRACKED_REPORT_REL = 'docs/long-tail-stockpile-report.md';

export const SAFETY_SKIP_KEYS = new Set([
  'rape', 'massacre', 'murder', 'suicide', 'torture', 'missile', 'bomb', 'gun',
]);

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const STYLE = `STYLE LOCK: ONE coherent child-friendly ClassIn ESL house style — clean sparse vector / soft-matte educational illustration. Same line weight, palette, and padding across every sheet in this harvest. No photorealism, no glossy 3D, no sticker-pack chaos, no alternate art styles.
TEXT LOCK: BLANK / text-free only. Do NOT bake English words, captions, labels, letters, numbers, prices, times, dates, handwriting, signs, badges, logos, UI text, or fake readable text.
BLACK FIELD LOCK: every PROP contact sheet is pure #000000 black edge-to-edge with clear gutters. One concept per cell. Nothing crosses cell boundaries. Empty unused cells stay pure black.
STATE LOCK: matched state families keep the same object identity, viewpoint, scale, baseline, and canvas convention. Show the contrast visually without words.
STOCKPILE LOCK: raw Manus sheets only. Do not wire, import to PropBank, modify renderer, or broaden this list.
QUALITY: default only.`;

export const SETTING_STYLE = `STYLE LOCK: child-friendly ClassIn ESL lesson-stage environments. Soft children's-book illustration, same family across both panels.
TEXT LOCK: BLANK / text-free. No readable signs, logos, numbers, menus, or watermarks.
SETTING LOCK: REAL place with walls/floor/sky and key furniture at EDGES only. Open center floor band (horizontal ~20%–80%, lower third) for dragging props. Clear standing surface. NOT quiet color wash. NOT cinematic wallpaper. NOT black-field cutouts. NOT people, faces, or animals unless a distant silhouette is required for place identity — prefer empty stages.
QUALITY: default only.`;

function item(classification, family, key, extra = {}) {
  return { key, concept: key, family, classification, ...extra };
}
function m(family, key, brief) {
  return item('MANUS_WORTHY', family, key, { brief, status: 'pending', qa_status: null });
}
function have(family, key, existing, reason) {
  return item('HAVE_ENOUGH', family, key, { existing, reason });
}
function code(family, key, reason) {
  return item('CODE_LATER', family, key, { reason });
}
function low(family, key, reason) {
  return item('LOW_VALUE', family, key, { reason });
}

function sh(id, title, format, cells, extra = '') {
  return { id, title, format, cells, extra };
}

const FA = 'long-tail-vocab';
const FB = 'variant-banks';
const FC = 'state-families';
const FD = 'setting-drops';
const FE = 'scene-dressing';
const FF = 'role-depth';
const FG = 'story-poses';
const FH = 'obscure-systems';
const FI = 'next-direction';
const FJ = 'shift-fill';
const FK = 'shift-fill-2';
const FL = 'shift-fill-3';

/** Audit snapshot 2026-08-19: 6736 vocab stems, 5382 props, 1115 harvested keys. Exact-key only. */
export const CANDIDATES = [
  // --- A long-tail vocab: everyday kitchen/school already saturated ---
  have(FA, 'ladle', '07_vocab-pack/ladle.png', 'exact vocab stem'),
  have(FA, 'colander', '07_vocab-pack/colander.png', 'exact vocab stem'),
  have(FA, 'rolling-pin', '07_vocab-pack/rolling-pin.png', 'exact vocab stem'),
  have(FA, 'clothespin', '07_vocab-pack/clothespin.png', 'exact vocab stem'),
  have(FA, 'abacus', '07_vocab-pack/abacus.png', 'exact vocab stem'),
  have(FA, 'yolk', '07_vocab-pack/yolk.png', 'exact vocab stem'),
  have(FA, 'peel', '07_vocab-pack/peel.png', 'exact vocab stem'),
  have(FA, 'pit', '07_vocab-pack/pit.png', 'exact vocab stem'),
  have(FA, 'leek', '07_vocab-pack/leek.png', 'exact vocab stem'),
  have(FA, 'radish', '07_vocab-pack/radish.png', 'exact vocab stem'),
  have(FA, 'artichoke', '07_vocab-pack/artichoke.png', 'exact vocab stem'),
  have(FA, 'asparagus', '07_vocab-pack/asparagus.png', 'exact vocab stem'),
  have(FA, 'zucchini', '07_vocab-pack/zucchini.png', 'exact vocab stem'),
  have(FA, 'eggplant', '07_vocab-pack/eggplant.png', 'exact vocab stem'),
  have(FA, 'celery', '07_vocab-pack/celery.png', 'exact vocab stem'),
  have(FA, 'pomegranate', '07_vocab-pack/pomegranate.png', 'exact vocab stem'),
  have(FA, 'fig', '07_vocab-pack/fig.png', 'exact vocab stem'),
  have(FA, 'guava', '07_vocab-pack/guava.png', 'exact vocab stem'),
  have(FA, 'papaya', '07_vocab-pack/papaya.png', 'exact vocab stem'),
  have(FA, 'lychee', '07_vocab-pack/lychee.png', 'exact vocab stem'),
  have(FA, 'plum', '07_vocab-pack/plum.png', 'exact vocab stem'),
  have(FA, 'apricot', '07_vocab-pack/apricot.png', 'exact vocab stem'),
  have(FA, 'kayak', '07_vocab-pack/kayak.png', 'exact vocab stem'),
  have(FA, 'canoe', '07_vocab-pack/canoe.png', 'exact vocab stem'),
  have(FA, 'raft', '07_vocab-pack/raft.png', 'exact vocab stem'),
  have(FA, 'ferry', '07_vocab-pack/ferry.png', 'exact vocab stem'),
  have(FA, 'hourglass', '07_vocab-pack/hourglass.png', 'exact vocab stem'),
  have(FA, 'harmonica', '07_vocab-pack/harmonica.png', 'exact vocab stem'),
  have(FA, 'xylophone', '07_vocab-pack/xylophone.png', 'exact vocab stem'),
  have(FA, 'domino', '07_vocab-pack/domino.png', 'exact vocab stem'),
  have(FA, 'yo-yo', '07_vocab-pack/yo-yo.png', 'exact vocab stem'),
  have(FA, 'kaleidoscope', '07_vocab-pack/kaleidoscope.png', 'exact vocab stem'),
  have(FA, 'acorn', '07_vocab-pack/acorn.png', 'exact vocab stem'),
  have(FA, 'pinecone', '07_vocab-pack/pinecone.png', 'exact vocab stem'),
  have(FA, 'cocoon', '07_vocab-pack/cocoon.png', 'exact vocab stem'),
  have(FA, 'tadpole', '07_vocab-pack/tadpole.png', 'exact vocab stem'),
  have(FA, 'beehive', '07_vocab-pack/beehive.png', 'exact vocab stem'),
  have(FA, 'honeycomb', '07_vocab-pack/honeycomb.png', 'exact vocab stem'),
  have(FA, 'doorbell', '07_vocab-pack/doorbell.png', 'exact vocab stem'),
  have(FA, 'chimney', '07_vocab-pack/chimney.png', 'exact vocab stem'),
  have(FA, 'locker', '07_vocab-pack/locker.png', 'exact vocab stem'),
  have(FA, 'shuttlecock', '07_vocab-pack/shuttlecock.png', 'exact vocab stem'),
  have(FA, 'wicket', '07_vocab-pack/wicket.png', 'exact vocab stem'),
  have(FA, 'beret', '07_vocab-pack/beret.png', 'exact vocab stem'),
  have(FA, 'poncho', '07_vocab-pack/poncho.png', 'exact vocab stem'),
  have(FA, 'raincoat', '07_vocab-pack/raincoat.png', 'exact vocab stem'),
  have(FA, 'sandal', '07_vocab-pack/sandal.png', 'exact vocab stem'),
  have(FA, 'pulley', '07_vocab-pack/pulley.png', 'exact vocab stem'),
  have(FA, 'lever', '07_vocab-pack/lever.png', 'exact vocab stem'),
  have(FA, 'gear', '07_vocab-pack/gear.png', 'exact vocab stem — skip extra cog cell'),
  have(FH, 'cog', '07_vocab-pack/gear.png', 'gear stem covers cog; do not duplicate'),
  have(FA, 'anvil', '07_vocab-pack/anvil.png', 'exact vocab stem'),
  have(FA, 'test-tube', '07_vocab-pack/test-tube.png', 'exact vocab stem'),
  have(FA, 'beaker', '07_vocab-pack/beaker.png', 'exact vocab stem'),
  have(FA, 'petri-dish', '07_vocab-pack/petri-dish.png', 'exact vocab stem'),
  have(FA, 'coat-hook', '07_vocab-pack/coat-hook.png', 'exact vocab stem — dressing still missing some siblings'),
  have(FA, 'doormat', '07_vocab-pack/doormat.png', 'exact vocab stem'),
  have(FA, 'museum', '07_vocab-pack/museum.png', 'vocab icon exists; not an EDB setting drop'),
  have(FA, 'greenhouse', '07_vocab-pack/greenhouse.png', 'vocab icon exists; not an EDB setting drop'),
  have(FA, 'attic', '07_vocab-pack/attic.png', 'vocab icon exists'),
  have(FA, 'basement', '07_vocab-pack/basement.png', 'vocab icon exists'),
  have(FA, 'garage', '07_vocab-pack/garage.png', 'vocab icon exists'),
  have(FA, 'fire-station', '07_vocab-pack/fire-station.png', 'vocab icon exists'),
  have(FA, 'post-office', '07_vocab-pack/post-office.png', 'vocab icon exists'),
  have(FA, 'workshop', '07_vocab-pack/workshop.png', 'vocab icon exists'),
  have(FA, 'planetarium', '07_vocab-pack/planetarium.png', 'vocab icon exists'),
  m(FA, 'husk', 'dry grain husk / corn husk still-life, clearly the papery outer husk not the whole cob; no text'),
  m(FA, 'kernel', 'single corn kernel / grain kernel close-up still-life; not a whole ear; no text'),
  m(FA, 'cob', 'bare corn cob after kernels removed, still-life; no text'),
  m(FA, 'rind', 'citrus or melon rind piece, clearly the peel/rind not the fruit flesh; no text'),
  m(FA, 'egg-white', 'raw egg white in a small bowl beside a yolk, still-life; no labels'),
  m(FA, 'okra', 'fresh okra pods still-life, instantly readable vegetable; no text'),
  m(FA, 'beet', 'whole beetroot with short greens, still-life; no text'),
  m(FA, 'ginger-root', 'knobby ginger root still-life; no text'),
  m(FA, 'spring-onion', 'bunch of spring onions / scallions still-life; no text'),
  m(FA, 'dragonfruit', 'whole dragonfruit / pitaya still-life, magenta skin, no cut-text labels'),
  m(FA, 'persimmon', 'ripe persimmon fruit still-life; no text'),
  m(FA, 'nectarine', 'nectarine still-life, smooth skin distinct from fuzzy peach; no text'),
  m(FA, 'quinoa', 'small bowl of uncooked quinoa grains, still-life; no package text'),
  m(FA, 'couscous', 'small bowl of couscous grains, still-life; no package text'),
  m(FA, 'lentil', 'small bowl of dry lentils, still-life; no package text'),
  m(FA, 'chickpea', 'small bowl of chickpeas / garbanzo, still-life; no package text'),
  m(FA, 'tofu', 'block of tofu on a small plate, still-life; no brand'),
  m(FA, 'tempeh', 'block of tempeh with visible bean texture, still-life; no brand'),

  // --- B variants: genuine identity variants, not recolors ---
  have(FB, 'overalls', '07_vocab-pack/overalls.png', 'exact stem; dungarees still a distinct cut'),
  m(FB, 'kimono', 'child-friendly kimono garment still-life or folded display, no family crests or text'),
  m(FB, 'sari', 'folded sari drape still-life, colorful fabric, no text'),
  m(FB, 'sombrero', 'wide-brim sombrero hat still-life, no logos'),
  m(FB, 'turban', 'neat cloth turban still-life (garment only, no person), respectful, no symbols'),
  m(FB, 'dungarees', 'dungarees / bib-and-brace overalls still-life distinct from generic overalls; no labels'),
  m(FB, 'flip-flop', 'single pair of flip-flops / thongs still-life; not sandals; no brand'),
  m(FB, 'origami-crane', 'single origami crane paper sculpture, still-life; no writing on paper'),
  m(FB, 'paper-airplane', 'simple folded paper airplane still-life; no markings'),
  m(FB, 'paper-boat', 'folded paper boat still-life; no markings'),

  // --- C state families (pairs as one cell) ---
  have(FC, 'state-light-on-off-lamp', 'horizontal H5', 'lamp on/off already harvested'),
  have(FC, 'state-packed-unpacked-bag', 'horizontal H5', 'bag packed/unpacked already harvested'),
  have(FC, 'state-plugged-unplugged-device', 'horizontal H5', 'plug states already harvested'),
  low(FC, 'ice-melt-visual-grammar', 'VG2 already harvested ice-melt transform family'),
  low(FC, 'candle-visual-grammar', 'VG2 already harvested candle transform family'),
  m(FC, 'locked-unlocked-padlock', 'same padlock shown locked and unlocked as a matched pair; no key text'),
  m(FC, 'full-empty-glass', 'same clear glass shown full of water and empty as a matched pair; no labels'),
  m(FC, 'balloon-inflated-deflated', 'same balloon shown inflated and deflated as a matched pair; no faces printed on balloon'),
  m(FC, 'flashlight-on-off', 'same flashlight shown on (beam) and off as a matched pair; no brand'),
  m(FC, 'candle-lit-unlit', 'same candle shown lit and unlit as a matched pair; keep geometry registered; no smoke letters'),
  m(FC, 'plant-wilt-watered', 'same potted plant shown wilted then perky/watered as a matched pair; no text'),
  m(FC, 'ice-cube-melt', 'same ice cube shown solid then melting puddle as a matched pair; registered viewpoint'),
  m(FC, 'ripe-unripe-banana', 'same banana shown green-unripe and yellow-ripe as a matched pair; no stickers'),
  m(FC, 'tied-untied-shoelace', 'same child shoe shown laced-tied and laces-untied as a matched pair; no logos'),
  m(FC, 'folded-unfolded-shirt', 'same t-shirt shown neatly folded and unfolded flat as a matched pair; no prints/text'),
  m(FC, 'broken-whole-cup', 'same cup shown whole and chipped/cracked as a matched pair; kid-safe, no shards as danger'),
  m(FC, 'shadow-long-short', 'same object with long afternoon shadow vs short noon shadow as a matched pair; no sundial numbers'),

  // --- D settings: EDB already covers classroom→pool; harvest thinner civic/service places ---
  have(FD, 'classroom-setting', 'edb-settings wave1', 'classroom drops already commissioned'),
  have(FD, 'kitchen-setting', 'edb-settings wave1', 'kitchen drops already commissioned'),
  have(FD, 'airport-setting', 'edb-settings wave5', 'airport drops already commissioned'),
  have(FD, 'swimming-pool-setting', 'edb-settings wave6', 'pool drops already commissioned'),
  m(FD, 'laundromat-a', 'laundromat interior: machines along walls, open floor center for baskets, no people no brand logos no prices'),
  m(FD, 'laundromat-b', 'same laundromat alternate angle: folding table at edge, wide empty floor band, no people'),
  m(FD, 'hardware-store-a', 'hardware store interior: tool shelves along walls, open aisle center, no people no brand labels'),
  m(FD, 'hardware-store-b', 'same hardware store: paint-can display at edge, wide empty aisle, no people'),
  m(FD, 'marketplace-a', 'outdoor market: stall awnings at edges, open cobble/path center, blank stall fronts, no people no prices'),
  m(FD, 'marketplace-b', 'same outdoor market: crates at edges, wide walking lane center, no people'),
  m(FD, 'ferry-deck-a', 'ferry outdoor deck: railing + benches at edges, open deck floor center, water/horizon, no people no logos'),
  m(FD, 'ferry-deck-b', 'same ferry deck: life-ring silhouette at edge, wide empty deck center, no people'),
  m(FD, 'florist-a', 'florist shop interior: flower buckets at edges, open floor center, no people no price tags'),
  m(FD, 'florist-b', 'same florist: work table at edge, wide empty floor, no people'),
  m(FD, 'recycling-center-a', 'recycling drop-off yard: colored bins at edges, open pavement center, no people no recycling-logo letters'),
  m(FD, 'recycling-center-b', 'same recycling yard: truck silhouette far edge, wide empty lot center, no people'),

  // --- E scene dressing ---
  have(FE, 'umbrella-stand-vocab', '07_vocab-pack/umbrella-stand.png', 'check: may be fuzzy; harvest a black-field cutout anyway if missing exact'),
  m(FE, 'umbrella-stand', 'wet umbrella standing in a simple stand, isolated dressing prop; no text'),
  m(FE, 'lost-glove', 'single lost glove on the ground, isolated dressing; no labels'),
  m(FE, 'key-on-hook', 'house key hanging on a small wall hook, isolated; no tag text'),
  m(FE, 'windowsill-plant', 'tiny potted herb on a short windowsill fragment, isolated dressing not a room; no text'),
  m(FE, 'mailbox-flag-up', 'rural mailbox with flag UP, isolated; no numbers or names'),
  m(FE, 'mailbox-flag-down', 'same mailbox with flag DOWN, matched viewpoint to flag-up; no numbers'),
  m(FE, 'crumbs', 'small bread crumb scatter, isolated dressing atom; no plate text'),
  m(FE, 'spill-puddle', 'small drink spill puddle, isolated; no brand colors as logos'),
  m(FE, 'stain-spot', 'simple cloth stain spot on a folded napkin, isolated; no letters'),
  m(FE, 'leftover-plate', 'plate with a few leftover bites, isolated; no restaurant logos'),
  m(FE, 'wrinkle-cloth', 'wrinkled cloth / shirt pile vs smooth — one wrinkled cloth piece isolated'),
  m(FE, 'tear-cloth', 'cloth with a visible tear, isolated dressing; kid-safe'),
  m(FE, 'wet-floor-cone', 'wet-floor caution cone WITHOUT any writing or icons that read as letters; shape-only'),

  // --- F roles: small high-reuse gaps (H4 already has nurse/dentist/librarian/driver/grandparent/classmate) ---
  have(FF, 'cast-nurse-neutral-happy', 'horizontal H4', 'already harvested'),
  have(FF, 'cast-librarian-neutral-happy', 'horizontal H4', 'already harvested'),
  have(FF, 'cast-bus-driver-neutral-happy', 'horizontal H4', 'already harvested'),
  m(FF, 'cast-lifeguard', 'friendly lifeguard character, neutral happy pose, red/yellow cue without text logos; black field, colored clothes not white'),
  m(FF, 'cast-mechanic', 'friendly mechanic character, overalls + wrench cue, no garage sign text; black field'),
  m(FF, 'cast-janitor', 'friendly school janitor / cleaner character, broom/cart cue, no labels; black field'),
  m(FF, 'cast-coach', 'friendly youth sports coach, whistle cue without letters, clipboard blank; black field'),
  m(FF, 'cast-vet', 'friendly veterinarian character, animal-clinic helper, no red-cross logo or text; black field'),
  m(FF, 'cast-firefighter', 'friendly firefighter character, helmet, no flames as danger, no badge numbers; black field'),

  // --- G poses: do not duplicate H1 kneel/search/knock/comfort/apologize/invite/permission/queue/peer-check ---
  have(FG, 'interaction-kneel-pick-up-item', 'horizontal H1', 'already harvested'),
  have(FG, 'interaction-wait-in-line', 'horizontal H1', 'already harvested'),
  have(FG, 'interaction-comfort-friend', 'horizontal H1', 'already harvested'),
  m(FG, 'pose-carry-together', 'two children carry one shared object together, cooperative pose; black field; no text'),
  m(FG, 'pose-pass-object', 'one child passes an object to another, handoff pose; black field; no text'),
  m(FG, 'pose-peek-corner', 'child peeks around a simple corner/wall fragment; mystery-friendly; black field; no text'),
  m(FG, 'pose-tie-shoe', 'child sits tying a shoelace, self-care pose; black field; no logos'),
  m(FG, 'pose-zip-coat', 'child zips up a coat, getting-ready pose; black field; no brand'),
  m(FG, 'pose-wash-hands', 'child washes hands at a simple sink fragment; black field; no tap labels'),

  // --- H obscure systems / blind spots ---
  low(FH, 'cause-effect-split', 'visual-grammar already covers comics/transform; do not duplicate'),
  low(FH, 'before-after-frame', 'visual-grammar + A2 timeline stockpile'),
  code(FH, 'venn-empty', 'simple venn is code geometry'),
  code(FH, 'quantity-dot-card', 'dot arrays are code'),
  m(FH, 'chrysalis', 'single chrysalis / pupa hanging, nature still-life; no text'),
  m(FH, 'spawn', 'frogspawn jelly with dots in water, still-life; kid-safe; no text'),
  m(FH, 'lichen', 'lichen on a small bark fragment, still-life; no text'),
  m(FH, 'succulent', 'small succulent plant still-life, distinct from cactus if cactus exists; no pot label'),
  m(FH, 'sea-urchin', 'friendly sea urchin still-life, not scary; no text'),
  m(FH, 'anthill', 'simple anthill mound with tiny ants, still-life; no text'),
  m(FH, 'spiderweb', 'dew-drop spiderweb, isolated overlay-capable; no spider as horror'),
  m(FH, 'horseshoe', 'lucky horseshoe still-life, no brand; not a magnet unless obvious iron shoe'),
  m(FH, 'spring-coil', 'metal coil spring still-life; no text'),
  m(FH, 'piston', 'simple machine piston cutaway-friendly still-life, kid-safe, no engine brand'),
  m(FH, 'inclined-plane', 'simple wooden ramp / inclined plane with a ball about to roll; no degree numbers'),
  m(FH, 'intercom', 'wall intercom panel, blank screen, no brand or apartment numbers'),
  m(FH, 'downspout', 'gutter downspout pipe fragment, isolated; no house numbers'),
  m(FH, 'manhole-cover', 'manhole cover, NO letters or city marks, concentric pattern only'),
  m(FH, 'curb-cut', 'sidewalk curb-cut / ramp fragment for accessibility teaching; no signs'),
  m(FH, 'wheelchair-ramp', 'short wheelchair ramp fragment, isolated stage piece; no ADA text'),
  m(FH, 'revolving-door', 'revolving door isolated, no building logos; black field'),
  m(FH, 'footprint-left', 'single left shoe footprint, isolated; no size numbers'),
  m(FH, 'footprint-right', 'matching right shoe footprint, same style; no numbers'),
  m(FH, 'paw-print', 'single animal paw print, isolated; no text'),
  m(FH, 'tire-track', 'short tire track mark, isolated; no brand tread names'),

  // --- next-direction fill (shift window): tropical produce, textile/tools, extra poses/roles, garden stages ---
  m(FI, 'starfruit', 'whole yellow starfruit / carambola still-life; no text'),
  m(FI, 'rambutan', 'cluster of rambutan fruit with hairy red skins, still-life; no text'),
  m(FI, 'cassava', 'cassava / yuca roots still-life; no text'),
  m(FI, 'taro', 'taro corm still-life; no text'),
  m(FI, 'plantain', 'green plantain bunch still-life, distinct from yellow dessert banana; no stickers'),
  m(FI, 'loquat', 'loquat fruits on a short stem, still-life; no text'),
  m(FI, 'jackfruit', 'large jackfruit still-life; no text'),
  m(FI, 'miso', 'small bowl of miso paste, still-life; no jar label'),
  m(FI, 'kimchi', 'small bowl of kimchi, still-life; no jar label'),
  m(FI, 'spinning-wheel', 'child-safe spinning wheel still-life; no text'),
  m(FI, 'drop-spindle', 'drop spindle with yarn, still-life; no text'),
  m(FI, 'pinking-shears', 'pinking shears scissors still-life; no brand'),
  m(FI, 'calipers', 'simple measuring calipers still-life; no numbers on scale'),
  m(FI, 'clinometer', 'simple clinometer tool still-life; no degree numbers'),
  m(FI, 'orrery', 'simple orrery / planet model, no globe country names or letters'),
  m(FI, 'formicarium', 'ant farm / formicarium side view, kid-safe; no labels'),
  m(FI, 'wormery', 'wormery / worm compost viewer, kid-safe; no labels'),
  m(FI, 'apiary', 'row of beehive boxes as apiary still-life, no bees as swarm danger; no text'),
  m(FI, 'pose-share-umbrella', 'two children share one umbrella, black field, colored clothes, no text'),
  m(FI, 'pose-high-five', 'two children high-five, black field, no text'),
  m(FI, 'pose-whisper', 'one child whispers to another, black field, blank optional, no letters'),
  m(FI, 'pose-hold-door', 'child holds a door open for a friend, black field, no exit signs'),
  m(FI, 'pose-help-up', 'child helps another child stand up, kindness pose, black field'),
  m(FI, 'pose-cross-street', 'adult or crossing helper and child wait at a curb, looking both ways, no walk-signal text'),
  m(FI, 'cast-crossing-guard', 'friendly crossing-guard character, stop-paddle BLANK no STOP letters, black field, colored clothes'),
  m(FI, 'cast-park-ranger', 'friendly park ranger character, hat cue, no badge numbers, black field'),
  m(FI, 'cast-postal-worker', 'friendly postal worker with mail satchel, envelope blank, no logos, black field'),
  m(FI, 'cast-paramedic', 'friendly paramedic character, kit cue, no red-cross logo or ambulance numbers, black field'),
  m(FI, 'rooftop-garden-a', 'rooftop garden stage: planters at edges, open roof-floor center, city silhouette far, no people no signs'),
  m(FI, 'rooftop-garden-b', 'same rooftop garden alternate angle, wide empty floor, no people'),
  m(FI, 'community-garden-a', 'community garden plots at edges, open dirt path center, no people no painted plot numbers'),
  m(FI, 'community-garden-b', 'same community garden, shed at edge, wide path center, no people'),

  // --- shift-fill: extra states / dressing / obscure / civic stages (exact-key misses vs live pack) ---
  m(FJ, 'open-closed-book', 'same hardcover book shown closed then open as a matched pair; blank pages, no letters'),
  m(FJ, 'wet-dry-towel', 'same bath towel shown dry-folded and dripping-wet as a matched pair; no labels'),
  m(FJ, 'clean-dirty-plate', 'same plate shown clean then with leftover crumbs/sauce as a matched pair; no logos'),
  m(FJ, 'open-closed-umbrella', 'same umbrella shown closed and open as a matched pair; no brand, no text'),
  m(FJ, 'drawn-undrawn-curtain', 'same window curtain shown drawn closed and pulled open as a matched pair; no patterns that look like letters'),
  m(FJ, 'cracked-whole-egg', 'same egg shown whole then cracked into a bowl as a matched pair; no text'),
  m(FJ, 'zipped-unzipped-jacket', 'same child jacket shown zipped and unzipped as a matched pair; no logos'),
  m(FJ, 'stacked-unstacked-cups', 'same cups shown stacked tower then unstacked side-by-side as a matched pair; no logos'),
  m(FJ, 'open-closed-box', 'same cardboard box shown closed and open-flaps as a matched pair; blank, no shipping text'),
  m(FJ, 'sticky-note', 'single blank yellow sticky note, isolated dressing, ZERO writing'),
  m(FJ, 'paperclip-chain', 'short chain of linked paperclips, isolated dressing; no text'),
  m(FJ, 'dripping-faucet', 'simple faucet with one drip, isolated fragment not a full bathroom; no brand'),
  m(FJ, 'leaf-pile', 'small pile of fallen autumn leaves, isolated dressing; no text'),
  m(FJ, 'muddy-bootprint', 'single muddy boot print, isolated; no size numbers'),
  m(FJ, 'sprout', 'tiny seedling sprout in a pinch of soil, still-life; no pot label'),
  m(FJ, 'wilted-bouquet', 'small wilted flower bunch, isolated dressing; no florist wrap text'),
  m(FJ, 'tangled-earphones', 'tangled earphone cord still-life, no brand; not headphones if those exist as a stem'),
  m(FJ, 'steam-kettle', 'stovetop kettle with a puff of steam, still-life; no brand, no whistle letters'),
  m(FJ, 'wind-chime', 'simple wind chime hanging, still-life; no engraved letters'),
  m(FJ, 'water-wheel', 'wooden water wheel still-life, kid-safe; no mill-sign text'),
  m(FJ, 'dress-form', 'tailor dress-form mannequin torso, garment-free or plain cloth, no measurements'),
  m(FJ, 'well-pump', 'old-fashioned yard well pump, isolated; no house numbers'),
  m(FJ, 'hitching-post', 'simple hitching post with a ring, isolated stage piece; no text'),
  m(FJ, 'aqueduct', 'short stone aqueduct fragment / arch, isolated; no carved letters'),
  m(FJ, 'seismograph', 'simple seismograph drum, blank paper roll with a wavy line only, no numbers or station codes'),
  m(FJ, 'cub', 'friendly bear cub still-life, child-safe, not scary; no text'),
  m(FJ, 'pup', 'friendly puppy still-life, child-safe; no collar tags or text'),
  m(FJ, 'bakery-a', 'bakery shop interior: ovens/counters at edges, open floor center, blank displays, no people no prices'),
  m(FJ, 'bakery-b', 'same bakery alternate angle: cooling racks at edge, wide empty floor, no people'),
  m(FJ, 'barbershop-a', 'barbershop interior: chairs at edges, open floor center, blank mirrors, no people no logos'),
  m(FJ, 'barbershop-b', 'same barbershop: cape stand at edge, wide empty floor, no people'),
  m(FJ, 'pharmacy-a', 'pharmacy interior: shelves at edges, open aisle center, blank bottles, no people no drug names'),
  m(FJ, 'pharmacy-b', 'same pharmacy: counter at edge, wide empty aisle, no people'),
  m(FJ, 'marina-a', 'marina docks: boats/pilings at edges, open dock-plank center, water, no people no slip numbers'),
  m(FJ, 'marina-b', 'same marina: hoist at far edge, wide empty dock center, no people'),
  m(FJ, 'orchard-a', 'orchard: tree rows at edges, open grass path center, no people no painted tree tags'),
  m(FJ, 'orchard-b', 'same orchard: crate stack at edge, wide path center, no people'),
  m(FJ, 'pottery-studio-a', 'pottery studio: wheels/shelves at edges, open floor center, no people no kiln-brand text'),
  m(FJ, 'pottery-studio-b', 'same pottery studio: clay table at edge, wide empty floor, no people'),
  m(FJ, 'ice-rink-a', 'indoor ice rink: boards at edges, open ice/floor center, no people no ads or scoreboard numbers'),
  m(FJ, 'ice-rink-b', 'same ice rink: bench at edge, wide empty ice, no people'),
  m(FJ, 'bowling-alley-a', 'bowling alley: lanes at edges, open approach floor center, blank pins far, no people no scores'),
  m(FJ, 'bowling-alley-b', 'same bowling alley: ball rack at edge, wide empty approach, no people'),

  m(FK, 'peeled-unpeeled-orange', 'same orange shown whole-unpeeled and half-peeled as a matched pair; no stickers'),
  m(FK, 'buttoned-unbuttoned-shirt', 'same shirt shown fully buttoned and unbuttoned as a matched pair; no prints/text'),
  m(FK, 'capped-uncapped-marker', 'same marker shown capped and uncapped as a matched pair; no brand'),
  m(FK, 'rolled-unrolled-mat', 'same yoga/sleep mat shown rolled and unrolled as a matched pair; no logos'),
  m(FK, 'open-closed-laptop', 'same laptop shown closed and open with BLANK screen as a matched pair; no logos or UI text'),
  m(FK, 'sandwich-whole-bitten', 'same sandwich shown whole then with one bite as a matched pair; no wrappers/text'),
  m(FK, 'on-off-fan', 'same desk fan shown off and spinning-on as a matched pair; no brand'),
  m(FK, 'tied-untied-scarf', 'same scarf shown neatly tied and hanging-untied as a matched pair; no logos'),
  m(FK, 'assembled-scattered-blocks', 'same block set shown stacked tower then scattered as a matched pair; no letters on blocks'),
  m(FK, 'astrolabe', 'simple astrolabe still-life, no engraved numbers or letters'),
  m(FK, 'sextant', 'simple sextant still-life, no degree numbers'),
  m(FK, 'weather-balloon', 'weather balloon with a small instrument box, still-life; no station codes'),
  m(FK, 'climbing-wall', 'short indoor climbing-wall fragment with holds, isolated; no route numbers'),
  m(FK, 'bouldering-mat', 'thick bouldering crash mat, isolated; no gym logos'),
  m(FK, 'luggage-carousel', 'airport luggage carousel fragment, empty belt, no flight text'),
  m(FK, 'ticket-booth', 'small ticket booth, blank window, no prices or film titles'),
  m(FK, 'vending-machine', 'vending machine with blank unlabeled slots, no brand or prices'),
  m(FK, 'food-truck', 'food truck still-life, blank menu board, no logos or food names'),
  m(FK, 'skate-park-a', 'skate park: ramps at edges, open concrete center, no people no graffiti letters'),
  m(FK, 'skate-park-b', 'same skate park: rail at edge, wide empty pad, no people'),
  m(FK, 'climbing-gym-a', 'indoor climbing gym: walls at edges, open crash-mat floor center, no people no route tags'),
  m(FK, 'climbing-gym-b', 'same climbing gym: bench at edge, wide empty floor, no people'),
  m(FK, 'boardwalk-a', 'seaside boardwalk: rail/shops at edges, open plank path center, blank shopfronts, no people no signs'),
  m(FK, 'boardwalk-b', 'same boardwalk: bench at edge, wide empty planks, no people'),
  m(FK, 'music-shop-a', 'music shop interior: instruments on wall edges, open floor center, no people no brand names'),
  m(FK, 'music-shop-b', 'same music shop: counter at edge, wide empty floor, no people'),
  m(FK, 'food-court-a', 'food court: stalls at edges, open table-free floor center, blank stall fronts, no people no menus'),
  m(FK, 'food-court-b', 'same food court: trash station at edge, wide empty floor, no people'),
  m(FK, 'parking-garage-a', 'parking garage interior: pillars/cars-at-edges only, open drive lane center, no people no stall numbers'),
  m(FK, 'parking-garage-b', 'same parking garage: ramp at edge, wide empty lane, no people'),

  m(FL, 'lost-sock', 'single lost sock on the ground, isolated dressing; no size numbers'),
  m(FL, 'soap-suds', 'soap suds / foam puff, isolated dressing atom; no brand'),
  m(FL, 'fallen-petals', 'small scatter of fallen flower petals, isolated; no text'),
  m(FL, 'ice-cream-cart', 'ice cream cart still-life, blank menu, no logos or prices'),
  m(FL, 'flower-cart', 'flower cart with buckets at edges of the cart, blank, no prices'),
  m(FL, 'news-kiosk', 'news kiosk / stand, blank papers, no headlines or letters'),
  m(FL, 'kiosk', 'small information kiosk, blank panels, no maps-as-text or logos'),
  m(FL, 'paint-drip', 'single paint drip / drip puddle, isolated dressing; no brand'),
  m(FL, 'eraser-shavings', 'tiny eraser shavings pile, isolated dressing; no letters'),
  m(FL, 'observatory-a', 'observatory interior: telescope at edge, open floor center, dome, no people no labels'),
  m(FL, 'observatory-b', 'same observatory alternate angle, wide empty floor, no people'),
  m(FL, 'cafeteria-a', 'school cafeteria: tables stacked at edges, open floor center, blank trays, no people no menus'),
  m(FL, 'cafeteria-b', 'same cafeteria: serving counter at edge, wide empty floor, no people'),
  m(FL, 'pier-a', 'fishing pier: rail at edges, open plank center, water, no people no bait-shop signs'),
  m(FL, 'pier-b', 'same pier: bench at edge, wide empty planks, no people'),
];

export const MANUS_WORTHY = CANDIDATES.filter((c) => c.classification === 'MANUS_WORTHY');

const CELLS = {
  [FA]: MANUS_WORTHY.filter((c) => c.family === FA),
  [FB]: MANUS_WORTHY.filter((c) => c.family === FB),
  [FC]: MANUS_WORTHY.filter((c) => c.family === FC),
  [FD]: MANUS_WORTHY.filter((c) => c.family === FD),
  [FE]: MANUS_WORTHY.filter((c) => c.family === FE),
  [FF]: MANUS_WORTHY.filter((c) => c.family === FF),
  [FG]: MANUS_WORTHY.filter((c) => c.family === FG),
  [FH]: MANUS_WORTHY.filter((c) => c.family === FH),
  [FI]: MANUS_WORTHY.filter((c) => c.family === FI),
  [FJ]: MANUS_WORTHY.filter((c) => c.family === FJ),
  [FK]: MANUS_WORTHY.filter((c) => c.family === FK),
  [FL]: MANUS_WORTHY.filter((c) => c.family === FL),
};

function take(arr, start, n) {
  return arr.slice(start, start + n);
}

const PEOPLE_LOCK = `PEOPLE BLACK-FIELD FAILURE LOCK: draw people directly on pure #000000 black. No white cards, white panels, grey rectangles, or white cell backgrounds. Avoid white clothing that vanishes in keying; use colored clothes with clear outlines.`;

export const WAVES = {
  lt1: {
    id: 'lt1-vocab-variants-states',
    title: 'Long-tail LT1 vocab + variants + state pairs',
    family: 'long-tail-vocab-states',
    families: [FA, FB, FC],
    style: `${STYLE}
FAMILY MIX: long-tail still-life vocab, genuine clothing/craft variants, and registered state pairs (one pair per cell).`,
    sheets: [
      sh('S1', 'food parts 3x3', 'black-contact-3x3', take(CELLS[FA], 0, 9)),
      sh('S2', 'food world 3x3', 'black-contact-3x3', take(CELLS[FA], 9, 9)),
      sh('S3', 'clothes craft variants 3x3', 'black-contact-3x3', CELLS[FB]),
      sh('S4', 'state pairs 3x3 A', 'black-contact-3x3', take(CELLS[FC], 0, 9)),
      sh('S5', 'state pairs leftover + dressing mix 3x3', 'black-contact-3x3', [
        ...take(CELLS[FC], 9, 3),
        ...take(CELLS[FE], 0, 6),
      ]),
    ],
  },
  lt2: {
    id: 'lt2-dressing-obscure-cast',
    title: 'Long-tail LT2 dressing + obscure systems + poses + roles',
    family: 'long-tail-dressing-obscure',
    families: [FE, FH, FG, FF],
    style: `${STYLE}
FAMILY MIX: isolated scene dressing, obscure nature/simple-machine/infra atoms, then people poses and roles.
${PEOPLE_LOCK}`,
    sheets: [
      sh('S1', 'dressing rest 3x3', 'black-contact-3x3', take(CELLS[FE], 6, 7).concat(take(CELLS[FH], 0, 2))),
      sh('S2', 'obscure nature machines 3x3', 'black-contact-3x3', take(CELLS[FH], 2, 9)),
      sh('S3', 'obscure infra prints 2x5', 'black-contact-2x5', take(CELLS[FH], 11, 10)),
      sh('S4', 'story poses 2x3', 'black-contact-2x3', CELLS[FG], PEOPLE_LOCK),
      sh('S5', 'cast roles 2x3', 'black-contact-2x3', CELLS[FF], PEOPLE_LOCK),
    ],
  },
  lt3: {
    id: 'lt3-thin-settings',
    title: 'Long-tail LT3 thin civic setting drops',
    family: 'long-tail-settings',
    families: [FD],
    style: `${SETTING_STYLE}
FAMILY: civic/service places missing from the EDB settings harvest (classroom→pool already exist). Each sheet is 1×2 landscape panels.`,
    sheets: [
      sh('S1', 'laundromat 1x2', 'landscape-contact-1x2', take(CELLS[FD], 0, 2)),
      sh('S2', 'hardware store 1x2', 'landscape-contact-1x2', take(CELLS[FD], 2, 2)),
      sh('S3', 'marketplace 1x2', 'landscape-contact-1x2', take(CELLS[FD], 4, 2)),
      sh('S4', 'ferry deck 1x2', 'landscape-contact-1x2', take(CELLS[FD], 6, 2)),
      sh('S5', 'florist 1x2', 'landscape-contact-1x2', take(CELLS[FD], 8, 2)),
      sh('S6', 'recycling center 1x2', 'landscape-contact-1x2', take(CELLS[FD], 10, 2)),
    ],
  },
  lt4: {
    id: 'lt4-next-direction',
    title: 'Long-tail LT4 tropical + textile + extra poses/roles + garden stages',
    family: 'long-tail-next-direction',
    families: [FI],
    style: `${STYLE}
FAMILY MIX: tropical produce still-lifes, textile/measure tools, extra child poses and civic roles on black field.
${PEOPLE_LOCK}
SETTING SHEETS S5–S6: landscape 1×2 garden stages (NOT black-field). Open path/floor, scenery at edges, no people.`,
    sheets: [
      sh('S1', 'tropical produce 3x3', 'black-contact-3x3', take(CELLS[FI], 0, 9)),
      sh('S2', 'textile tools 3x3', 'black-contact-3x3', take(CELLS[FI], 9, 9)),
      sh('S3', 'extra poses 2x3', 'black-contact-2x3', take(CELLS[FI], 18, 6), PEOPLE_LOCK),
      sh('S4', 'civic roles 2x2', 'black-contact-2x2', take(CELLS[FI], 24, 4), PEOPLE_LOCK),
      sh('S5', 'rooftop garden 1x2', 'landscape-contact-1x2', take(CELLS[FI], 28, 2)),
      sh('S6', 'community garden 1x2', 'landscape-contact-1x2', take(CELLS[FI], 30, 2)),
    ],
  },
  lt5: {
    id: 'lt5-extra-states-dressing-obscure',
    title: 'Long-tail LT5 extra states + dressing + obscure still-lifes',
    family: 'long-tail-shift-fill-props',
    families: [FJ],
    style: `${STYLE}
FAMILY MIX: extra registered state pairs, isolated dressing atoms, and obscure still-lifes. Black-field only.`,
    sheets: [
      sh('S1', 'extra state pairs 3x3', 'black-contact-3x3', take(CELLS[FJ], 0, 9)),
      sh('S2', 'extra dressing 3x3', 'black-contact-3x3', take(CELLS[FJ], 9, 9)),
      sh('S3', 'extra obscure 3x3', 'black-contact-3x3', take(CELLS[FJ], 18, 9)),
    ],
  },
  lt6: {
    id: 'lt6-civic-stages',
    title: 'Long-tail LT6 bakery barbershop pharmacy marina stages',
    family: 'long-tail-shift-fill-civic',
    families: [FJ],
    style: `${SETTING_STYLE}
FAMILY: extra civic/service lesson stages. Each sheet is 1×2 landscape panels. Vocab icons may exist; these are interaction stages.`,
    sheets: [
      sh('S1', 'bakery 1x2', 'landscape-contact-1x2', take(CELLS[FJ], 27, 2)),
      sh('S2', 'barbershop 1x2', 'landscape-contact-1x2', take(CELLS[FJ], 29, 2)),
      sh('S3', 'pharmacy 1x2', 'landscape-contact-1x2', take(CELLS[FJ], 31, 2)),
      sh('S4', 'marina 1x2', 'landscape-contact-1x2', take(CELLS[FJ], 33, 2)),
    ],
  },
  lt7: {
    id: 'lt7-play-craft-stages',
    title: 'Long-tail LT7 orchard pottery rink bowling stages',
    family: 'long-tail-shift-fill-play',
    families: [FJ],
    style: `${SETTING_STYLE}
FAMILY: orchard / studio / play stages. Each sheet is 1×2 landscape panels.`,
    sheets: [
      sh('S1', 'orchard 1x2', 'landscape-contact-1x2', take(CELLS[FJ], 35, 2)),
      sh('S2', 'pottery studio 1x2', 'landscape-contact-1x2', take(CELLS[FJ], 37, 2)),
      sh('S3', 'ice rink 1x2', 'landscape-contact-1x2', take(CELLS[FJ], 39, 2)),
      sh('S4', 'bowling alley 1x2', 'landscape-contact-1x2', take(CELLS[FJ], 41, 2)),
    ],
  },
  lt8: {
    id: 'lt8-more-states-objects',
    title: 'Long-tail LT8 more state pairs + obscure objects',
    family: 'long-tail-shift-fill2-props',
    families: [FK],
    style: `${STYLE}
FAMILY MIX: extra registered state pairs and obscure/civic still-life objects. Black-field only.`,
    sheets: [
      sh('S1', 'more state pairs 3x3', 'black-contact-3x3', take(CELLS[FK], 0, 9)),
      sh('S2', 'obscure civic objects 3x3', 'black-contact-3x3', take(CELLS[FK], 9, 9)),
    ],
  },
  lt9: {
    id: 'lt9-youth-civic-stages',
    title: 'Long-tail LT9 skate climb boardwalk music food parking stages',
    family: 'long-tail-shift-fill2-stages',
    families: [FK],
    style: `${SETTING_STYLE}
FAMILY: youth/civic lesson stages missing from earlier setting waves. Each sheet is 1×2 landscape panels.`,
    sheets: [
      sh('S1', 'skate park 1x2', 'landscape-contact-1x2', take(CELLS[FK], 18, 2)),
      sh('S2', 'climbing gym 1x2', 'landscape-contact-1x2', take(CELLS[FK], 20, 2)),
      sh('S3', 'boardwalk 1x2', 'landscape-contact-1x2', take(CELLS[FK], 22, 2)),
      sh('S4', 'music shop 1x2', 'landscape-contact-1x2', take(CELLS[FK], 24, 2)),
      sh('S5', 'food court 1x2', 'landscape-contact-1x2', take(CELLS[FK], 26, 2)),
      sh('S6', 'parking garage 1x2', 'landscape-contact-1x2', take(CELLS[FK], 28, 2)),
    ],
  },
  lt10: {
    id: 'lt10-dressing-harbor-stages',
    title: 'Long-tail LT10 leftover dressing + observatory cafeteria pier',
    family: 'long-tail-shift-fill3',
    families: [FL],
    style: `${STYLE}
FAMILY MIX: leftover dressing/cart still-lifes on black field, then three 1×2 landscape stages.
SETTING SHEETS S2–S4: landscape 1×2 (NOT black-field). Open floor, scenery at edges, no people.`,
    sheets: [
      sh('S1', 'leftover dressing carts 3x3', 'black-contact-3x3', take(CELLS[FL], 0, 9)),
      sh('S2', 'observatory 1x2', 'landscape-contact-1x2', take(CELLS[FL], 9, 2)),
      sh('S3', 'cafeteria 1x2', 'landscape-contact-1x2', take(CELLS[FL], 11, 2)),
      sh('S4', 'pier 1x2', 'landscape-contact-1x2', take(CELLS[FL], 13, 2)),
    ],
  },
};

export const WAVE_ORDER = ['lt1', 'lt2', 'lt3', 'lt4', 'lt5', 'lt6', 'lt7', 'lt8', 'lt9', 'lt10'];

export function classificationCounts() {
  const by = {};
  for (const c of CANDIDATES) {
    by[c.classification] = (by[c.classification] || 0) + 1;
  }
  const perFamily = {};
  for (const c of CANDIDATES) {
    if (!perFamily[c.family]) {
      perFamily[c.family] = {
        candidate: 0,
        HAVE_ENOUGH: 0,
        MANUS_WORTHY: 0,
        LOCAL_TRANSFORM: 0,
        CODE_LATER: 0,
        LOW_VALUE: 0,
      };
    }
    perFamily[c.family].candidate += 1;
    if (perFamily[c.family][c.classification] != null) perFamily[c.family][c.classification] += 1;
  }
  return {
    considered: CANDIDATES.length,
    HAVE_ENOUGH: by.HAVE_ENOUGH || 0,
    MANUS_WORTHY: by.MANUS_WORTHY || 0,
    LOCAL_TRANSFORM: by.LOCAL_TRANSFORM || 0,
    CODE_LATER: by.CODE_LATER || 0,
    LOW_VALUE: by.LOW_VALUE || 0,
    perFamily,
    sheetCount: WAVE_ORDER.reduce((n, k) => n + WAVES[k].sheets.length, 0),
    live_inventory_audit: {
      vocab_stems: 6736,
      prop_keys: 5382,
      harvested_keys: 1115,
      bg_keys: 80,
      strict_probe_miss: 140,
      strict_probe_hit: 96,
    },
  };
}

export function filterSafety(cells) {
  const kept = [];
  const skipped = [];
  for (const cell of cells) {
    const hay = [cell.key, cell.concept, cell.brief].join(' ').toLowerCase();
    const hit = [...SAFETY_SKIP_KEYS].find((deny) => new RegExp(`(^|[^a-z0-9])${deny}([^a-z0-9]|$)`).test(hay));
    if (hit) skipped.push({ key: cell.key, reason: `MANUS_SAFETY_DENY:${hit}` });
    else kept.push(cell);
  }
  return { kept, skipped };
}

export function assertWaveIntegrity() {
  const problems = [];
  const expect = {
    [FA]: 18,
    [FB]: 9,
    [FC]: 12,
    [FD]: 12,
    [FE]: 13,
    [FF]: 6,
    [FG]: 6,
    [FH]: 21,
    [FI]: 32,
    [FJ]: 43,
    [FK]: 30,
    [FL]: 15,
  };
  for (const [fam, n] of Object.entries(expect)) {
    if (CELLS[fam].length !== n) problems.push(`${fam} ${CELLS[fam].length} != ${n}`);
  }
  if (WAVES.lt1.sheets.length !== 5) problems.push(`lt1 sheets ${WAVES.lt1.sheets.length} != 5`);
  if (WAVES.lt2.sheets.length !== 5) problems.push(`lt2 sheets ${WAVES.lt2.sheets.length} != 5`);
  if (WAVES.lt3.sheets.length !== 6) problems.push(`lt3 sheets ${WAVES.lt3.sheets.length} != 6`);
  if (WAVES.lt4.sheets.length !== 6) problems.push(`lt4 sheets ${WAVES.lt4.sheets.length} != 6`);
  if (WAVES.lt5.sheets.length !== 3) problems.push(`lt5 sheets ${WAVES.lt5.sheets.length} != 3`);
  if (WAVES.lt6.sheets.length !== 4) problems.push(`lt6 sheets ${WAVES.lt6.sheets.length} != 4`);
  if (WAVES.lt7.sheets.length !== 4) problems.push(`lt7 sheets ${WAVES.lt7.sheets.length} != 4`);
  if (WAVES.lt8.sheets.length !== 2) problems.push(`lt8 sheets ${WAVES.lt8.sheets.length} != 2`);
  if (WAVES.lt9.sheets.length !== 6) problems.push(`lt9 sheets ${WAVES.lt9.sheets.length} != 6`);
  if (WAVES.lt10.sheets.length !== 4) problems.push(`lt10 sheets ${WAVES.lt10.sheets.length} != 4`);
  const totalCells = WAVE_ORDER.reduce((n, k) => n + WAVES[k].sheets.reduce((m, s) => m + s.cells.length, 0), 0);
  if (totalCells !== MANUS_WORTHY.length) problems.push(`wave cells ${totalCells} != MANUS_WORTHY ${MANUS_WORTHY.length}`);
  for (const wave of Object.values(WAVES)) {
    for (const s of wave.sheets) {
      if (s.cells.some((c) => !c)) problems.push(`${wave.id} ${s.id} has empty cell`);
    }
  }
  if (MANUS_WORTHY.length !== 217) problems.push(`MANUS_WORTHY ${MANUS_WORTHY.length} != 217`);
  if (problems.length) throw new Error(`long-tail key integrity: ${problems.join('; ')}`);
}

export function writeClassificationLedger() {
  assertWaveIntegrity();
  const counts = classificationCounts();
  const dest = path.join(ROOT, TRACKED_INV_REL);
  const pileInv = path.join(ROOT, STOCKPILE_REL, 'inventory.json');
  let existing = {};
  for (const p of [pileInv, dest]) {
    if (fs.existsSync(p)) {
      try {
        existing = JSON.parse(fs.readFileSync(p, 'utf8'));
        break;
      } catch {
        existing = {};
      }
    }
  }
  const payload = {
    spec: 'long-tail-stockpile',
    updated_at: new Date().toISOString(),
    no_wiring: true,
    durable_root: STOCKPILE_REL,
    counts,
    have_enough: CANDIDATES.filter((c) => c.classification === 'HAVE_ENOUGH'),
    code_later: CANDIDATES.filter((c) => c.classification === 'CODE_LATER'),
    low_value: CANDIDATES.filter((c) => c.classification === 'LOW_VALUE'),
    manus_worthy: MANUS_WORTHY.map((c) => ({ key: c.key, family: c.family, brief: c.brief })),
    waves: existing.waves || {},
    running_total: existing.running_total || null,
  };
  payload.wave_plan = Object.fromEntries(
    WAVE_ORDER.map((k) => [
      WAVES[k].id,
      {
        title: WAVES[k].title,
        expected_sheets: WAVES[k].sheets.length,
        concept_count: WAVES[k].sheets.reduce((n, s) => n + s.cells.length, 0),
        sheets: WAVES[k].sheets.map((s) => ({
          id: s.id,
          title: s.title,
          format: s.format,
          keys: s.cells.map((c) => c.key),
        })),
      },
    ]),
  );
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(payload, null, 2));
  fs.mkdirSync(path.join(ROOT, STOCKPILE_REL), { recursive: true });
  fs.writeFileSync(pileInv, JSON.stringify(payload, null, 2));
  return dest;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  assertWaveIntegrity();
  const dest = writeClassificationLedger();
  console.log(JSON.stringify({ ok: true, inventory: dest, ...classificationCounts() }, null, 2));
}
