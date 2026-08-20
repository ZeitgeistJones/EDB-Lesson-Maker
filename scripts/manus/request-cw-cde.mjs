/**
 * Content-world stockpile T1-C / T1-D / T1-E.
 * Stockpile only. No producer / picker / recipe wiring.
 *
 *   node scripts/manus/request-cw-cde.mjs --wave=c1 --fire
 *   node scripts/manus/request-cw-cde.mjs --wave=c1 --poll-only
 *   node scripts/manus/request-cw-cde.mjs --next --fire
 *
 * L3 = full-page 16:9 worlds (one PNG per world, NOT a grid of posters).
 * L2 = black-field companion contact sheets.
 * Max 1 in-flight across C/D/E. quality: default only.
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

export const PREFIX = 'cw-';
export const TRACKED_DOC_REL = 'docs/content-worlds-cde.md';
export const BOARD = { width: 1280, height: 590 };
export const FAMILIES = {
  systems: 'harvested/content-worlds/systems-infrastructure',
  cutaways: 'harvested/content-worlds/cutaways',
  missions: 'harvested/content-worlds/story-missions',
};

const LOCK_ROOT = path.join(ROOT, 'harvested/content-worlds');
const LOCK = path.join(LOCK_ROOT, '.inv.lock');
const POLL_MS = 30_000;
const TIMEOUT_MS = 70 * 60 * 1000;
const RATE_WAIT_MS = 90_000;

const WORLD_STYLE = `L3 ADAPTABLE PRESET WORLD — one independent full-bleed 16:9 landscape PNG (~${BOARD.width}×${BOARD.height} ClassIn board).

THIS IS NOT A CONTACT SHEET. The scene fills the entire frame. No gutters. No 2×2 grid. No poster border.

WHAT WE WANT:
- Children's-book / editorial educational illustration. Age-respectful, not babyish. Soft readable color, environmental depth.
- ONE strong visual premise. ONE focal area. Open foreground play zone (~35–50%). One quiet text-safe band (sky / wall / upper-left).
- Visual explanation of HOW something works or a beautiful impossible view or a mission you can see — NOT a labeled diagram.
- Clear ground / water / floor plane. Edge detail, open center.

HARD FAIL:
- Empty diner / garage / kitchen / classroom / farm / post-office counter / fire-station bay / warehouse clones
- Quiet-flat wash, scenic wallpaper, worksheet chrome, title card, infographic panels, answer boxes
- Engineering blueprints, circuit diagrams, exact maps, flags, logos, baked labels, letters, numbers
- Tiny bolts / screws / washers / fasteners
- People as heroes, faces, Mia/Leo fused in (tiny distant unreadable silhouettes OK)
- Overcrowded center

quality: default ONLY (never high).`;

const COMP_STYLE = `L2 COMPANION SHEET — one PNG, pure #000000 black field, 3×3 grid, one isolated object per cell, clear gutters, keyable cutouts.
Large recognizable pieces only (tap, crate, parcel, hydrant, root clump, magnifier). NO tiny bolts/screws. NO text, logos, labels. quality: default ONLY.`;

const DEDUPE = `DO NOT CLONE (already harvested as EMPTY SETTINGS / STAGES):
diner, garage, kitchen, classroom, bedroom, bathroom, living-room, farm barn, supermarket, restaurant, post-office counter, fire-station bay, warehouse empty floor, workshop bay, recording-studio leftover, train-platform, airport-counter, police-station, office.
Those are places. These worlds must show a SYSTEM, an IMPOSSIBLE CUTAWAY, or a MISSION PREMISE inside the scene.`;

function world(slug, brief, archetypes, extra = {}) {
  return {
    key: `${PREFIX}${slug}`,
    concept: slug,
    layer: 'L3',
    role: 'hero-world',
    format: 'fullpage-16x9',
    archetypes,
    brief,
    ...extra,
  };
}

function companion(slug, cells, extra = {}) {
  return {
    key: `${PREFIX}${slug}`,
    concept: slug,
    layer: 'L2',
    role: 'companion-sheet',
    format: 'black-field-3x3',
    cells,
    brief: cells.map((c, i) => `${i + 1}. ${c.key} — ${c.brief}`).join('\n'),
    ...extra,
  };
}

function tok(slug, brief) {
  return { key: `${PREFIX}${slug}`, brief };
}

const C1_WORLDS = [
  world(
    'sys-reservoir-hills',
    'hillside reservoir feeding a small town: lake + dam wall at one edge, canal/stream leaving toward rooftops in the distance, open shore/grass play band in the foreground, visual water-journey landscape NOT a labeled process diagram, no people no text',
    ['sequence', 'route'],
    { subfamily: 'water' },
  ),
  world(
    'sys-water-works-yard',
    'water treatment as a WALKABLE YARD: big round settling tanks, aerator fountains, low buildings at edges, open concrete path kids could stand on, industrial-but-child-safe, NOT pipes-and-arrows infographic, no labels no people',
    ['sequence', 'build-the-world'],
    { subfamily: 'water' },
  ),
  world(
    'sys-street-pipe-cutaway',
    'beautiful impossible view: quiet residential street ABOVE and a dollhouse cutaway BELOW showing a water main, house foundation, and pipes rising into a kitchen wall, soil layers, open foreground curb, NO labels NO blueprints NO tiny bolts',
    ['cutaway', 'overlay'],
    { subfamily: 'water' },
  ),
  world(
    'sys-kitchen-tap-drain',
    'water arriving and leaving: kitchen corner with a tap pouring into a sink, floorboards cut away to show drain pipe dropping down, NOT an empty kitchen stage clone (no full diner/kitchen set), play space on the floor, no people no brand no text',
    ['cutaway', 'prediction'],
    { subfamily: 'water' },
  ),
];
const C1_COMP = companion('sys-water-tokens-3x3', [
  tok('water-tower', 'simple town water tower, still-life, no letters'),
  tok('kitchen-tap', 'single kitchen tap, still-life, no brand'),
  tok('drain-grate', 'round street drain grate, still-life'),
  tok('pipe-elbow-large', 'LARGE pipe elbow, toy-scale, not a tiny bolt'),
  tok('rain-barrel', 'rain barrel with spigot, still-life'),
  tok('garden-hose-reel', 'hose on a reel, still-life'),
  tok('cistern-tank', 'horizontal water tank, still-life'),
  tok('fire-hydrant', 'fire hydrant, no numbers'),
  tok('watering-can', 'watering can, still-life'),
], { subfamily: 'water' });

const C2_WORLDS = [
  world(
    'sys-curbside-bins',
    'neighborhood curbside collection morning: three large unlabelled bins of different lid colors at the curb, houses at edges, open sidewalk/street play band, NOT a recycling-center civic stage clone, no recycling-symbol letters no people',
    ['sort', 'sequence'],
    { subfamily: 'waste' },
  ),
  world(
    'sys-collection-truck-route',
    'garbage truck on a neighborhood ROUTE: truck mid-street, 3–4 houses as stops along a curve, bins waiting, open road play, NOT a garage clone, no logos no people',
    ['route', 'sequence'],
    { subfamily: 'waste' },
  ),
  world(
    'sys-sorting-hall',
    'huge indoor sorting hall: conveyor at back, bale piles at edges, colored chute mouths, wide open floor center like a factory you can walk, visual sorting PLACE not an engineering diagram, no labels no people',
    ['sort', 'build-the-world'],
    { subfamily: 'waste' },
  ),
  world(
    'sys-compost-landfill-compare',
    'SPLIT-WORLD compare: left a warm compost garden with bins and plants, right a landfill hill with covered earth and gulls-as-tiny-shapes, quiet central gutter, no text no people',
    ['compare', 'sequence'],
    { subfamily: 'waste' },
  ),
];
const C2_COMP = companion('sys-waste-tokens-3x3', [
  tok('bin-lid-blue', 'large household bin blue lid, no logo'),
  tok('bin-lid-green', 'large household bin green lid, no logo'),
  tok('bin-lid-grey', 'large household bin grey lid, no logo'),
  tok('compost-caddy', 'kitchen compost caddy, still-life'),
  tok('cardboard-bale', 'tied cardboard bale, still-life'),
  tok('glass-crate', 'crate of bottles, no labels'),
  tok('collection-truck-toy', 'simple side-loader truck toy, no logos'),
  tok('reuse-jar', 'clean empty jar, still-life'),
  tok('leaf-pile', 'rake + leaf pile, still-life'),
], { subfamily: 'waste' });

const C3_WORLDS = [
  world(
    'sys-wind-solar-ridge',
    'energy landscape: ridge with a few wind turbines and a solar field in the valley, dirt path play band, sky text-safe, NOT an infographic of “how electricity is made”, no pylons-as-diagram, no people no text',
    ['sequence', 'compare'],
    { subfamily: 'electricity' },
  ),
  world(
    'sys-substation-neighborhood',
    'neighborhood as a GRID PLACE: fenced substation at one edge, poles and wires along the street, houses, open sidewalk, electricity as a visible town system NOT a wiring schematic, no warning-text, no people',
    ['route', 'cutaway'],
    { subfamily: 'electricity' },
  ),
  world(
    'sys-home-evening-power',
    'dusk house exterior: windows glowing, street lamp on, power arriving as mood not as cables-diagram, porch play space, NOT a bedroom interior clone, no people no text',
    ['prediction', 'compare'],
    { subfamily: 'electricity' },
  ),
  world(
    'sys-save-energy-compare',
    'SPLIT-WORLD: left a wastefully bright empty glass office at night, right a cozy dim home with curtains and one lamp, quiet gutter, no labels no people',
    ['compare', 'prediction'],
    { subfamily: 'electricity' },
  ),
];
const C3_COMP = companion('sys-energy-tokens-3x3', [
  tok('wind-turbine-toy', 'simple wind turbine, still-life'),
  tok('solar-panel', 'one solar panel, still-life'),
  tok('light-switch', 'wall light switch, still-life'),
  tok('lamp-on', 'table lamp glowing, still-life'),
  tok('lamp-off', 'same lamp off, still-life'),
  tok('battery-pack', 'generic battery pack, no brand'),
  tok('power-strip', 'power strip, no text'),
  tok('bicycle-dynamo-light', 'bike light, still-life'),
  tok('plug-unplugged', 'unplugged plug, still-life'),
], { subfamily: 'electricity' });

const C4_WORLDS = [
  world(
    'sys-harvest-morning',
    'farm HARVEST as a journey start: crop rows, filled crates at the edge, open dirt row play, tractor silhouette far back, NOT a generic empty farm/barn stage, no people no animals as heroes no text',
    ['sequence', 'build-the-world'],
    { subfamily: 'food' },
  ),
  world(
    'sys-packing-shed',
    'produce packing shed: conveyor of crates, wash trough at edge, open concrete floor, destination-of-harvest not a diner and not a kitchen, no labels no people',
    ['sequence', 'sort'],
    { subfamily: 'food' },
  ),
  world(
    'sys-market-unload',
    'market BACK LOT unloading: truck tailgate, stacked produce crates, canvas stall edge, open alley play, NOT supermarket interior, NOT diner, no price tags no people',
    ['route', 'sequence'],
    { subfamily: 'food' },
  ),
  world(
    'sys-kitchen-arrival',
    'kitchen as DESTINATION of food: crates of veg on the floor, empty counter play space, grocery bags, NOT the empty kitchen stage and NOT a diner counter, no people no brand',
    ['sequence', 'build-the-world'],
    { subfamily: 'food' },
  ),
];
const C4_COMP = companion('sys-food-tokens-3x3', [
  tok('harvest-crate', 'wooden produce crate, still-life'),
  tok('mesh-onion-bag', 'mesh bag of onions, no text'),
  tok('milk-churn', 'milk churn, still-life'),
  tok('egg-tray', 'egg tray, still-life'),
  tok('flour-sack', 'plain flour sack, no letters'),
  tok('market-scale', 'balance scale, no numbers'),
  tok('shopping-tote', 'cloth tote with veg, no logo'),
  tok('cutting-board-veg', 'board with whole veg, still-life'),
  tok('compost-bowl', 'bowl of peels, still-life'),
], { subfamily: 'food' });

const C5_WORLDS = [
  world(
    'sys-pack-desk',
    'parcel PACKING desk: wrapping paper, empty box, tape, string, open table play, NOT a post-office counter clone, no stamps-with-text no people',
    ['build-the-world', 'sequence'],
    { subfamily: 'logistics' },
  ),
  world(
    'sys-sorting-depot',
    'parcel sorting DEPOT: chutes, hanging bags, rolling cages at edges, huge open floor, distinct from empty warehouse stage, no tracking numbers no people',
    ['sort', 'route'],
    { subfamily: 'logistics' },
  ),
  world(
    'sys-mail-truck-journey',
    'mail truck ROUTE world: curved neighborhood street, 4 house stops, one truck, mailbox flags, path you can follow, NOT a map, NOT a post-office interior, no people no text',
    ['route', 'sequence'],
    { subfamily: 'logistics' },
  ),
  world(
    'sys-mailbox-doorstep',
    'delivery END: porch, mailbox, brown parcel on the mat, open stoop play, NOT mudroom/mail-room clone, no address numbers no people',
    ['sequence', 'reveal'],
    { subfamily: 'logistics' },
  ),
];
const C5_COMP = companion('sys-parcel-tokens-3x3', [
  tok('cardboard-box-open', 'open cardboard box, still-life'),
  tok('cardboard-box-closed', 'closed cardboard box, still-life'),
  tok('padded-envelope', 'padded envelope, no text'),
  tok('packing-tape-dispenser', 'tape dispenser, still-life'),
  tok('twine-spool', 'spool of twine, still-life'),
  tok('rolling-cage', 'mail rolling cage, empty'),
  tok('mailbox-flag', 'mailbox with flag up, no numbers'),
  tok('hand-truck', 'hand truck, still-life'),
  tok('address-label-blank', 'blank sticky label, no letters'),
], { subfamily: 'logistics' });

const C6_WORLDS = [
  world(
    'sys-station-journey',
    'station as JOURNEY START: platform edge, rails curving away toward hills, bench at side, open platform play, NOT an empty train-platform clone (show departure path), no destination text no people',
    ['route', 'sequence'],
    { subfamily: 'transport' },
  ),
  world(
    'sys-transfer-hub',
    'bus–train–bike TRANSFER plaza: painted ground lanes as routes (not a map), shelter, bike rack, bus silhouette, open plaza play, no logos no people no letters',
    ['route', 'compare'],
    { subfamily: 'transport' },
  ),
  world(
    'sys-airport-journey',
    'airport as a PATH through space: drop-off canopy → doors → hall → distant gate windows as one continuous journey, open floor band, NOT airport-counter clone, blank screens, no people no text',
    ['route', 'sequence'],
    { subfamily: 'transport' },
  ),
  world(
    'sys-city-bike-paths',
    'city street with a painted bike lane and a pedestrian path as two visible JOURNEYS, parked bikes at edge, open lane play, NOT generic street-town wallpaper, no signs with letters no people',
    ['route', 'compare'],
    { subfamily: 'transport' },
  ),
];
const C6_COMP = companion('sys-transport-tokens-3x3', [
  tok('ticket-blank', 'blank ticket stub, no letters'),
  tok('paper-transfer', 'blank transfer slip, no text'),
  tok('bike-token', 'simple city bike, still-life'),
  tok('suitcase-rolling', 'rolling suitcase, still-life'),
  tok('platform-clock-blank', 'station clock with NO numerals'),
  tok('bus-stop-flag', 'blank bus-stop flag, no letters'),
  tok('boarding-pass-blank', 'blank boarding pass, no text'),
  tok('route-token-red', 'simple red path token, still-life'),
  tok('route-token-blue', 'simple blue path token, still-life'),
], { subfamily: 'transport' });

const C7_WORLDS = [
  world(
    'sys-newsroom-floor',
    'newsroom FLOOR as a media system start: desks at edges, blank screens, open carpet play, NOT a generic office clone, no headlines no people',
    ['sequence', 'build-the-world'],
    { subfamily: 'media' },
  ),
  world(
    'sys-radio-booth-live',
    'radio booth as BROADCAST: window into a quiet studio, mic, on-air lamp without text, open booth floor, NOT leftover recording-studio setting, no logos no people',
    ['sequence', 'reveal'],
    { subfamily: 'media' },
  ),
  world(
    'sys-film-set',
    'small film set: camera on dolly, soft lights, blank clapper, painted backdrop at back, open mark-on-floor play, no brand no people no slate letters',
    ['build-the-world', 'sequence'],
    { subfamily: 'media' },
  ),
  world(
    'sys-broadcast-livingroom',
    'living room as AUDIENCE END of the media pipeline: sofa, glowing blank TV/radio, remote on table, open rug play, premise is “the show arrived”, NOT empty living-room stage clone, no channel logos no people',
    ['sequence', 'prediction'],
    { subfamily: 'media' },
  ),
];
const C7_COMP = companion('sys-media-tokens-3x3', [
  tok('mic-on-stand', 'microphone on stand, still-life'),
  tok('headphones', 'headphones, still-life'),
  tok('camera-body', 'simple camera, no brand'),
  tok('clapper-blank', 'clapperboard with EMPTY sticks, no letters'),
  tok('boom-mic', 'boom microphone, still-life'),
  tok('photo-print-blank', 'blank photo print, still-life'),
  tok('radio-set', 'table radio, no station text'),
  tok('tv-remote', 'remote, no numbers readable'),
  tok('headphones-off', 'headphones resting, still-life'),
], { subfamily: 'media' });

const C8_WORLDS = [
  world(
    'sys-dispatch-yard',
    'emergency DISPATCH YARD as a city system: ambulance + fire engine + police car staged together at edges, open tarmac play, NOT a fire-station-bay clone (show mixed services), no logos no numbers no people',
    ['compare', 'build-the-world'],
    { subfamily: 'city' },
  ),
  world(
    'sys-street-works',
    'city STREET WORKS: hole in the road, barriers, a water/pipe crew setup at edge, open safe sidewalk play, maintenance as a system, no warning-text no people',
    ['cutaway', 'repair'],
    { subfamily: 'city' },
  ),
  world(
    'sys-park-crew-morning',
    'parks crew staging: mower and rake cart at edge, open lawn play, greenhouse silhouette far, city greening as a service, no people no text',
    ['build-the-world', 'sequence'],
    { subfamily: 'city' },
  ),
  world(
    'sys-night-services',
    'night city services: street sweeper on an empty avenue, lamps glowing, trash bins, open street play, the city working while asleep, no people no signs',
    ['sequence', 'prediction'],
    { subfamily: 'city' },
  ),
];
const C8_COMP = companion('sys-city-tokens-3x3', [
  tok('traffic-cone', 'traffic cone, still-life'),
  tok('barrier-horse', 'sawhorse barrier, no text'),
  tok('manhole-cover', 'manhole cover, no letters'),
  tok('street-sweeper-toy', 'simple street sweeper, no logo'),
  tok('leaf-blower', 'leaf blower, still-life'),
  tok('hose-cart', 'fire hose cart, no numbers'),
  tok('park-bench-empty', 'park bench, still-life'),
  tok('storm-drain', 'curb storm drain, still-life'),
  tok('warning-lamp', 'amber warning lamp, still-life'),
], { subfamily: 'city' });

// Runway C9 — systems already covered electricity/compost/bike-lane/airport/dispatch.
// Net-new: circular REUSE pathway (distinct from waste sorting + compost compare).
const C9_WORLDS = [
  world(
    'sys-thrift-sort-floor',
    'thrift REUSE floor as a circular system: clothing racks at edges, shoe cubbies, open center floor play, donation crates arriving, NOT a supermarket and NOT waste-sorting hall clone, no price tags no people no logos',
    ['sort', 'sequence'],
    { subfamily: 'reuse' },
  ),
  world(
    'sys-refill-station',
    'bulk REFILL station: large dispensers of grains/soap at a wall, empty jars and bottles on an open table, reuse as a place not a diagram, NOT a diner counter, no brand labels no people',
    ['build-the-world', 'sequence'],
    { subfamily: 'reuse' },
  ),
  world(
    'sys-repair-cafe',
    'community REPAIR café as a system: long shared table with broken toys/small appliances at edges, tool wall, open seat play, premise is fixing to reuse, NOT a garage bay clone, no logos no people',
    ['repair', 'build-the-world'],
    { subfamily: 'reuse' },
  ),
  world(
    'sys-swap-rack-yard',
    'neighborhood SWAP yard: freestanding clothing/book racks under a simple roof, empty crate docks, open plaza play, circular reuse end-to-end, no price tags no people no text',
    ['sort', 'route'],
    { subfamily: 'reuse' },
  ),
];
const C9_COMP = companion('sys-reuse-tokens-3x3', [
  tok('donation-crate', 'donation crate, still-life'),
  tok('hanger-empty', 'empty clothes hanger, still-life'),
  tok('refill-jar', 'empty refill jar, still-life'),
  tok('soap-dispenser', 'bulk soap dispenser, no brand'),
  tok('sewing-kit', 'sewing kit closed, still-life'),
  tok('glue-bottle', 'glue bottle, no letters'),
  tok('spare-button-tin', 'tin of buttons, still-life'),
  tok('book-swap', 'stack of blank-spine books, no titles'),
  tok('reuse-tote', 'cloth tote, no logo'),
], { subfamily: 'reuse' });

// Runway C10 — deepen systems already sketched in c3/c6/c8 without cloning those sheets.
const C10_WORLDS = [
  world(
    'sys-plant-to-home',
    'electricity as ONE visual JOURNEY landscape: distant wind/solar ridge → poles along a valley road → glowing village windows at the far end, open roadside play, NOT a wiring schematic and NOT a remake of the c3 split sheets, no people no text',
    ['sequence', 'route'],
    { subfamily: 'electricity' },
  ),
  world(
    'sys-bike-network-hub',
    'city BIKE NETWORK hub: painted color path ribbons leaving a central plaza in 3 directions (routes you can see, NOT a map), bike racks, repair stand at edge, open plaza play, distinct from a single bike-lane street and from FGHI commute sheets, no logos no people',
    ['route', 'compare'],
    { subfamily: 'transport' },
  ),
  world(
    'sys-emergency-route',
    'emergency RESPONSE as a route world: quiet street with a clear path toward a distant smoke plume or fallen tree, one ambulance mid-route, cones guiding, open road play, NOT the dispatch-yard staging clone, no logos no numbers no people',
    ['route', 'prediction'],
    { subfamily: 'city' },
  ),
  world(
    'sys-airport-gate-path',
    'airport JOURNEY continuation: long hall of blank gate windows, moving walkway band, open floor path to a single distant aircraft silhouette at a jet bridge, NOT airport-counter clone and NOT a remake of the drop-off canopy sheet, blank screens, no people no text',
    ['route', 'sequence'],
    { subfamily: 'transport' },
  ),
];
const C10_COMP = companion('sys-c10-tokens-3x3', [
  tok('pylon-toy', 'simple power pylon toy, still-life'),
  tok('glow-window', 'single glowing window pane, still-life'),
  tok('bike-repair-stand', 'bike repair stand, still-life'),
  tok('path-ribbon-token', 'colored path ribbon curl, still-life'),
  tok('ambulance-toy', 'simple ambulance toy, no logos'),
  tok('traffic-cone-pair', 'two traffic cones, still-life'),
  tok('boarding-bridge', 'jet bridge segment, still-life'),
  tok('suitcase-tag-blank', 'luggage tag blank, no letters'),
  tok('flashlight-on', 'flashlight beam tip, still-life'),
], { subfamily: 'transport' });

const D1_WORLDS = [
  world(
    'cut-ocean-depth',
    'beautiful impossible ocean-depth cutaway: bright surface boats tiny at top, fading blue through midwater to dark trench, one large whale-scale silhouette, open water play, NO depth labels NO scale numbers NO people',
    ['cutaway', 'compare', 'reveal'],
    { subfamily: 'ocean' },
  ),
  world(
    'cut-reef-wall',
    'coral reef WALL cutaway: lagoon shallows on the left/top, sudden drop-off wall, caves in the coral, open water, no labels no people',
    ['cutaway', 'seek-and-find'],
    { subfamily: 'ocean' },
  ),
  world(
    'cut-volcano',
    'beautiful volcano CROSS-SECTION: cone, magma chamber, a side vent, snow cap, village-tiny at the foot, NOT a cinematic landscape-only poster and NOT an engineering diagram, no temperature labels no people',
    ['cutaway', 'prediction'],
    { subfamily: 'geology' },
  ),
  world(
    'cut-cave-system',
    'cave SYSTEM cutaway under a hill: surface trees, stacked chambers, underground river, open chamber floors, no people no text',
    ['cutaway', 'route'],
    { subfamily: 'geology' },
  ),
];
const D1_COMP = companion('cut-ocean-volcano-tokens-3x3', [
  tok('submersible-toy', 'small submersible, still-life'),
  tok('coral-chunk', 'coral chunk, still-life'),
  tok('seashell-large', 'large seashell, still-life'),
  tok('lava-glow-stone', 'glowing rock, still-life'),
  tok('obsidian-chunk', 'dark glass rock, still-life'),
  tok('stalactite', 'single stalactite, still-life'),
  tok('flashlight', 'flashlight, still-life'),
  tok('dive-mask', 'dive mask, still-life'),
  tok('sample-jar', 'empty sample jar, still-life'),
], { subfamily: 'ocean' });

const D2_WORLDS = [
  world(
    'cut-house-dollhouse',
    'two-story HOUSE cutaway like a beautiful dollhouse: 4–6 rooms, stairs, attic, basement hint, OPEN floors for play, furniture at edges only, no address numbers no people no text',
    ['cutaway', 'build-the-world', 'reveal'],
    { subfamily: 'buildings' },
  ),
  world(
    'cut-school-wing',
    'SCHOOL wing cutaway: stacked classrooms + hallway + gym hint, lockers as silhouettes, open corridor play, blank boards, no letters no people',
    ['cutaway', 'compare'],
    { subfamily: 'buildings' },
  ),
  world(
    'cut-ship',
    'SHIP cutaway: deck, cabins, cargo hold, engine room as ROOMS not machinery schematics, waterline, open deck play, no flags no name-text no people',
    ['cutaway', 'route'],
    { subfamily: 'vehicles' },
  ),
  world(
    'cut-apartment-stack',
    'apartment building cutaway 4 floors: different rooms stacked, stairwell, street at bottom, open room floors, no numbers on doors no people',
    ['cutaway', 'compare'],
    { subfamily: 'buildings' },
  ),
];
const D2_COMP = companion('cut-building-tokens-3x3', [
  tok('tiny-bed', 'simple bed, still-life'),
  tok('tiny-desk', 'simple desk, still-life'),
  tok('tiny-stove', 'simple stove, still-life'),
  tok('porthole', 'ship porthole, still-life'),
  tok('life-ring', 'life ring, no text'),
  tok('locker-closed', 'school locker, blank, no numbers'),
  tok('stair-section', 'short stair flight, still-life'),
  tok('window-frame', 'empty window frame, still-life'),
  tok('roof-tile-stack', 'stack of roof tiles, still-life'),
], { subfamily: 'buildings' });

const D3_WORLDS = [
  world(
    'cut-tree-roots',
    'TREE + ROOT SYSTEM cutaway: canopy above, trunk, soil layers, spreading roots, a buried stone, open soil/grass play, critters only as tiny unreadable shapes, no labels no people',
    ['cutaway', 'overlay'],
    { subfamily: 'living' },
  ),
  world(
    'cut-anthill',
    'ANTHILL cutaway: mound above, chambers and tunnels below, brood rooms as empty hollows, open dirt play, ants tiny if at all, no labels no people',
    ['cutaway', 'seek-and-find'],
    { subfamily: 'living' },
  ),
  world(
    'cut-street-utilities',
    'UNDERGROUND CITY UTILITIES cutaway: street/sidewalk above, stacked water + sewer + cable ducts + a subway hint, beautiful dollhouse of infrastructure NOT a blueprint, no labels no tiny bolts no people',
    ['cutaway', 'overlay'],
    { subfamily: 'utilities' },
  ),
  world(
    'cut-archaeology-strata',
    'archaeological DIG cutaway: trench, colored soil STRATA, pottery shapes and a stone wall fragment in layers, open trench floor play, NO dates NO dynasty labels no people',
    ['cutaway', 'timeline', 'reveal'],
    { subfamily: 'archaeology' },
  ),
];
const D3_COMP = companion('cut-earth-tokens-3x3', [
  tok('root-clump', 'root clump with soil, still-life'),
  tok('trowel', 'archaeology trowel, still-life'),
  tok('pottery-shard', 'pottery shard, still-life'),
  tok('brush-soft', 'soft dusting brush, still-life'),
  tok('ant-token', 'simple ant token, still-life'),
  tok('leaf-litter', 'leaf litter pile, still-life'),
  tok('cable-duct-section', 'LARGE cable duct section, not a tiny bolt'),
  tok('soil-core', 'layered soil core, still-life, no labels'),
  tok('magnifier', 'magnifying glass, still-life'),
], { subfamily: 'living' });

const D4_WORLDS = [
  world(
    'cut-dam-lake',
    'DAM cutaway: lake above, wall, downstream river, a tiny turbine hall as a ROOM not a machine diagram, open shore play, no water-level numbers no people',
    ['cutaway', 'prediction'],
    { subfamily: 'water' },
  ),
  world(
    'cut-beehive',
    'BEEHIVE cutaway in a tree hollow / hive box: comb chambers, entrance, garden around, open grass play, bees tiny, no labels no people',
    ['cutaway', 'reveal'],
    { subfamily: 'living' },
  ),
  world(
    'cut-earth-wedge',
    'child-safe EARTH WEDGE cutaway: crust, mantle glow, core, oceans and a continent silhouette, beautiful not textbook, NO layer names NO people',
    ['cutaway', 'compare'],
    { subfamily: 'geology' },
  ),
  world(
    'cut-train-cars',
    'TRAIN cutaway of 3 cars: engine cab, passenger, cargo, coupled, rails, open aisle floors, no railway-company text no people',
    ['cutaway', 'sequence'],
    { subfamily: 'vehicles' },
  ),
];
const D4_COMP = companion('cut-wonder-tokens-3x3', [
  tok('honeycomb-chunk', 'honeycomb chunk, still-life'),
  tok('bee-token', 'simple bee token, still-life'),
  tok('dam-gate', 'dam sluice gate, still-life'),
  tok('pebble-core', 'banded pebble, still-life'),
  tok('train-coupling', 'train coupling, LARGE, not a bolt'),
  tok('passenger-seat', 'train seat, still-life'),
  tok('cargo-crate', 'cargo crate, still-life'),
  tok('earth-core-ball', 'simple glowing core ball, still-life'),
  tok('hive-frame', 'hive frame, still-life'),
], { subfamily: 'geology' });

// Runway D5 — skip school/ship/beehive/strata (already in d2–d4). Bridge+greenhouse are net-new.
const D5_WORLDS = [
  world(
    'cut-bridge-span',
    'beautiful BRIDGE cutaway: road deck above, arched piers, river flowing below, a walkway undercroft, open riverbank play, NOT a famous landmark and NOT an engineering stress diagram, no span labels no people',
    ['cutaway', 'route'],
    { subfamily: 'structures' },
  ),
  world(
    'cut-greenhouse',
    'GREENHOUSE cutaway: glass walls and pitched roof, raised soil beds, hanging pots at edges, open center aisle play, vents and water cans as props not labels, NOT an empty farm barn clone, no people no text',
    ['cutaway', 'build-the-world'],
    { subfamily: 'living' },
  ),
  world(
    'cut-mountain-tunnel',
    'MOUNTAIN TUNNEL cutaway: green hillside outside, bored tunnel through rock with light at both ends, road/path through the middle, open approach play, NOT a subway utilities clone, no route numbers no people',
    ['cutaway', 'route'],
    { subfamily: 'structures' },
  ),
  world(
    'cut-library-floors',
    'LIBRARY cutaway stacked floors: reading tables, shelf walls, a stairwell, open carpet floors for play, blank book spines (NO readable titles), NOT a classroom clone, no people no signs',
    ['cutaway', 'compare'],
    { subfamily: 'buildings' },
  ),
];
const D5_COMP = companion('cut-bridge-green-tokens-3x3', [
  tok('arch-brick', 'single arch brick block, still-life'),
  tok('steel-girder-toy', 'LARGE toy girder section, not a bolt'),
  tok('river-boat-toy', 'simple small boat, still-life'),
  tok('glass-pane', 'greenhouse glass pane frame, still-life'),
  tok('seedling-pot', 'seedling in pot, still-life'),
  tok('watering-can-green', 'watering can, still-life'),
  tok('tunnel-portal', 'tunnel portal ring, still-life'),
  tok('library-book-blank', 'closed book, blank spine, no letters'),
  tok('reading-lamp', 'desk reading lamp, still-life'),
], { subfamily: 'structures' });

const E1_WORLDS = [
  world(
    'mis-pack-weather',
    'PACK FOR WEATHER mission: open suitcase on the floor, clothes scattered, WINDOW showing mixed sun AND rain clouds, the premise is packing for changing weather, open rug play, no people no text no packing-list',
    ['build-the-world', 'prediction'],
    { subfamily: 'weather-pack' },
  ),
  world(
    'mis-messy-repair',
    'MESSY REPAIR mission: a room with ONE clearly broken thing (fallen shelf, leaking under-sink, chair with a loose leg) plus a tool caddy at the edge, open floor, premise IN the damage, NOT a garage clone, no people no text',
    ['repair', 'build-the-world'],
    { subfamily: 'repair' },
  ),
  world(
    'mis-missing-item',
    'MISSING ITEM mission: a bedroom or hook-wall where one obvious gap/empty hook/empty shelf cubby is the hole, other objects in place, seek-and-find premise without circling anything, open floor, no people no labels',
    ['seek-and-find', 'reveal'],
    { subfamily: 'missing' },
  ),
  world(
    'mis-delivery-route',
    'ROUTE A DELIVERY mission: slightly elevated neighborhood view (NOT a map), 4 distinct houses, a path, one parcel at the start, open street play, no street names no people',
    ['route', 'sequence'],
    { subfamily: 'delivery' },
  ),
];
const E1_COMP = companion('mis-e1-tokens-3x3', [
  tok('open-suitcase', 'open empty suitcase, still-life'),
  tok('rain-coat', 'raincoat, still-life'),
  tok('sun-hat', 'sun hat, still-life'),
  tok('umbrella-closed', 'closed umbrella, still-life'),
  tok('toolbox', 'toolbox closed, still-life'),
  tok('wrench-large', 'large wrench, not a tiny bolt'),
  tok('lost-glove', 'single glove, still-life'),
  tok('brown-parcel', 'brown parcel, no text'),
  tok('house-token', 'simple house token, still-life'),
], { subfamily: 'weather-pack' });

const E2_WORLDS = [
  world(
    'mis-trip-prep',
    'PREPARE FOR A TRIP: hallway with backpack half-zipped, shoes, a folded blank paper (ticket-shaped, NO letters), open floor, premise is leaving, not a hotel-room clone, no people',
    ['build-the-world', 'sequence'],
    { subfamily: 'trip' },
  ),
  world(
    'mis-wrong-season',
    'WRONG SEASON CLOTHES: chair with a heavy winter coat and boots, WINDOW showing bright beach/summer, the mismatch IS the problem, open floor, no people no text',
    ['repair', 'compare'],
    { subfamily: 'weather-pack' },
  ),
  world(
    'mis-spill-cause',
    'SPILL / WHAT HAPPENED: kitchen floor puddle, three possible causes visible at once (tipped cup, open bag of flour, dripping plant), open floor, no answer boxes no people',
    ['prediction', 'seek-and-find'],
    { subfamily: 'mystery' },
  ),
  world(
    'mis-organize-bench',
    'ORGANIZE THE BENCH: chaotic workbench vs an empty labeled-by-shape-only shelf waiting (NO letters), tools mixed, open floor, NOT a garage clone, no people',
    ['sort', 'repair'],
    { subfamily: 'repair' },
  ),
];
const E2_COMP = companion('mis-e2-tokens-3x3', [
  tok('backpack-open', 'open backpack, still-life'),
  tok('passport-blank', 'blank booklet, no letters'),
  tok('winter-boot', 'winter boot, still-life'),
  tok('flip-flop', 'flip-flop, still-life'),
  tok('tipped-cup', 'tipped cup, still-life'),
  tok('flour-bag-open', 'open flour bag, no text'),
  tok('potted-plant', 'potted plant, still-life'),
  tok('peg-sorter', 'empty peg board, no letters'),
  tok('tool-caddy', 'open tool caddy, still-life'),
], { subfamily: 'trip' });

const E3_WORLDS = [
  world(
    'mis-picnic-plan',
    'PLAN A PICNIC: park blanket half-set, open basket, mixed bright/cloudy sky, missing pieces obvious, open grass play, no people no menus',
    ['build-the-world', 'prediction'],
    { subfamily: 'picnic' },
  ),
  world(
    'mis-habitat-prep',
    'PREPARE A HABITAT: empty tank/terrarium on a table, rocks/plants/water dish waiting at a side dock, open table play, build-the-world, no labels no people',
    ['build-the-world', 'sort'],
    { subfamily: 'habitat' },
  ),
  world(
    'mis-choose-tools',
    'CHOOSE TOOLS FOR A JOB: a leaky bike and an unplanted garden bed in one yard, tool dock at the edge, open grass, premise is picking the right tools, no people no text',
    ['compare', 'repair'],
    { subfamily: 'tools' },
  ),
  world(
    'mis-reconstruct-event',
    'RECONSTRUCT WHAT HAPPENED: living room after a small party, cake crumbs, wrapping, a balloon, chairs moved, sequence clues IN the mess, open rug, no people no captions',
    ['sequence', 'seek-and-find'],
    { subfamily: 'mystery' },
  ),
];
const E3_COMP = companion('mis-e3-tokens-3x3', [
  tok('picnic-basket', 'picnic basket, still-life'),
  tok('thermos', 'thermos, still-life'),
  tok('blanket-folded', 'folded blanket, still-life'),
  tok('terrarium-empty', 'empty glass tank, still-life'),
  tok('river-rock', 'smooth rock, still-life'),
  tok('bike-pump', 'bike pump, still-life'),
  tok('trowel-garden', 'garden trowel, still-life'),
  tok('party-hat', 'party hat, still-life'),
  tok('wrapped-gift', 'wrapped gift, no tag text'),
], { subfamily: 'picnic' });

const E4_WORLDS = [
  world(
    'mis-school-morning',
    'SCHOOL MORNING prep: bedroom, backpack half-packed, clothes on chair, blank clock face (NO numerals), open floor, premise is getting ready, not a generic bedroom clone, no people',
    ['sequence', 'build-the-world'],
    { subfamily: 'school' },
  ),
  world(
    'mis-rescue-objects',
    'RESCUE MISPLACED OBJECTS: kitchen/living mash where things are obviously wrong (book in the fridge gap, shoe on the table, keys in a fruit bowl), open floor, repair premise, no people no labels',
    ['repair', 'seek-and-find'],
    { subfamily: 'repair' },
  ),
  world(
    'mis-reach-destination',
    'HELP REACH THE DESTINATION: a path to a house with three obstacles (puddle, fallen branch, closed gate), open path play, route/problem, no people no signs',
    ['route', 'prediction'],
    { subfamily: 'route' },
  ),
  world(
    'mis-complete-sequence',
    'COMPLETE THE SEQUENCE: a potting-a-plant table with first and last steps visible (empty pot + finished potted plant) and a clearly EMPTY middle space for soil/seed, open table, no labels no people',
    ['sequence', 'build-the-world'],
    { subfamily: 'sequence' },
  ),
];
const E4_COMP = companion('mis-e4-tokens-3x3', [
  tok('lunchbox', 'lunchbox, still-life, no brand'),
  tok('homework-folder-blank', 'blank folder, no letters'),
  tok('house-key', 'key, still-life'),
  tok('storybook-closed', 'closed picture book, no title'),
  tok('apple-fruit', 'apple, still-life'),
  tok('fallen-branch', 'fallen branch, still-life'),
  tok('gate-closed', 'small garden gate closed, still-life'),
  tok('seed-packet-blank', 'blank seed packet, no letters'),
  tok('hand-trowel-soil', 'trowel with soil, still-life'),
], { subfamily: 'school' });

// Runway E5 — mission premises for systems themes; do not remint e1–e4 keys.
const E5_WORLDS = [
  world(
    'mis-blackout-pack',
    'BLACKOUT mission: dusk living room with lights dead, flashlight and candles on a table, open rug play, premise is coping without power, NOT empty living-room stage clone, no people no text',
    ['prediction', 'build-the-world'],
    { subfamily: 'power' },
  ),
  world(
    'mis-flat-tire-path',
    'FLAT TIRE on a bike path: bike leaned over, flat rear tire obvious, pump and patch kit docked at the edge, open path play, repair premise IN the scene, NOT a garage clone, no people no logos',
    ['repair', 'route'],
    { subfamily: 'bike' },
  ),
  world(
    'mis-lost-luggage',
    'LOST LUGGAGE reclaim: airport belt with ONE odd suitcase left circling, empty claim area play floor, blank screens, seek-and-find premise, NOT airport-counter clone, no people no text',
    ['seek-and-find', 'prediction'],
    { subfamily: 'airport' },
  ),
  world(
    'mis-storm-kit',
    'STORM KIT prep: hallway table with radio, water jugs, blanket, empty bag waiting to be packed, WINDOW showing dark weather, open floor, build-the-world premise, no people no checklists',
    ['build-the-world', 'prediction'],
    { subfamily: 'emergency' },
  ),
];
const E5_COMP = companion('mis-e5-tokens-3x3', [
  tok('candle-lit', 'lit candle, still-life'),
  tok('battery-lantern', 'battery lantern, still-life'),
  tok('bike-pump-floor', 'bike pump, still-life'),
  tok('tire-patch-kit', 'patch kit tin, no text'),
  tok('odd-suitcase', 'bright suitcase, no logo'),
  tok('luggage-tag-blank', 'blank luggage tag, no letters'),
  tok('weather-radio', 'small radio, no station text'),
  tok('water-jug', 'water jug, still-life'),
  tok('emergency-blanket', 'folded emergency blanket, still-life'),
], { subfamily: 'emergency' });

function pack(id, family, stream, title, subfamily, worlds, companionSheet) {
  return {
    id,
    family,
    stream,
    title,
    subfamily,
    worlds,
    companion: companionSheet,
    outputs: [...worlds, companionSheet],
  };
}

export const WAVES = {
  c1: pack('cw-c1-water', 'systems', 'C', 'CW T1-C water system worlds + companions', 'water', C1_WORLDS, C1_COMP),
  c2: pack('cw-c2-waste', 'systems', 'C', 'CW T1-C waste system worlds + companions', 'waste', C2_WORLDS, C2_COMP),
  c3: pack('cw-c3-electricity', 'systems', 'C', 'CW T1-C electricity worlds + companions', 'electricity', C3_WORLDS, C3_COMP),
  c4: pack('cw-c4-food', 'systems', 'C', 'CW T1-C food farm-to-kitchen worlds + companions', 'food', C4_WORLDS, C4_COMP),
  c5: pack('cw-c5-logistics', 'systems', 'C', 'CW T1-C post/logistics worlds + companions', 'logistics', C5_WORLDS, C5_COMP),
  c6: pack('cw-c6-transport', 'systems', 'C', 'CW T1-C transport journey worlds + companions', 'transport', C6_WORLDS, C6_COMP),
  c7: pack('cw-c7-media', 'systems', 'C', 'CW T1-C media pipeline worlds + companions', 'media', C7_WORLDS, C7_COMP),
  c8: pack('cw-c8-city', 'systems', 'C', 'CW T1-C city services worlds + companions', 'city', C8_WORLDS, C8_COMP),
  c9: pack('cw-c9-reuse', 'systems', 'C', 'CW T1-C circular reuse worlds + companions', 'reuse', C9_WORLDS, C9_COMP),
  c10: pack('cw-c10-network-route', 'systems', 'C', 'CW T1-C plant-to-home/bike-hub/emergency/airport route worlds + companions', 'transport', C10_WORLDS, C10_COMP),
  d1: pack('cw-d1-ocean-volcano', 'cutaways', 'D', 'CW T1-D ocean/volcano/cave cutaways + companions', 'ocean', D1_WORLDS, D1_COMP),
  d2: pack('cw-d2-buildings', 'cutaways', 'D', 'CW T1-D house/school/ship/apartment cutaways + companions', 'buildings', D2_WORLDS, D2_COMP),
  d3: pack('cw-d3-roots-utilities', 'cutaways', 'D', 'CW T1-D tree-root/anthill/utilities/strata cutaways + companions', 'living', D3_WORLDS, D3_COMP),
  d4: pack('cw-d4-dam-earth', 'cutaways', 'D', 'CW T1-D dam/hive/earth/train cutaways + companions', 'geology', D4_WORLDS, D4_COMP),
  d5: pack('cw-d5-bridge-greenhouse', 'cutaways', 'D', 'CW T1-D bridge/greenhouse/tunnel/library cutaways + companions', 'structures', D5_WORLDS, D5_COMP),
  e1: pack('cw-e1-core-missions', 'missions', 'E', 'CW T1-E pack/repair/missing/delivery missions + companions', 'weather-pack', E1_WORLDS, E1_COMP),
  e2: pack('cw-e2-trip-spill', 'missions', 'E', 'CW T1-E trip/wrong-season/spill/organize missions + companions', 'trip', E2_WORLDS, E2_COMP),
  e3: pack('cw-e3-picnic-tools', 'missions', 'E', 'CW T1-E picnic/habitat/tools/reconstruct missions + companions', 'picnic', E3_WORLDS, E3_COMP),
  e4: pack('cw-e4-school-path', 'missions', 'E', 'CW T1-E school/rescue/path/sequence missions + companions', 'school', E4_WORLDS, E4_COMP),
  e5: pack('cw-e5-power-path', 'missions', 'E', 'CW T1-E blackout/flat-tire/luggage/storm-kit missions + companions', 'emergency', E5_WORLDS, E5_COMP),
};

export const WAVE_ORDER = [
  'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10',
  'd1', 'd2', 'd3', 'd4', 'd5',
  'e1', 'e2', 'e3', 'e4', 'e5',
];

function familyDir(wave) {
  return path.join(ROOT, FAMILIES[wave.family]);
}

function expectedSheets(wave) {
  return wave.outputs.length;
}

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function isRateLimitError(err) {
  const msg = String(err && err.message ? err.message : err);
  return /\b429\b/.test(msg) || /rate limit/i.test(msg) || /resource_exhausted/i.test(msg);
}

async function withRateBackoff(fn) {
  try {
    return await fn();
  } catch (err) {
    if (!isRateLimitError(err)) throw err;
    const wait = RATE_WAIT_MS;
    console.error(`429 — waiting ${wait / 1000}s then one retry`);
    await new Promise((r) => setTimeout(r, wait));
    try {
      return await fn();
    } catch (err2) {
      if (!isRateLimitError(err2)) throw err2;
      const wait2 = wait * 2;
      console.error(`429 again — backing off ${wait2 / 1000}s, not firing more`);
      await new Promise((r) => setTimeout(r, wait2));
      throw err2;
    }
  }
}

function liveRun(runPath) {
  if (!fs.existsSync(runPath)) return false;
  try {
    const prev = JSON.parse(fs.readFileSync(runPath, 'utf8'));
    return Boolean(prev.task_id && !prev.finished_at);
  } catch {
    return false;
  }
}

function otherInFlight(thisWaveId) {
  for (const rel of Object.values(FAMILIES)) {
    const root = path.join(ROOT, rel);
    if (!fs.existsSync(root)) continue;
    for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      if (ent.name === thisWaveId) continue;
      const runPath = path.join(root, ent.name, 'run.json');
      if (liveRun(runPath)) {
        const prev = JSON.parse(fs.readFileSync(runPath, 'utf8'));
        return { wave: prev.wave || ent.name, task_id: prev.task_id };
      }
    }
  }
  return null;
}

function buildBrief(wave) {
  const worldBlocks = wave.worlds.map((w, i) => {
    const n = String(i + 1).padStart(2, '0');
    return `WORLD ${i + 1} — filename ${n}-${w.key}.png — FULL-PAGE 16:9 (entire frame is this one scene; NOT a grid).
Key: ${w.key}
Archetypes: ${w.archetypes.join(', ')}
Brief: ${w.brief}`;
  }).join('\n\n');
  const c = wave.companion;
  const compN = String(wave.worlds.length + 1).padStart(2, '0');
  return withEslAssetGeneratorBrief(`TASK: Produce **${expectedSheets(wave)} PNG files** for ClassIn ESL content-world stockpile ${wave.id}.

${wave.worlds.length} files are L3 FULL-PAGE WORLDS.
1 file is an L2 BLACK-FIELD 3×3 COMPANION SHEET.

GENERATE CALL PLAN:
- Call 1: the ${wave.worlds.length} independent 16:9 world PNGs (one scene per image; never pack worlds into a grid).
- Call 2: the single companion contact sheet.
Keep firing generate_image inside THIS task until every listed PNG exists. The 5-image cap is per call, not per task.

${WORLD_STYLE}

${DEDUPE}

STREAM ${wave.stream} — ${wave.title}
Subfamily: ${wave.subfamily}

HARD RULES:
- Generate ONLY the listed worlds + one companion sheet. Do not review, research, broaden, or add concepts.
- NO baked readable text, labels, numbers, logos, maps, flags, worksheets, answer boxes.
- NO tiny bolts/screws/washers.
- quality: default ONLY.

${worldBlocks}

COMPANION SHEET — filename ${compN}-${c.key}.png
${COMP_STYLE}
Key: ${c.key}
Cells left→right, top→bottom:
${c.brief}

Return PNGs, preferably one zip plus CDN links. No essay.`);
}

function collectImageAtts(messages) {
  const hits = [];
  for (const m of messages || []) {
    const b = m.assistant_message || (m.type === 'assistant_message' ? m : null);
    if (!b) continue;
    for (const a of b.attachments || []) {
      const url = a.url || a.download_url || a.file_url;
      if (url) hits.push({ url, name: a.file_name || a.filename || a.name || 'sheet.png' });
    }
  }
  return hits;
}

function sniffKind(buf, name = '') {
  const n = String(name).toLowerCase();
  if (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b) return 'zip';
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (n.endsWith('.zip')) return 'zip';
  if (n.endsWith('.png')) return 'png';
  return 'other';
}

function safeName(name, fallback) {
  const base = path.basename(String(name || fallback).replace(/\\/g, '/'));
  return base.replace(/[^a-zA-Z0-9._-]+/g, '-') || fallback;
}

function walkPngs(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkPngs(p));
    else if (/\.png$/i.test(ent.name)) out.push(p);
  }
  return out;
}

function extractZip(zipPath, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const r = spawnSync('tar', ['-xf', zipPath, '-C', outDir], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (r.status === 0) return;
  const ps = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `Expand-Archive -LiteralPath ${JSON.stringify(zipPath)} -DestinationPath ${JSON.stringify(outDir)} -Force`,
    ],
    { encoding: 'utf8', windowsHide: true },
  );
  if (ps.status !== 0) {
    throw new Error(
      `Failed to extract zip (tar: ${r.stderr || r.status}; Expand-Archive: ${ps.stderr || ps.status})`,
    );
  }
}

function clearNumberedSheets(sheetDir) {
  if (!fs.existsSync(sheetDir)) return;
  for (const f of fs.readdirSync(sheetDir)) {
    if (/^\d{2}(-.*)?\.(png|jpg|jpeg|webp)$/i.test(f) && !fs.statSync(path.join(sheetDir, f)).isDirectory()) {
      fs.unlinkSync(path.join(sheetDir, f));
    }
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

function splitWorldCompanion(wave, saved, outDir) {
  const worldsDir = path.join(outDir, 'worlds');
  const compsDir = path.join(outDir, 'companions');
  fs.mkdirSync(worldsDir, { recursive: true });
  fs.mkdirSync(compsDir, { recursive: true });
  const large = saved.filter((s) => s.bytes > 80_000);
  const worldCount = wave.worlds.length;
  large.forEach((s, i) => {
    if (i < worldCount) {
      const dest = path.join(worldsDir, s.file);
      fs.copyFileSync(s.dest, dest);
    } else {
      const dest = path.join(compsDir, s.file);
      fs.copyFileSync(s.dest, dest);
    }
  });
}

function provenance(wave, item, dump) {
  return {
    asset_id: item.key,
    content_world: wave.family === 'systems' ? 'systems-infrastructure' : wave.family === 'cutaways' ? 'cutaways' : 'story-missions',
    subfamily: item.subfamily || wave.subfamily,
    asset_layer: item.layer,
    page_archetype: item.archetypes || [],
    variant_role: item.role,
    manus_task_id: dump.task_id || null,
    generation_date: dump.finished_at || dump.created_at || new Date().toISOString(),
    digital_source_type: 'generative_ai',
    rights_status: 'original_generated',
    factual_review_required: wave.family === 'cutaways',
    cultural_review_required: false,
    map_review_required: false,
    review_status: 'raw',
  };
}

function recomputeTotals(inv) {
  const waves = Object.values(inv.waves || {});
  const items = waves.flatMap((w) => w.items || []);
  inv.running_total = {
    pass: items.filter((it) => it.review_status === 'pass' || it.qa_status === 'PASS').length,
    hold: items.filter((it) => it.review_status === 'hold' || it.qa_status === 'HOLD').length,
    raw: items.filter((it) => it.review_status === 'raw' || (!it.qa_status && it.status === 'generated_raw')).length,
    worlds: items.filter((it) => it.layer === 'L3').length,
    companions: items.filter((it) => it.layer === 'L2').length,
    sheets_downloaded: waves.reduce((n, w) => n + (w.sheets || []).length, 0),
    tasks_used: waves.filter((w) => w.task_id).length,
  };
}

async function withInvLock(fn) {
  fs.mkdirSync(LOCK_ROOT, { recursive: true });
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

function loadFamilyInv(wave) {
  const invPath = path.join(familyDir(wave), 'inventory.json');
  if (!fs.existsSync(invPath)) {
    return {
      kind: `content-worlds-${wave.family}`,
      prefix: PREFIX,
      waves: {},
      running_total: {},
    };
  }
  return JSON.parse(fs.readFileSync(invPath, 'utf8'));
}

function writeFamilyInv(wave, inv) {
  inv.updated_at = new Date().toISOString();
  if (!inv.waves) inv.waves = {};
  recomputeTotals(inv);
  fs.mkdirSync(familyDir(wave), { recursive: true });
  const invPath = path.join(familyDir(wave), 'inventory.json');
  fs.writeFileSync(invPath, JSON.stringify(inv, null, 2));
  return invPath;
}

function loadAllInv() {
  const out = {};
  for (const [fam, rel] of Object.entries(FAMILIES)) {
    const invPath = path.join(ROOT, rel, 'inventory.json');
    if (fs.existsSync(invPath)) out[fam] = JSON.parse(fs.readFileSync(invPath, 'utf8'));
    else out[fam] = { waves: {}, running_total: {} };
  }
  return out;
}

function combinedTotals(all) {
  const acc = {
    tasks_used: 0, sheets_downloaded: 0, worlds: 0, companions: 0, pass: 0, hold: 0, raw: 0,
  };
  for (const inv of Object.values(all)) {
    const t = inv.running_total || {};
    for (const k of Object.keys(acc)) acc[k] += t[k] || 0;
  }
  return acc;
}

function writeDocStub() {
  const all = loadAllInv();
  const tot = combinedTotals(all);
  const lines = [
    '# Content worlds C / D / E — systems, cutaways, missions',
    '',
    'Stockpile only. No producer wiring.',
    '',
    '- Runner: `scripts/manus/request-cw-cde.mjs`',
    '- Prefix: `cw-`',
    '- Partitions: `harvested/content-worlds/systems-infrastructure/` · `cutaways/` · `story-missions/`',
    '- Layer: **L2 companions** + **L3 adaptable worlds**. Little/no L4 posters.',
    '- Max 1 in-flight. quality: default only.',
    '',
    '## Family-depth audit',
    '',
    '| Family | Verdict | Skip clones |',
    '|---|---|---|',
    '| Water infrastructure (C) | MISSING vs A+B water-cycle stages | not kitchen; not `spa1-water-l2` cycle |',
    '| Waste / electricity systems | MISSING | not recycling-bin icons |',
    '| Food / post / transport / media / city | PARTIAL empty stages | not diner/garage/post-office/fire-bay |',
    '| Cutaway wonders | THIN object cutaways | not still-life apple/house icons |',
    '| Story missions | MISSING | not empty story settings |',
    '',
    '## Running totals',
    '',
    `| Metric | Count |`,
    `|---|---:|`,
    `| Tasks | ${tot.tasks_used} |`,
    `| Sheets downloaded | ${tot.sheets_downloaded} |`,
    `| L3 worlds | ${tot.worlds} |`,
    `| L2 companion sheets | ${tot.companions} |`,
    `| PASS | ${tot.pass} |`,
    `| HOLD | ${tot.hold} |`,
    `| RAW | ${tot.raw} |`,
    '',
    '## Waves',
    '',
  ];
  for (const name of WAVE_ORDER) {
    const spec = WAVES[name];
    const inv = all[spec.family] || { waves: {} };
    const w = (inv.waves || {})[spec.id];
    if (!w) {
      lines.push(`- **${spec.id}** — unfired — worlds ${spec.worlds.length} — companion 1`);
      continue;
    }
    const holds = (w.holds || []).length ? ` — HOLD ${w.holds.join('; ')}` : '';
    lines.push(`- **${spec.id}** — ${w.task_url || 'unfired'} — sheets ${w.sheets?.length || 0}/${w.expected_sheets || 0}${holds}`);
  }
  lines.push('', '## QA notes', '', '- Stockpile only. No producer wiring.', '- Visual QA records PASS/HOLD on inventory items.', '');
  fs.writeFileSync(path.join(ROOT, TRACKED_DOC_REL), `${lines.join('\n')}\n`);
}

function upsertInventory(wave, dump) {
  const inv = loadFamilyInv(wave);
  const haveLarge = (dump.saved || []).filter((s) => s.bytes > 80_000).length >= expectedSheets(wave);
  const prevByKey = Object.fromEntries(((inv.waves[wave.id] || {}).items || []).map((it) => [it.key, it]));
  const items = wave.outputs.map((c) => {
    const prev = prevByKey[c.key] || {};
    const qa = prev.qa_status || c.qa_status || null;
    const note = prev.qa_note || (haveLarge ? 'Raw downloaded; visual QA must record PASS or HOLD.' : null);
    return {
      ...c,
      status: haveLarge ? 'generated_raw' : dump.task_id ? 'fired' : 'pending',
      qa_status: qa,
      review_status: qa ? String(qa).toLowerCase() : 'raw',
      qa_note: note,
      path: dump.sheet_dir || null,
      manus_task_id: dump.task_id || null,
      ...provenance(wave, c, dump),
      review_status: qa ? String(qa).toLowerCase() : 'raw',
    };
  });
  inv.waves[wave.id] = {
    family: wave.family,
    stream: wave.stream,
    title: wave.title,
    subfamily: wave.subfamily,
    task_id: dump.task_id || null,
    task_url: dump.task_url || null,
    agent_status: dump.agent_status || null,
    sheet_dir: dump.sheet_dir || null,
    expected_sheets: expectedSheets(wave),
    concept_count: items.length,
    sheets: (dump.saved || []).map((s) => ({ file: s.file || path.basename(s.dest || ''), bytes: s.bytes, name: s.name || null })),
    items,
    holds: [
      ...new Set([
        ...((inv.waves[wave.id] || {}).holds || []),
        ...(dump.holds || []),
        ...items.filter((it) => it.qa_status === 'HOLD').map((it) => `${it.key}: ${it.qa_note || 'HOLD'}`),
      ]),
    ],
    finished_at: dump.finished_at || null,
  };
  const p = writeFamilyInv(wave, inv);
  writeDocStub();
  return p;
}

export function nextUnfiredWave() {
  for (const name of WAVE_ORDER) {
    const wave = WAVES[name];
    const runPath = path.join(familyDir(wave), wave.id, 'run.json');
    if (!fs.existsSync(runPath)) return name;
    try {
      const prev = JSON.parse(fs.readFileSync(runPath, 'utf8'));
      if (!prev.task_id) return name;
    } catch {
      return name;
    }
  }
  return null;
}

export async function runWave(waveName) {
  const wave = WAVES[waveName];
  if (!wave) throw new Error(`Need --wave=${WAVE_ORDER.join('|')}`);

  const OUT_DIR = path.join(familyDir(wave), wave.id);
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
        stream: wave.stream,
        family: wave.family,
        subfamily: wave.subfamily,
        prefix: PREFIX,
        expected_sheets: NEED_SHEETS,
        worlds: wave.worlds.map((w) => ({ key: w.key, archetypes: w.archetypes, layer: w.layer })),
        companion: { key: wave.companion.key, cells: wave.companion.cells.map((c) => c.key) },
      },
      null,
      2,
    ),
  );

  const BRIEF = buildBrief(wave);
  let taskId = arg('task');
  const dump = {
    started_at: new Date().toISOString(),
    kind: 'content-worlds-cde',
    wave: wave.id,
    stream: wave.stream,
    family: wave.family,
    sheet_dir: SHEET_DIR,
    expected_sheets: NEED_SHEETS,
  };

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
      console.error(`REFUSING fire — max 1 in-flight. ${busy.wave} ${busy.task_id} still open`);
      process.exit(3);
    }
    const created = await withRateBackoff(() => createTask({
      title: wave.title,
      agent_profile: resolveAgentProfile(),
      force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
      interactive_mode: false,
      message: BRIEF,
    }));
    taskId = created.task_id || created.id;
    dump.task_id = taskId;
    dump.task_url = created.task_url || `https://manus.im/app/${taskId}`;
    dump.created_at = new Date().toISOString();
    fs.writeFileSync(RUN_JSON, JSON.stringify({ ...dump, brief: BRIEF }, null, 2));
    await withInvLock(() => upsertInventory(wave, dump));
    console.log(JSON.stringify({ phase: 'created', ...dump }, null, 2));
    if (fireOnly) return dump;
  } else {
    if (!taskId && fs.existsSync(RUN_JSON)) {
      const prev = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8'));
      taskId = prev.task_id;
      dump.started_at = prev.started_at || dump.started_at;
      dump.task_url = prev.task_url;
      dump.created_at = prev.created_at;
    }
    if (!taskId) throw new Error('--poll-only needs --task= or an existing run.json');
    dump.task_id = taskId;
    dump.task_url = dump.task_url || `https://manus.im/app/${taskId}`;
  }

  let result = await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
  let msgs = await listMessages(taskId, { order: 'asc', limit: 120 });
  let saved = await downloadSheets(msgs.messages || [], SHEET_DIR);
  let large = saved.filter((s) => s.bytes > 80_000);

  if (large.length < NEED_SHEETS) {
    console.log(JSON.stringify({ phase: 'need-more-sheets', have: large.length, need: NEED_SHEETS }, null, 2));
    await withRateBackoff(() => sendMessage(taskId, {
      force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
      message: withEslAssetGeneratorBrief(
        `Continue THIS task. You returned ${large.length} usable PNG(s); we need exactly ${NEED_SHEETS}: ${wave.worlds.length} independent full-page 16:9 world PNGs (NOT a grid) plus 1 black-field 3×3 companion sheet. Do not restart. Do not add text. Do not change the key list. Keep firing generate_image until every listed file exists.`,
      ),
    }));
    result = await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
    msgs = await listMessages(taskId, { order: 'asc', limit: 120 });
    saved = await downloadSheets(msgs.messages || [], SHEET_DIR);
    large = saved.filter((s) => s.bytes > 80_000);
  }

  dump.saved = saved;
  dump.agent_status = result && result.agent_status;
  dump.finished_at = new Date().toISOString();
  if (large.length < NEED_SHEETS) {
    dump.holds = [`Downloaded ${large.length}/${NEED_SHEETS} large PNGs; raw kept for mop.`];
  }
  if (fs.existsSync(RUN_JSON)) {
    const prev = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8'));
    dump.started_at = prev.started_at || dump.started_at;
    dump.created_at = prev.created_at;
    dump.task_url = dump.task_url || prev.task_url;
    dump.brief = prev.brief;
  }
  splitWorldCompanion(wave, saved, OUT_DIR);
  fs.writeFileSync(RUN_JSON, JSON.stringify(dump, null, 2));
  const invPath = await withInvLock(() => upsertInventory(wave, dump));
  const largeCount = saved.filter((s) => s.bytes > 80_000).length;
  console.log(
    JSON.stringify(
      {
        phase: 'downloaded',
        wave: wave.id,
        stream: wave.stream,
        task_id: taskId,
        task_url: dump.task_url,
        count: saved.length,
        large: largeCount,
        expected_sheets: NEED_SHEETS,
        sheet_dir: SHEET_DIR,
        inventory: invPath,
      },
      null,
      2,
    ),
  );
  if (largeCount < NEED_SHEETS) process.exitCode = 2;
  return dump;
}

const isMain = process.argv[1] && path.normalize(process.argv[1]).endsWith('request-cw-cde.mjs');
if (isMain) {
  apiKey();
  let names = (arg('wave', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (process.argv.includes('--next') && !names.length) {
    const n = nextUnfiredWave();
    if (!n) throw new Error('All C/D/E waves already have task_ids');
    names = [n];
  }
  if (!names.length) throw new Error(`Need --wave=${WAVE_ORDER.join('|')} or --next (comma-ok)`);
  for (const n of names) {
    await runWave(n);
  }
}
