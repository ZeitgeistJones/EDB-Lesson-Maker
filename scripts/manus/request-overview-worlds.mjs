/**
 * Overview-worlds AGGRO stockpile — FULL-PAGE mini-worlds only.
 * Sibling lane to kid-interest. Stockpile only. No producer wiring.
 * PNG under harvested/overview-worlds/ — do NOT git-add.
 *
 *   node scripts/manus/request-overview-worlds.mjs --audit-only
 *   node scripts/manus/request-overview-worlds.mjs --wave=ow-wave7-canal-ferry --fire
 *   node scripts/manus/request-overview-worlds.mjs --wave=ow-wave7-canal-ferry --poll-only
 *   node scripts/manus/request-overview-worlds.mjs --next --fire
 *   node scripts/manus/request-overview-worlds.mjs --loop
 *   node scripts/manus/request-overview-worlds.mjs --doc-only
 *
 * Lane concurrency: prefer 2 in-flight for overview-worlds.
 * Repo soft-cap: refuse fire when ≥5 live Manus tasks (excl. _harvested_aside).
 * Prior waves 1–3 live in request-kid-interest-shift60.mjs (already harvested).
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
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

export const OW_REL = 'harvested/overview-worlds';
export const KI_REL = 'harvested/kid-interest';
export const TRACKED_DOC_REL = 'docs/overview-worlds-log.md';
export const INV_REL = 'docs/overview-worlds-inventory.json';
export const OW_PREFIX = 'ow-';
export const BOARD = { width: 1280, height: 590 };
/** Prefer 2 concurrent OW tasks. */
export const LANE_PREFER = 2;
/** Soft refuse at this many live tasks across scanned stockpiles. */
export const REPO_SOFT_CAP = 5;
/** Hard refuse. */
export const REPO_HARD_CAP = 6;

const OW_ROOT = path.join(ROOT, OW_REL);
const KI_ROOT = path.join(ROOT, KI_REL);
const LOCK = path.join(OW_ROOT, '.inv-ow.lock');
const POLL_MS = 30_000;
const TIMEOUT_MS = 70 * 60 * 1000;
const RATE_WAIT_MS = 90_000;
const LOOP_SLEEP_MS = 45_000;

const STYLE = `STYLE LOCK: ONE coherent child-friendly ClassIn ESL house style — clean sparse vector / soft-matte educational illustration. Same line weight, palette, padding. No photorealism, no glossy 3D, no sticker-pack chaos.
TEXT LOCK: BLANK / text-free. No English words, captions, labels, letters, numbers, logos, brands, UI chrome, fake readable screens, watermarks.
IP LOCK: NO brands, NO licensed characters, NO social logos, NO Pokémon-like creatures.
AGE LOCK: Pre-A1→B2 age-respectful — modern places OK; not preschool-only baby towns.
STOCKPILE LOCK: raw Manus sheets only. Do not wire into lessons/producer.
QUALITY: default only.
SCALE: BOARD-SCALE for a ~${BOARD.width}×${BOARD.height} ClassIn board.`;

const OVERVIEW = `FULL-PAGE OVERVIEW WORLD — one landscape PNG (~16:9, board-readable). Multi-zone explorable place (3–7 clear zones) with paths and open negative space for drag play. NOT a technical map, NOT a dense micro-city, NOT a contact grid. No people as subjects. No text/labels/logos/map symbols. One visual identity. Soft children's-book illustration. Projected ClassIn readability.`;

function owCell(slug, brief) {
  return { key: `${OW_PREFIX}${slug}`, concept: slug, brief };
}

function sh(id, title, cells) {
  return { id, title, format: 'full-page-overview', cells };
}

function wave(id, opts) {
  return {
    id,
    family_id: opts.family_id || id,
    title: opts.title,
    lane: 'overview',
    stockpile: 'overview-worlds',
    bucket: opts.bucket || 'other-discovered',
    in_prompt_named: Boolean(opts.in_prompt_named),
    novelty: opts.novelty || (opts.in_prompt_named ? 'prompt-direction' : 'discovered-new'),
    why: opts.why || '',
    sheets: opts.sheets,
  };
}

/** Aggressive runway — invent strong worlds beyond seed list. */
export const WAVES = {
  'ow-wave7-canal-ferry': wave('ow-wave7-canal-ferry', {
    bucket: 'transport',
    family_id: `${OW_PREFIX}wave7`,
    in_prompt_named: true,
    novelty: 'mixed',
    title: 'OW wave7 — monorail park + canal village + ferry terminal (FULL-PAGE ×3)',
    why: 'Transport overviews; invent beyond sibling station/airport/mountain',
    sheets: [
      sh('S1', 'monorail park overview', [
        owCell(
          'monorail-park',
          `${OVERVIEW} City monorail park loop: elevated track curve, station platform blank, park plaza below, playground edge, connecting path. 5 zones. No logos. No people/text.`,
        ),
      ]),
      sh('S2', 'canal lock village overview', [
        owCell(
          'canal-lock-village',
          `${OVERVIEW} Canal lock village: lock chamber, towpath, small boat basin, bridge crossing, riverside green. 5 zones. Clear water path. NEW discovery. No people/text.`,
        ),
      ]),
      sh('S3', 'ferry island terminal overview', [
        owCell(
          'ferry-island-terminal',
          `${OVERVIEW} Ferry island terminal: pier ramp, waiting plaza, ticket-booth shapes (BLANK), shoreline path, small harbor cove. 5 zones. Open plaza for drag. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave8-fantasy': wave('ow-wave8-fantasy', {
    bucket: 'fantasy',
    family_id: `${OW_PREFIX}wave8`,
    novelty: 'discovered-new',
    title: 'OW wave8 — cloud castle + crystal cave + dragon cliffs (FULL-PAGE ×3)',
    why: 'Fantasy mini-worlds — invent beyond treehouse; soft not scary',
    sheets: [
      sh('S1', 'cloud castle archipelago', [
        owCell(
          'cloud-castle',
          `${OVERVIEW} Soft cloud-castle archipelago: main keep terrace, floating garden, bridge between clouds, landing pad, open sky plaza. 5 zones. Friendly pastel fantasy. No people/text.`,
        ),
      ]),
      sh('S2', 'crystal cave plaza', [
        owCell(
          'crystal-cave-plaza',
          `${OVERVIEW} Crystal cave plaza: glowing crystal grove, stone walkway, underground pool shelf, alcove nooks, open central pad. 5 zones. Soft glow, not horror. No people/text. NEW.`,
        ),
      ]),
      sh('S3', 'friendly dragon cliffs', [
        owCell(
          'dragon-cliffs',
          `${OVERVIEW} Friendly dragon roost cliffs: cliff terrace, nest platform (empty eggs shapes OK), cave mouth, winding switchback path, meadow lookout. 5 zones. Cute not scary. No people/text. NEW.`,
        ),
      ]),
    ],
  }),

  'ow-wave9-event': wave('ow-wave9-event', {
    bucket: 'event',
    family_id: `${OW_PREFIX}wave9`,
    novelty: 'discovered-new',
    title: 'OW wave9 — sports day + lantern fair + school open day (FULL-PAGE ×3)',
    why: 'Event campus overviews — blank banners only',
    sheets: [
      sh('S1', 'sports day field', [
        owCell(
          'sports-day-field',
          `${OVERVIEW} School sports-day field: track oval, sand pit, equipment row, spectator shade tents (blank), open center field. 5 zones. No logos/numbers on track. No people/text.`,
        ),
      ]),
      sh('S2', 'lantern autumn fair', [
        owCell(
          'lantern-autumn-fair',
          `${OVERVIEW} Autumn lantern fair: stall lane, glowing lantern trees, stage circle, snack plaza, connecting path. 5 zones. Warm dusk. Blank stall fronts. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'school open campus', [
        owCell(
          'school-open-campus',
          `${OVERVIEW} School open-day campus: main courtyard, classroom wing exterior, playground edge, garden path, welcome plaza. 5 zones. Blank doors/signs. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave10-nature': wave('ow-wave10-nature', {
    bucket: 'nature-adventure',
    family_id: `${OW_PREFIX}wave10`,
    novelty: 'discovered-new',
    title: 'OW wave10 — canyon camp + waterfall gorge + desert oasis (FULL-PAGE ×3)',
    why: 'Nature-adventure breadth beyond island/treehouse',
    sheets: [
      sh('S1', 'canyon camp trail', [
        owCell(
          'canyon-camp',
          `${OVERVIEW} Canyon camp trail: overlook ledge, tent cluster pad, switchback path, stream shelf, open mesa pad. 5 zones. Adventure-light. No people/text.`,
        ),
      ]),
      sh('S2', 'waterfall gorge', [
        owCell(
          'waterfall-gorge',
          `${OVERVIEW} Waterfall gorge: upper viewpoint, mist pool, rock stepping path, fern alcove, open picnic shelf. 5 zones. Clear water + paths. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'desert oasis ruins', [
        owCell(
          'desert-oasis-ruins',
          `${OVERVIEW} Desert oasis with soft ruins: palm pool, ruined arch courtyard, dune path, shade tent pad, open sand play circle. 5 zones. Kid-friendly archaeology vibe. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave11-town': wave('ow-wave11-town', {
    bucket: 'town-community',
    family_id: `${OW_PREFIX}wave11`,
    novelty: 'discovered-new',
    title: 'OW wave11 — main street + library garden + rooftop neighborhood (FULL-PAGE ×3)',
    why: 'Town-community depth beyond festival/market',
    sheets: [
      sh('S1', 'main street block', [
        owCell(
          'main-street-block',
          `${OVERVIEW} Friendly main-street block: shop fronts (BLANK windows), sidewalk plaza, crosswalk pad, parklet corner, alley garden path. 5 zones. Open street for drag. No people/text.`,
        ),
      ]),
      sh('S2', 'library garden campus', [
        owCell(
          'library-garden',
          `${OVERVIEW} Library garden campus: library building exterior, reading lawn, fountain plaza, tree path, quiet nook benches. 5 zones. Blank facade. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'rooftop neighborhood', [
        owCell(
          'rooftop-neighborhood',
          `${OVERVIEW} Connected rooftop neighborhood: roof garden, laundry-line terrace (blank sheets), skybridge, water-tower pad, open roof plaza. 5 zones. Soft city. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave12-leisure': wave('ow-wave12-leisure', {
    bucket: 'leisure',
    family_id: `${OW_PREFIX}wave12`,
    novelty: 'discovered-new',
    title: 'OW wave12 — boardwalk + mountain lodge + play atrium yard (FULL-PAGE ×3)',
    why: 'Leisure beyond skate/marina/maker',
    sheets: [
      sh('S1', 'beach boardwalk', [
        owCell(
          'beach-boardwalk',
          `${OVERVIEW} Beach boardwalk: wooden pier walk, stall row (blank), sand play zone, tide-line path, shade pavilion. 5 zones. Sunny leisure. No people/text.`,
        ),
      ]),
      sh('S2', 'mountain lodge village', [
        owCell(
          'mountain-lodge-village',
          `${OVERVIEW} Mountain lodge village: lodge porch, fire-pit circle, trailhead, snow-play meadow, cabin row edge. 5 zones. Cozy. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'play complex courtyard', [
        owCell(
          'play-atrium-yard',
          `${OVERVIEW} Indoor-play complex exterior courtyard: glass atrium edge, soft-play yard, picnic tables pad, path ring, climbing-structure silhouette zone. 5 zones. Blank signage. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave13-discovered': wave('ow-wave13-discovered', {
    bucket: 'other-discovered',
    family_id: `${OW_PREFIX}wave13`,
    novelty: 'discovered-new',
    title: 'OW wave13 — dino dig + farm adventure + zoo campus (FULL-PAGE ×3)',
    why: '≥40% novelty lane — invent kid-magnet worlds not in seeds',
    sheets: [
      sh('S1', 'dinosaur dig site', [
        owCell(
          'dino-dig-site',
          `${OVERVIEW} Friendly dinosaur dig site: excavation pit, tent lab pad, fossil display shelf (generic bones), dirt path, open dig pad. 5 zones. Educational-cute, not scary. No people/text.`,
        ),
      ]),
      sh('S2', 'farm adventure yard', [
        owCell(
          'farm-adventure-yard',
          `${OVERVIEW} Farm adventure yard: barn exterior, veggie garden beds, animal-pen shapes (empty), tractor path, open hay-bale plaza. 5 zones. Kid farm day. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'zoo campus overview', [
        owCell(
          'zoo-campus',
          `${OVERVIEW} Friendly zoo campus overview: entrance plaza, savanna paddock edge, aquarium wing exterior, picnic grove, path ring. 5 zones. Blank signs. Generic animals as distant shapes OK. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave14-wheels-water': wave('ow-wave14-wheels-water', {
    bucket: 'transport',
    family_id: `${OW_PREFIX}wave14`,
    novelty: 'discovered-new',
    title: 'OW wave14 — bike hub + seaplane dock + tram village (FULL-PAGE ×3)',
    why: 'More transport — bike/seaplane/tram; avoid sibling station/airport',
    sheets: [
      sh('S1', 'bike trail hub', [
        owCell(
          'bike-trail-hub',
          `${OVERVIEW} Bike trail hub: repair stand pad, trail fork paths, picnic grove, small pump-track oval, open plaza. 5 zones. No logos. No people/text.`,
        ),
      ]),
      sh('S2', 'seaplane dock overview', [
        owCell(
          'seaplane-dock',
          `${OVERVIEW} Lakeside seaplane dock: floating pier, hangar shed, shoreline path, cafe terrace blank, open water pad. 5 zones. Soft travel. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'tram village overview', [
        owCell(
          'tram-village',
          `${OVERVIEW} Hill tram village: tram car on rails, upper plaza, lower market square blank, switchback path, overlook. 5 zones. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave15-fantasy2': wave('ow-wave15-fantasy2', {
    bucket: 'fantasy',
    family_id: `${OW_PREFIX}wave15`,
    novelty: 'discovered-new',
    title: 'OW wave15 — moonbase + magic greenhouse + coral plaza (FULL-PAGE ×3)',
    why: 'Second fantasy pass — sci-fi soft + underwater',
    sheets: [
      sh('S1', 'moonbase playground', [
        owCell(
          'moonbase-playground',
          `${OVERVIEW} Soft moonbase playground: dome habitat, crater sand pad, rover path, antenna farm edge, open lunar plaza. 5 zones. Cute sci-fi. No people/text.`,
        ),
      ]),
      sh('S2', 'magic greenhouse maze', [
        owCell(
          'magic-greenhouse',
          `${OVERVIEW} Magic greenhouse maze: glasshouse exterior, glowing plant beds, hedge path loops, fountain center, open garden pad. 5 zones. Whimsical not spooky. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'underwater coral plaza', [
        owCell(
          'coral-plaza',
          `${OVERVIEW} Underwater coral plaza: coral arches, sandy play circle, shipwreck shelf (friendly), kelp path, open blue pad. 5 zones. Soft aqua fantasy. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave16-event2': wave('ow-wave16-event2', {
    bucket: 'event',
    family_id: `${OW_PREFIX}wave16`,
    novelty: 'discovered-new',
    title: 'OW wave16 — carnival midway + kite meadow + ice cream park (FULL-PAGE ×3)',
    why: 'More event/leisure magnets — generic rides only',
    sheets: [
      sh('S1', 'carnival midway', [
        owCell(
          'carnival-midway',
          `${OVERVIEW} Gentle carnival midway: carousel silhouette (no logos), game-booth row blank, cotton-candy cart shapes, central plaza, path. 5 zones. Soft evening lights. No people/text.`,
        ),
      ]),
      sh('S2', 'kite hill meadow', [
        owCell(
          'kite-hill-meadow',
          `${OVERVIEW} Kite hill meadow: hilltop open pad, wind sock (blank), picnic slope, trail down, flower edge. 4–5 zones. Open sky for play. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'ice cream park', [
        owCell(
          'ice-cream-park',
          `${OVERVIEW} Ice-cream park: scoop-shop exterior blank, sundae plaza, splash pad edge, picnic lawn, path. 5 zones. Summer treat vibe. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave17-nature2': wave('ow-wave17-nature2', {
    bucket: 'nature-adventure',
    family_id: `${OW_PREFIX}wave17`,
    novelty: 'discovered-new',
    title: 'OW wave17 — rainforest canopy + arctic camp + hot springs (FULL-PAGE ×3)',
    why: 'Final nature stretch toward 40-world soft target',
    sheets: [
      sh('S1', 'rainforest canopy walk', [
        owCell(
          'rainforest-canopy',
          `${OVERVIEW} Rainforest canopy walk: rope bridge, tree platform, waterfall glimpse, ground clearing, trail. 5 zones. Lush adventure. No people/text.`,
        ),
      ]),
      sh('S2', 'arctic research camp', [
        owCell(
          'arctic-camp',
          `${OVERVIEW} Soft arctic research camp: igloo/dome cluster, ice path, aurora-view lookout, sled pad, open snow plaza. 5 zones. Cozy cold. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'volcanic hot springs', [
        owCell(
          'hot-springs-terrace',
          `${OVERVIEW} Gentle volcanic hot-springs terrace: steaming pools, rock path, bamboo/forest edge, rest pavilion, open mist plaza. 5 zones. Calm spa-adventure. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave18-storybook': wave('ow-wave18-storybook', {
    bucket: 'fantasy',
    family_id: `${OW_PREFIX}wave18`,
    novelty: 'discovered-new',
    title: 'OW wave18 — pirate cove + clockwork town + soft haunted manor (FULL-PAGE ×3)',
    why: 'Storybook fantasy — invent beyond cloud/crystal/moonbase',
    sheets: [
      sh('S1', 'pirate cove village', [
        owCell(
          'pirate-cove-village',
          `${OVERVIEW} Friendly pirate cove village: wooden pier with blank flag shapes, ship deck pad, cave mouth, palm path, open sand plaza. 5 zones. Soft adventure not scary. No people/text.`,
        ),
      ]),
      sh('S2', 'clockwork tower town', [
        owCell(
          'clockwork-tower-town',
          `${OVERVIEW} Clockwork tower town: giant gear plaza, clock-tower exterior (blank face — no numerals), workshop alley, bridge over canal, open courtyard. 5 zones. Whimsical steampunk-light. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'soft haunted manor grounds', [
        owCell(
          'haunted-manor-grounds',
          `${OVERVIEW} Soft haunted-manor grounds: manor porch, misty garden path, pumpkin patch pad, gate arch, open lawn. 5 zones. Cute Halloween-light not horror. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave19-civic': wave('ow-wave19-civic', {
    bucket: 'town-community',
    family_id: `${OW_PREFIX}wave19`,
    novelty: 'discovered-new',
    title: 'OW wave19 — fire campus + hospital garden + police plaza (FULL-PAGE ×3)',
    why: 'Civic helper campuses for ESL community themes',
    sheets: [
      sh('S1', 'fire station campus', [
        owCell(
          'fire-station-campus',
          `${OVERVIEW} Fire-station campus: garage bay, training tower, truck apron pad, hose-drill yard, path. 5 zones. Blank doors/signs. No people/text.`,
        ),
      ]),
      sh('S2', 'hospital garden campus', [
        owCell(
          'hospital-garden',
          `${OVERVIEW} Hospital garden campus: soft clinic wing exterior, healing garden, ambulance bay pad, cafe terrace blank, path. 5 zones. Calm caring vibe. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'community police plaza', [
        owCell(
          'police-community-plaza',
          `${OVERVIEW} Friendly community police plaza: station exterior, bike-patrol pad, neighborhood map kiosk (BLANK), playground edge, open plaza. 5 zones. Soft civic. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave20-funstrip': wave('ow-wave20-funstrip', {
    bucket: 'leisure',
    family_id: `${OW_PREFIX}wave20`,
    novelty: 'discovered-new',
    title: 'OW wave20 — cinema plaza + roller rink + bowling strip (FULL-PAGE ×3)',
    why: 'Indoor-fun leisure strip — invent beyond boardwalk/lodge',
    sheets: [
      sh('S1', 'cinema plaza', [
        owCell(
          'cinema-plaza',
          `${OVERVIEW} Cinema plaza: theater marquee shape (ZERO letters), ticket booth blank, popcorn cart pad, poster wall blank, open plaza. 5 zones. Evening soft lights. No people/text.`,
        ),
      ]),
      sh('S2', 'roller rink park', [
        owCell(
          'roller-rink-park',
          `${OVERVIEW} Outdoor roller-rink park: oval rink, skate-rental shed blank, snack stand, path ring, open lawn. 5 zones. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'bowling alley strip', [
        owCell(
          'bowling-alley-strip',
          `${OVERVIEW} Bowling-alley strip exterior: alley facade blank, shoe-rental porch, arcade edge (blank screens), parking plaza pad, path. 5 zones. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave21-wetlands': wave('ow-wave21-wetlands', {
    bucket: 'nature-adventure',
    family_id: `${OW_PREFIX}wave21`,
    novelty: 'discovered-new',
    title: 'OW wave21 — mangrove walk + glacier lake + bird cliffs (FULL-PAGE ×3)',
    why: 'Nature breadth — wetlands/ice/coastal cliffs',
    sheets: [
      sh('S1', 'mangrove boardwalk', [
        owCell(
          'mangrove-boardwalk',
          `${OVERVIEW} Mangrove boardwalk: raised wooden path, root thicket, observation deck, kayak launch shelf, open water pad. 5 zones. Lush wet. No people/text.`,
        ),
      ]),
      sh('S2', 'glacier lake valley', [
        owCell(
          'glacier-lake',
          `${OVERVIEW} Glacier lake valley: turquoise lake shore, ice tongue edge, trail, picnic rock, open pebble plaza. 5 zones. Soft cold adventure. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'bird cliff coast', [
        owCell(
          'bird-cliff-coast',
          `${OVERVIEW} Soft bird-cliff coast: cliff lookout, nest shelves (empty/generic), beach path, tide pools, open sand pad. 5 zones. Distant bird shapes OK. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave22-festivals': wave('ow-wave22-festivals', {
    bucket: 'event',
    family_id: `${OW_PREFIX}wave22`,
    novelty: 'discovered-new',
    title: 'OW wave22 — book fair + food-truck plaza + parade block (FULL-PAGE ×3)',
    why: 'More event campuses — blank banners only',
    sheets: [
      sh('S1', 'book fair tent city', [
        owCell(
          'book-fair-tents',
          `${OVERVIEW} Book-fair tent city: tent lanes, reading lawn, story-stage circle, blank banner poles, connecting path. 5 zones. Soft literary vibe. No people/text.`,
        ),
      ]),
      sh('S2', 'food truck plaza', [
        owCell(
          'food-truck-plaza',
          `${OVERVIEW} Food-truck plaza: truck row (blank menus), picnic tables pad, stage corner, string-light path, open center. 5 zones. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'parade route block', [
        owCell(
          'parade-route-block',
          `${OVERVIEW} Parade route town block: street center pad, sidewalk viewing strip, float-park corner, bandstand edge, cross street path. 5 zones. Blank storefronts. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave23-transit3': wave('ow-wave23-transit3', {
    bucket: 'transport',
    family_id: `${OW_PREFIX}wave23`,
    novelty: 'discovered-new',
    title: 'OW wave23 — subway plaza + cable-car bay + RV campground (FULL-PAGE ×3)',
    why: 'Transit depth beyond monorail/ferry/tram',
    sheets: [
      sh('S1', 'subway plaza', [
        owCell(
          'subway-plaza',
          `${OVERVIEW} Subway plaza: stair descent, plaza canopy, bike racks, cafe kiosk blank, open pad. 5 zones. Soft urban. No logos/text/people.`,
        ),
      ]),
      sh('S2', 'cable car bay', [
        owCell(
          'cable-car-bay',
          `${OVERVIEW} Cable-car bay: waterfront terminal, hanging cars on cable, boarding plaza, hillside path, open dock pad. 5 zones. Scenic. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'RV campground loop', [
        owCell(
          'rv-campground',
          `${OVERVIEW} RV campground loop: pull-through pads, campfire circle, amenity shed blank, trail fork, open meadow. 5 zones. Soft road-trip. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave24-maker-media': wave('ow-wave24-maker-media', {
    bucket: 'other-discovered',
    family_id: `${OW_PREFIX}wave24`,
    novelty: 'discovered-new',
    title: 'OW wave24 — robot lab + film backlot + planetarium garden (FULL-PAGE ×3)',
    why: 'Discovered maker/media worlds not in seeds',
    sheets: [
      sh('S1', 'robot lab campus', [
        owCell(
          'robot-lab-campus',
          `${OVERVIEW} Robot-lab campus: glass lab wing, outdoor test track oval, parts shed, demo plaza, path. 5 zones. Cute tech. Blank screens. No people/text.`,
        ),
      ]),
      sh('S2', 'kid film backlot', [
        owCell(
          'film-backlot',
          `${OVERVIEW} Kid-friendly film backlot: fake Western street blank, soundstage exterior, prop shed, craft-services picnic, open plaza. 5 zones. Soft movie-set. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'planetarium night garden', [
        owCell(
          'planetarium-garden',
          `${OVERVIEW} Planetarium night garden: dome exterior, star-path walk, telescope pad, glowing plant beds, open plaza. 5 zones. Soft dusk/night. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave25-candy-toy': wave('ow-wave25-candy-toy', {
    bucket: 'fantasy',
    family_id: `${OW_PREFIX}wave25`,
    novelty: 'discovered-new',
    title: 'OW wave25 — candy kingdom + toy attic + paper village (FULL-PAGE ×3)',
    why: 'Playful fantasy — invent beyond pirate/clockwork',
    sheets: [
      sh('S1', 'candy kingdom plaza', [
        owCell(
          'candy-kingdom',
          `${OVERVIEW} Soft candy-kingdom plaza: gingerbread gate, lollipop grove, frosting fountain, sweet-shop fronts blank, open plaza. 5 zones. Cute not sticky chaos. No people/text.`,
        ),
      ]),
      sh('S2', 'giant toy attic world', [
        owCell(
          'toy-attic-world',
          `${OVERVIEW} Giant toy-attic world: oversized blocks, train-set track loop, dollhouse exterior, trunk path, open rug plaza. 5 zones. Whimsical scale play. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'paper craft village', [
        owCell(
          'paper-craft-village',
          `${OVERVIEW} Paper-craft village: origami roofs, folded-bridge path, paper-lantern grove (blank), craft table pad, open square. 5 zones. Soft handmade vibe. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave26-sports2': wave('ow-wave26-sports2', {
    bucket: 'leisure',
    family_id: `${OW_PREFIX}wave26`,
    novelty: 'discovered-new',
    title: 'OW wave26 — baseball diamond + golf driving + climbing gym yard (FULL-PAGE ×3)',
    why: 'More leisure sports campuses beyond sports-complex/waterpark',
    sheets: [
      sh('S1', 'baseball diamond park', [
        owCell(
          'baseball-diamond',
          `${OVERVIEW} Baseball diamond park: dirt infield, outfield grass, dugout benches blank, batting-cage edge, open foul-line pad. 5 zones. No numbers/logos. No people/text.`,
        ),
      ]),
      sh('S2', 'golf driving range', [
        owCell(
          'golf-driving-range',
          `${OVERVIEW} Golf driving range: tee-bay row blank, ball basket pad, green target flags (blank), path, picnic shade. 5 zones. Soft leisure. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'climbing gym courtyard', [
        owCell(
          'climbing-gym-yard',
          `${OVERVIEW} Climbing-gym courtyard: outdoor boulder wall, rope-tower silhouette, gear shed blank, crash-pad plaza, path. 5 zones. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave27-market': wave('ow-wave27-market', {
    bucket: 'town-community',
    family_id: `${OW_PREFIX}wave27`,
    novelty: 'discovered-new',
    title: 'OW wave27 — farmers market + flea alley + flower market (FULL-PAGE ×3)',
    why: 'Town market depth beyond harbor/shopping district',
    sheets: [
      sh('S1', 'farmers market square', [
        owCell(
          'farmers-market',
          `${OVERVIEW} Farmers market square: canopy stall rows blank, produce crates, fountain plaza, truck unload pad, path. 5 zones. Blank awnings. No people/text.`,
        ),
      ]),
      sh('S2', 'flea market alley', [
        owCell(
          'flea-market-alley',
          `${OVERVIEW} Flea-market alley: treasure tables, vintage trunk stacks, hanging-rug lane (blank patterns), courtyard, connecting path. 5 zones. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'flower market courtyard', [
        owCell(
          'flower-market',
          `${OVERVIEW} Flower market courtyard: bloom buckets, greenhouse shed edge, wrapping table pad, path ring, open plaza. 5 zones. Soft color. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave28-wilderness': wave('ow-wave28-wilderness', {
    bucket: 'nature-adventure',
    family_id: `${OW_PREFIX}wave28`,
    novelty: 'discovered-new',
    title: 'OW wave28 — lava tube cave + redwood trail + salt flat (FULL-PAGE ×3)',
    why: 'Wild nature invent — beyond canyon/rainforest/arctic',
    sheets: [
      sh('S1', 'lava tube cave mouth', [
        owCell(
          'lava-tube-cave',
          `${OVERVIEW} Lava-tube cave mouth: dark tunnel entrance, rocky approach path, torch-sconce shapes blank, overlook ledge, open ash plaza. 5 zones. Soft adventure not scary. No people/text.`,
        ),
      ]),
      sh('S2', 'redwood trail camp', [
        owCell(
          'redwood-trail',
          `${OVERVIEW} Redwood trail camp: giant trunk bases, boardwalk path, fern clearing, trail fork, open needle plaza. 5 zones. Tall calm forest. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'salt flat playa', [
        owCell(
          'salt-flat-playa',
          `${OVERVIEW} Salt-flat playa: cracked white ground, distant mountains, shade tent pad, path tracks, open play circle. 4–5 zones. Surreal soft. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave29-fairytale2': wave('ow-wave29-fairytale2', {
    bucket: 'fantasy',
    family_id: `${OW_PREFIX}wave29`,
    novelty: 'discovered-new',
    title: 'OW wave29 — beanstalk tower + mushroom village + ice palace (FULL-PAGE ×3)',
    why: 'More fairy-tale fantasy beyond candy/pirate/cloud',
    sheets: [
      sh('S1', 'beanstalk tower grounds', [
        owCell(
          'beanstalk-tower',
          `${OVERVIEW} Beanstalk tower grounds: giant vine trunk, spiral climb pads, cloud ledge, cottage garden edge, open meadow plaza. 5 zones. Soft fairy-tale. No people/text.`,
        ),
      ]),
      sh('S2', 'mushroom village', [
        owCell(
          'mushroom-village',
          `${OVERVIEW} Mushroom village: toadstool houses, moss path, tiny bridge over stream, glow-cap grove, open ring plaza. 5 zones. Cute woodland fantasy. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'ice palace terrace', [
        owCell(
          'ice-palace',
          `${OVERVIEW} Soft ice-palace terrace: crystal gate, frozen fountain, ice-slide edge, snow garden path, open courtyard. 5 zones. Sparkly not cold-scary. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave30-campus': wave('ow-wave30-campus', {
    bucket: 'town-community',
    family_id: `${OW_PREFIX}wave30`,
    novelty: 'discovered-new',
    title: 'OW wave30 — university quad + art school yard + music conservatory (FULL-PAGE ×3)',
    why: 'Learn campuses beyond aquarium/museum/makerspace',
    sheets: [
      sh('S1', 'university quad', [
        owCell(
          'university-quad',
          `${OVERVIEW} University quad: lawn center, library facade blank, bike racks, cafe terrace blank, path cross. 5 zones. Soft campus. No people/text.`,
        ),
      ]),
      sh('S2', 'art school courtyard', [
        owCell(
          'art-school-yard',
          `${OVERVIEW} Art-school courtyard: studio wing, outdoor sculpture pads (blank forms), kiln shed, paint-wall blank, open plaza. 5 zones. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'music conservatory grounds', [
        owCell(
          'music-conservatory',
          `${OVERVIEW} Music conservatory grounds: recital hall exterior, practice-wing porch, outdoor amphitheater seats, instrument-garden path, open plaza. 5 zones. Blank posters. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave31-waterways': wave('ow-wave31-waterways', {
    bucket: 'transport',
    family_id: `${OW_PREFIX}wave31`,
    novelty: 'discovered-new',
    title: 'OW wave31 — river barge dock + lighthouse cove + dry dock yard (FULL-PAGE ×3)',
    why: 'Water transport invent beyond ferry/canal/seaplane',
    sheets: [
      sh('S1', 'river barge dock', [
        owCell(
          'river-barge-dock',
          `${OVERVIEW} River barge dock: long pier, cargo crates blank, crane silhouette, riverside path, open loading plaza. 5 zones. Soft industrial-cute. No people/text.`,
        ),
      ]),
      sh('S2', 'lighthouse cove', [
        owCell(
          'lighthouse-cove',
          `${OVERVIEW} Lighthouse cove: striped lighthouse (no letters), rocky shore path, keeper cottage, tide-pool shelf, open beach pad. 5 zones. Scenic. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'ship dry dock yard', [
        owCell(
          'dry-dock-yard',
          `${OVERVIEW} Ship dry-dock yard: dry-dock basin, hull cradle, tool shed blank, pier walk, open yard plaza. 5 zones. Kid shipyard vibe. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave32-seasons': wave('ow-wave32-seasons', {
    bucket: 'event',
    family_id: `${OW_PREFIX}wave32`,
    novelty: 'discovered-new',
    title: 'OW wave32 — spring blossom fair + summer splash fest + autumn harvest (FULL-PAGE ×3)',
    why: 'Seasonal event worlds — invent beyond winter/lantern/carnival',
    sheets: [
      sh('S1', 'spring blossom fair', [
        owCell(
          'blossom-fair',
          `${OVERVIEW} Spring blossom fair: petal-tree lanes, picnic blankets pad, photo-arch blank, stall row blank, path. 5 zones. Soft pink/green. No people/text.`,
        ),
      ]),
      sh('S2', 'summer splash festival', [
        owCell(
          'splash-festival',
          `${OVERVIEW} Summer splash festival: foam-pad zone, water-balloon stand blank, sprinkler plaza, shade tents, path. 5 zones. Hot-day fun. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'autumn harvest fair', [
        owCell(
          'harvest-fair',
          `${OVERVIEW} Autumn harvest fair: pumpkin patch, hay-bale maze edge, cider stall blank, corn-stalk lane, open plaza. 5 zones. Warm fall. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave33-discovered2': wave('ow-wave33-discovered2', {
    bucket: 'other-discovered',
    family_id: `${OW_PREFIX}wave33`,
    novelty: 'discovered-new',
    title: 'OW wave33 — escape-room plaza + escape garden maze + treasure hunt fort (FULL-PAGE ×3)',
    why: 'Discovered play-hunt worlds not in seeds',
    sheets: [
      sh('S1', 'escape room plaza', [
        owCell(
          'escape-room-plaza',
          `${OVERVIEW} Escape-room plaza exterior: themed door bank blank, clue-locker wall blank, waiting bench pad, neon-arch shape (no letters), open plaza. 5 zones. Soft mystery. No people/text.`,
        ),
      ]),
      sh('S2', 'hedge maze garden', [
        owCell(
          'hedge-maze-garden',
          `${OVERVIEW} Hedge-maze garden: maze entrance, fountain center glimpse, topiary path, bench nook, open lawn pad. 5 zones. Clear destinations. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'treasure hunt fort', [
        owCell(
          'treasure-hunt-fort',
          `${OVERVIEW} Treasure-hunt fort grounds: wooden fort, map-table pad (BLANK map — no letters), rope climb, secret-tunnel mouth, open courtyard. 5 zones. Adventure play. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave34-night': wave('ow-wave34-night', {
    bucket: 'leisure',
    family_id: `${OW_PREFIX}wave34`,
    novelty: 'discovered-new',
    title: 'OW wave34 — night market alley + rooftop cinema + glow garden (FULL-PAGE ×3)',
    why: 'Night leisure invent beyond harbor-night/cinema',
    sheets: [
      sh('S1', 'night market alley', [
        owCell(
          'night-market-alley',
          `${OVERVIEW} Night market alley: glowing stall lane blank, steam-cart shapes, lantern string path, side courtyard, open plaza. 5 zones. Warm night. No people/text.`,
        ),
      ]),
      sh('S2', 'rooftop cinema', [
        owCell(
          'rooftop-cinema',
          `${OVERVIEW} Rooftop cinema: blank screen wall, beanbag seating pad, snack cart blank, city-skyline edge, open roof plaza. 5 zones. Soft evening. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'bioluminescent glow garden', [
        owCell(
          'glow-garden',
          `${OVERVIEW} Soft bioluminescent glow garden: glowing plant beds, winding path, pond shelf, gazebo pad, open plaza. 5 zones. Magical night. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave35-village': wave('ow-wave35-village', {
    bucket: 'town-community',
    family_id: `${OW_PREFIX}wave35`,
    novelty: 'discovered-new',
    title: 'OW wave35 — fishing village + pottery lane + bakery square (FULL-PAGE ×3)',
    why: 'Small-town craft villages beyond main-street/market',
    sheets: [
      sh('S1', 'fishing village harbor', [
        owCell(
          'fishing-village',
          `${OVERVIEW} Fishing village harbor: net racks, small boats, fish-shed blank, shore path, open dock plaza. 5 zones. Soft coastal town. No people/text.`,
        ),
      ]),
      sh('S2', 'pottery craft lane', [
        owCell(
          'pottery-lane',
          `${OVERVIEW} Pottery craft lane: kiln shed, wheel-yard pad, clay-shelf wall blank, drying racks, open courtyard. 5 zones. Handmade vibe. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'bakery square', [
        owCell(
          'bakery-square',
          `${OVERVIEW} Bakery square: bakery facade blank, outdoor oven pad, cafe tables, flower boxes, open plaza. 5 zones. Warm cozy. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave36-extreme': wave('ow-wave36-extreme', {
    bucket: 'nature-adventure',
    family_id: `${OW_PREFIX}wave36`,
    novelty: 'discovered-new',
    title: 'OW wave36 — zipline valley + cave rafting + sand dune park (FULL-PAGE ×3)',
    why: 'Adventure invent beyond wilderness wave28',
    sheets: [
      sh('S1', 'zipline valley', [
        owCell(
          'zipline-valley',
          `${OVERVIEW} Zipline valley: launch tower, cable lines, landing pad, forest trail, open meadow plaza. 5 zones. Soft adventure. No people/text.`,
        ),
      ]),
      sh('S2', 'cave rafting launch', [
        owCell(
          'cave-rafting',
          `${OVERVIEW} Cave rafting launch: river mouth into cave, raft dock, gear shed blank, rock path, open shore pad. 5 zones. Soft not scary. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'sand dune park', [
        owCell(
          'sand-dune-park',
          `${OVERVIEW} Sand dune park: big dune slopes, boardwalk path, shade pavilion, sled-rent shed blank, open sand plaza. 5 zones. Playful desert. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave37-space-myth': wave('ow-wave37-space-myth', {
    bucket: 'fantasy',
    family_id: `${OW_PREFIX}wave37`,
    novelty: 'discovered-new',
    title: 'OW wave37 — starship hangar + mermaid lagoon + phoenix roost (FULL-PAGE ×3)',
    why: 'Fantasy invent beyond fairytale/candy/moonbase',
    sheets: [
      sh('S1', 'starship hangar bay', [
        owCell(
          'starship-hangar',
          `${OVERVIEW} Soft starship hangar bay: hangar mouth, parked cute ship shapes (no logos), fuel-pad, control tower edge, open deck plaza. 5 zones. Kid sci-fi. No people/text.`,
        ),
      ]),
      sh('S2', 'mermaid lagoon', [
        owCell(
          'mermaid-lagoon',
          `${OVERVIEW} Mermaid lagoon: turquoise cove, shell throne pad (empty), coral arch path, cave shelf, open sand plaza. 5 zones. Soft fantasy. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'phoenix roost cliffs', [
        owCell(
          'phoenix-roost',
          `${OVERVIEW} Phoenix roost cliffs: glowing nest ledge (empty), cliff path, warm ember garden, cave mouth, open mesa plaza. 5 zones. Friendly myth. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave38-transit4': wave('ow-wave38-transit4', {
    bucket: 'transport',
    family_id: `${OW_PREFIX}wave38`,
    novelty: 'discovered-new',
    title: 'OW wave38 — helipad plaza + bus depot + parking garage roof (FULL-PAGE ×3)',
    why: 'More transit hubs beyond subway/cable/barge',
    sheets: [
      sh('S1', 'helipad plaza', [
        owCell(
          'helipad-plaza',
          `${OVERVIEW} Helipad plaza: circular pad (blank H shape OK as geometry), terminal canopy, wind sock blank, path, open plaza. 5 zones. Soft aviation. No logos/text/people.`,
        ),
      ]),
      sh('S2', 'bus depot yard', [
        owCell(
          'bus-depot',
          `${OVERVIEW} Bus depot yard: bus bays blank, wash pad, driver rest porch blank, plaza, path. 5 zones. Soft city transit. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'parking garage rooftop', [
        owCell(
          'garage-rooftop',
          `${OVERVIEW} Parking-garage rooftop: ramp up, open roof plaza, stair tower, planter edge, city view pad. 5 zones. Empty play roof. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave39-party': wave('ow-wave39-party', {
    bucket: 'event',
    family_id: `${OW_PREFIX}wave39`,
    novelty: 'discovered-new',
    title: 'OW wave39 — birthday park + wedding garden + graduation lawn (FULL-PAGE ×3)',
    why: 'Occasion event campuses — blank banners',
    sheets: [
      sh('S1', 'birthday party park', [
        owCell(
          'birthday-park',
          `${OVERVIEW} Birthday party park: picnic pavilion, balloon-arch shape (no letters), gift-table pad blank, play lawn, path. 5 zones. Soft celebration. No people/text.`,
        ),
      ]),
      sh('S2', 'wedding garden', [
        owCell(
          'wedding-garden',
          `${OVERVIEW} Wedding garden: floral arch blank, seating rows, aisle path, photo lawn, open plaza. 5 zones. Soft elegant. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'graduation lawn', [
        owCell(
          'graduation-lawn',
          `${OVERVIEW} Graduation lawn: stage platform blank, chair rows, photo backdrop blank, path, open green plaza. 5 zones. Soft ceremony. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave40-lab-play': wave('ow-wave40-lab-play', {
    bucket: 'other-discovered',
    family_id: `${OW_PREFIX}wave40`,
    novelty: 'discovered-new',
    title: 'OW wave40 — weather station + radio tower hill + recycling center (FULL-PAGE ×3)',
    why: 'Discovered civic-science play worlds',
    sheets: [
      sh('S1', 'weather station hill', [
        owCell(
          'weather-station',
          `${OVERVIEW} Weather station hill: instrument garden (blank dials), dome shed, wind vane pad, trail, open overlook plaza. 5 zones. Soft science. No people/text.`,
        ),
      ]),
      sh('S2', 'radio tower hill', [
        owCell(
          'radio-tower-hill',
          `${OVERVIEW} Radio tower hill: tall tower silhouette (no logos), control hut blank, picnic overlook, path switchback, open pad. 5 zones. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'recycling center yard', [
        owCell(
          'recycling-center',
          `${OVERVIEW} Friendly recycling center yard: sort-bin bay blank, conveyor shed, education plaza, truck pad, path. 5 zones. Soft green civic. NEW. No people/text.`,
        ),
      ]),
    ],
  }),

  'ow-wave41-waterpark2': wave('ow-wave41-waterpark2', {
    bucket: 'leisure',
    family_id: `${OW_PREFIX}wave41`,
    novelty: 'discovered-new',
    title: 'OW wave41 — wave pool plaza + lazy river island + slide canyon (FULL-PAGE ×3)',
    why: 'Water leisure depth beyond waterpark overview',
    sheets: [
      sh('S1', 'wave pool plaza', [
        owCell(
          'wave-pool-plaza',
          `${OVERVIEW} Wave-pool plaza: big pool oval, beach entry pad, shade umbrellas, snack terrace blank, path ring. 5 zones. Soft summer. No people/text.`,
        ),
      ]),
      sh('S2', 'lazy river island', [
        owCell(
          'lazy-river-island',
          `${OVERVIEW} Lazy-river island: looped river channel, center island plaza, bridge, tube rack pad blank, path. 5 zones. Clear water path. NEW. No people/text.`,
        ),
      ]),
      sh('S3', 'slide canyon park', [
        owCell(
          'slide-canyon',
          `${OVERVIEW} Slide canyon park: multi-slide tower silhouette, splash catch pool, climb stairs path, locker-shed blank, open plaza. 5 zones. Soft thrill. NEW. No people/text.`,
        ),
      ]),
    ],
  }),
};

export const WAVE_ORDER = Object.keys(WAVES);

/** Prior Shift60 OW waves (already harvested) — counted toward 25–40 target. */
export const PRIOR_DONE = [
  {
    id: 'ow-wave1-three-worlds',
    bucket: 'leisure',
    worlds: ['skate-plaza', 'lakeside-marina', 'maker-fair'],
    task_id: 'j5m4GXumXEW6yuQC9BFMZb',
  },
  {
    id: 'ow-wave2-adventure',
    bucket: 'nature-adventure',
    worlds: ['island-cove', 'observatory-ridge', 'treehouse-forest'],
    task_id: 'gcyf6g9fKGL7jxr8zVXPiJ',
  },
  {
    id: 'ow-wave3-town-event',
    bucket: 'town-community',
    worlds: ['winter-festival', 'community-center', 'harbor-night-market'],
    task_id: 'Lias84sgcchAPNsskZzUn7',
  },
  {
    id: 'ow-wave4-play-districts',
    bucket: 'leisure',
    worlds: ['sports-complex', 'waterpark', 'shopping-district'],
    task_id: '4d6WseXRZQezWASKZBjMWB',
  },
  {
    id: 'ow-wave5-learn-play',
    bucket: 'town-community',
    worlds: ['aquarium-campus', 'science-museum', 'makerspace-campus'],
    task_id: 'U3JegbtM7QBHRnT9RVkGPC',
  },
  {
    id: 'ow-wave6-transit-nature',
    bucket: 'transport',
    worlds: ['station-district', 'airport-edge', 'mountain-resort'],
    task_id: '5Wzc35N8eBCbVemSsoUDTP',
  },
];

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function waveOutDir(wave) {
  return path.join(OW_ROOT, wave.bucket || 'other-discovered', wave.id);
}

function expectedSheets(wave) {
  return wave.sheets.length;
}

function skipAside(p) {
  return !p.includes(`${path.sep}_harvested_aside`) && !p.includes('/_harvested_aside');
}

function walkRunJsons(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (!skipAside(p)) continue;
    if (ent.isDirectory()) walkRunJsons(p, acc);
    else if (ent.name === 'run.json') acc.push(p);
  }
  return acc;
}

/** Live stockpiles that may hold Manus tasks (exclude aside backups). */
function repoRunJsons() {
  const roots = [
    OW_ROOT,
    KI_ROOT,
    path.join(ROOT, 'harvested/builder-worlds'),
    path.join(ROOT, 'harvested/content-worlds'),
    path.join(ROOT, 'harvested/board-enabling'),
    path.join(ROOT, 'harvested/manus-aggressive-stockpile'),
  ];
  const acc = [];
  for (const r of roots) walkRunJsons(r, acc);
  return acc;
}

function listInFlight(excludeWaveId = '') {
  const hits = [];
  for (const runPath of repoRunJsons()) {
    let prev;
    try {
      prev = JSON.parse(fs.readFileSync(runPath, 'utf8'));
    } catch {
      continue;
    }
    if (prev.task_id && !prev.finished_at && prev.wave !== excludeWaveId) {
      hits.push({ wave: prev.wave, task_id: prev.task_id, runPath, stockpile: prev.kind || 'unknown' });
    }
  }
  return hits;
}

function listOwInFlight(excludeWaveId = '') {
  return listInFlight(excludeWaveId).filter((x) => {
    const p = x.runPath.replace(/\\/g, '/');
    return p.includes('/overview-worlds/');
  });
}

function sheetBlock(sheet) {
  const lines = sheet.cells.map((c, i) => `${i + 1}. ${c.key} — ${c.brief}`);
  return `SHEET ${sheet.id} — ${sheet.title}
Format: ONE full-page landscape PNG overview world (NOT a contact grid). ~16:9.
${lines.join('\n')}`;
}

function buildBrief(wave) {
  const sheets = wave.sheets.map(sheetBlock).join('\n\n');
  return withEslAssetGeneratorBrief(`${STYLE}

TASK: Manufacture stockpile art for ClassIn ESL. FULL-PAGE overview worlds (never cram into 3×3 cells).
Wave: ${wave.id} — ${wave.title}
Why: ${wave.why}
Novelty tag: ${wave.novelty}

Deliver exactly ${expectedSheets(wave)} PNG sheet(s). Keep working inside THIS task (multi generate_image calls OK) until every sheet exists.
No people/faces. No text/logos/brands/fake UI.

${sheets}

Return the PNGs + short legends listing keys. No essay.`);
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
  fs.mkdirSync(OW_ROOT, { recursive: true });
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
    const msg = String((err && err.message) || err);
    if (!/429|rate/i.test(msg)) throw err;
    console.error(JSON.stringify({ phase: 'rate-wait', ms: RATE_WAIT_MS, err: msg }));
    await new Promise((r) => setTimeout(r, RATE_WAIT_MS));
    return fn();
  }
}

function emptyInv() {
  return {
    kind: 'overview-worlds-aggro',
    ow_prefix: OW_PREFIX,
    prior_done: PRIOR_DONE,
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

function countWorlds(inv) {
  const prior = PRIOR_DONE.reduce((n, p) => n + p.worlds.length, 0);
  const fresh = Object.values(inv.waves || {}).reduce((n, w) => {
    if (w.finished_at && (w.sheets || []).length >= (w.expected_sheets || 1)) return n + (w.sheets || []).length;
    return n;
  }, 0);
  return prior + fresh;
}

function recomputeTotals(inv) {
  const waves = Object.values(inv.waves || {});
  const fams = Object.values(inv.families || {});
  const newFams = fams.filter((f) => f.novelty === 'discovered-new').length;
  inv.running_total = {
    tasks: waves.filter((w) => w.task_id).length,
    sheets_downloaded: waves.reduce((n, w) => n + (w.sheets || []).length, 0),
    waves_planned: WAVE_ORDER.length,
    waves_done: waves.filter((w) => w.finished_at && (w.sheets || []).length >= (w.expected_sheets || 1)).length,
    worlds_total_est: countWorlds(inv),
    prior_worlds: PRIOR_DONE.reduce((n, p) => n + p.worlds.length, 0),
    families: fams.length,
    novelty_discovered_families: newFams,
    novelty_pct: fams.length ? Math.round((newFams / fams.length) * 100) : 0,
    target_min: 25,
    target_max: 150,
  };
}

function writeInv(inv) {
  inv.updated_at = new Date().toISOString();
  if (!inv.waves) inv.waves = {};
  if (!inv.families) inv.families = {};
  inv.prior_done = PRIOR_DONE;
  recomputeTotals(inv);
  fs.mkdirSync(OW_ROOT, { recursive: true });
  fs.mkdirSync(path.dirname(path.join(ROOT, INV_REL)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, INV_REL), JSON.stringify(inv, null, 2));
  return path.join(ROOT, INV_REL);
}

function upsertInventory(wave, dump) {
  const inv = loadInv();
  const siblings = wave.sheets.flatMap((s) => s.cells.map((c) => c.key));
  const haveLarge = (dump.saved || []).filter((x) => x.bytes > 80_000).length >= expectedSheets(wave);
  inv.waves[wave.id] = {
    family_id: wave.family_id,
    title: wave.title,
    bucket: wave.bucket,
    novelty: wave.novelty,
    in_prompt_named: wave.in_prompt_named,
    task_id: dump.task_id || null,
    task_url: dump.task_url || null,
    agent_status: dump.agent_status || null,
    sheet_dir: dump.sheet_dir || null,
    expected_sheets: expectedSheets(wave),
    cell_count: siblings.length,
    sheets: (dump.saved || []).map((x) => ({
      file: x.file || path.basename(x.dest || ''),
      bytes: x.bytes,
      name: x.name || null,
    })),
    finished_at: dump.finished_at || null,
    holds: dump.holds || [],
    qa: dump.qa || '',
  };
  const prev = inv.families[wave.family_id] || {};
  inv.families[wave.family_id] = {
    family_id: wave.family_id,
    wave: wave.id,
    bucket: wave.bucket,
    novelty: wave.novelty,
    in_prompt_named: wave.in_prompt_named,
    why: wave.why,
    siblings,
    manus_task_id: dump.task_id || prev.manus_task_id || null,
    task_url: dump.task_url || prev.task_url || null,
    sheet_dir: dump.sheet_dir || prev.sheet_dir || null,
    status: haveLarge ? 'generated_raw' : dump.task_id ? 'fired' : 'pending',
    qa: dump.qa || prev.qa || '',
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
      `# Overview-worlds manufacture log\n\nStockpile only. Art → \`${OW_REL}/\` (do not git-add PNG).\n\n## Events\n\n${block}`,
    );
  } else {
    fs.appendFileSync(p, block);
  }
}

function writeDocStub(inv) {
  const tot = inv.running_total || {};
  const lines = [
    '# Overview-worlds manufacture log',
    '',
    'Stockpile only. No producer wiring.',
    `Art: \`${OW_REL}/\` (PNG — **do not git-add**).`,
    'Tracked: `scripts/manus/request-overview-worlds.mjs`, inventory JSON, this log.',
    'Prior waves 1–3: from `request-kid-interest-shift60.mjs` (already harvested).',
    '',
    '## Running totals',
    '',
    '| Metric | Count |',
    '|---|---:|',
    `| Worlds (est.) | ${tot.worlds_total_est || 0} / ${tot.target_min || 25}–${tot.target_max || 40} |`,
    `| Prior worlds (w1–3) | ${tot.prior_worlds || 9} |`,
    `| Waves planned (aggro) | ${tot.waves_planned || WAVE_ORDER.length} |`,
    `| Waves done | ${tot.waves_done || 0} |`,
    `| Tasks | ${tot.tasks || 0} |`,
    `| Sheets downloaded | ${tot.sheets_downloaded || 0} |`,
    `| Novelty (discovered %) | ${tot.novelty_pct || 0}% |`,
    '',
    '## Prior (done)',
    '',
  ];
  for (const p of PRIOR_DONE) {
    lines.push(
      `- **${p.id}** — ${p.bucket} — task \`${p.task_id}\` — worlds: ${p.worlds.join(', ')}`,
    );
  }
  lines.push('', '## Aggro waves', '');
  for (const id of WAVE_ORDER) {
    const meta = WAVES[id];
    const fam = (inv.families || {})[meta.family_id];
    const w = (inv.waves || {})[id];
    const status = (fam && fam.status) || 'unfired';
    const url = (w && w.task_url) || (fam && fam.task_url) || 'unfired';
    const cells = meta.sheets.reduce((n, s) => n + s.cells.length, 0);
    lines.push(
      `- **${id}** \`${meta.family_id}\` — ${status} — novelty=${meta.novelty} — ${url} — ${expectedSheets(meta)} sheets / ${cells} worlds — ${meta.why}`,
    );
  }
  lines.push('', '## Events', '');
  const existing = fs.existsSync(path.join(ROOT, TRACKED_DOC_REL))
    ? fs.readFileSync(path.join(ROOT, TRACKED_DOC_REL), 'utf8')
    : '';
  const eventMatch = existing.match(/## Events\n\n([\s\S]*)$/);
  const events = eventMatch ? eventMatch[1].trim() : '_none yet_';
  lines.push(events || '_none yet_');
  lines.push('');
  const out = `${lines.join('\n')}\n`;
  const dest = path.join(ROOT, TRACKED_DOC_REL);
  try {
    fs.writeFileSync(dest, out);
  } catch (err) {
    const alt = path.join(ROOT, 'docs', 'overview-worlds-log.write.tmp.md');
    fs.writeFileSync(alt, out);
    console.error(JSON.stringify({ phase: 'log-write-fallback', err: String(err.message || err), alt }));
  }
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

function lightQa(saved, wave) {
  const large = (saved || []).filter((x) => x.bytes > 80_000);
  if (large.length >= expectedSheets(wave)) return 'PASS';
  if (large.length > 0) return 'HOLD';
  return 'JUNK';
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

  fs.mkdirSync(OW_ROOT, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(SHEET_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, 'keys.json'),
    JSON.stringify(
      {
        wave: wave.id,
        family_id: wave.family_id,
        bucket: wave.bucket,
        stockpile: 'overview-worlds',
        novelty: wave.novelty,
        in_prompt_named: wave.in_prompt_named,
        siblings: wave.sheets.flatMap((s) => s.cells.map((c) => c.key)),
        expected_sheets: NEED_SHEETS,
        sheets: wave.sheets.map((s) => ({
          id: s.id,
          title: s.title,
          format: s.format,
          keys: s.cells.map((c) => c.key),
        })),
      },
      null,
      2,
    ),
  );

  const dump = {
    started_at: new Date().toISOString(),
    kind: 'overview-worlds-aggro',
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
    const inflight = listInFlight(wave.id);
    const owFlight = listOwInFlight(wave.id);
    if (inflight.length >= REPO_HARD_CAP) {
      console.error(
        `REFUSING fire — ${inflight.length} repo in-flight (hard ${REPO_HARD_CAP}). Busy: ${inflight.map((x) => x.wave).join(', ')}`,
      );
      process.exit(3);
    }
    if (inflight.length >= REPO_SOFT_CAP) {
      console.error(
        `REFUSING fire — ${inflight.length} repo in-flight (soft ${REPO_SOFT_CAP}). Wait. Busy: ${inflight.map((x) => x.wave).join(', ')}`,
      );
      process.exit(3);
    }
    if (owFlight.length >= LANE_PREFER && !process.env.MANUS_OW_OVERFILL) {
      console.error(
        JSON.stringify({
          phase: 'lane-full',
          ow_inflight: owFlight.length,
          prefer: LANE_PREFER,
          busy: owFlight.map((x) => x.wave),
          hint: 'poll existing OW tasks first, or set MANUS_OW_OVERFILL=1',
        }),
      );
      process.exit(4);
    }
    apiKey();
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
          `Continue THIS task. You returned ${large.length} usable PNG sheet(s); we need exactly ${NEED_SHEETS} FULL-PAGE overview world sheet(s) listed in the original brief. Do not restart. Do not add text/logos/brands. Keep firing generate_image until every listed sheet exists.`,
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
  dump.qa = lightQa(saved, wave);
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
  await withInvLock(() => {
    upsertInventory(wave, dump);
    writeDocStub(loadInv());
    appendLog(
      `DOWNLOADED ${wave.id} qa=${dump.qa} sheets=${saved.length} large=${large.length}/${NEED_SHEETS} → ${SHEET_DIR}`,
    );
  });
  console.log(
    JSON.stringify(
      {
        phase: 'downloaded',
        wave: wave.id,
        qa: dump.qa,
        sheets: saved.length,
        large: large.length,
        need: NEED_SHEETS,
        sheet_dir: SHEET_DIR,
        task_url: dump.task_url,
      },
      null,
      2,
    ),
  );
  return dump;
}

function printAudit() {
  const inv = loadInv();
  console.log(
    JSON.stringify(
      {
        phase: 'audit',
        worlds_est: countWorlds(inv),
        prior: PRIOR_DONE,
        waves: WAVE_ORDER.map((id) => {
          const w = WAVES[id];
          return {
            id,
            bucket: w.bucket,
            novelty: w.novelty,
            sheets: expectedSheets(w),
            done: waveIsDone(w),
          };
        }),
        inflight_repo: listInFlight(),
        inflight_ow: listOwInFlight(),
      },
      null,
      2,
    ),
  );
}

async function runLoop() {
  console.log(JSON.stringify({ phase: 'loop-start', prefer: LANE_PREFER, soft: REPO_SOFT_CAP }, null, 2));
  while (true) {
    const inv = loadInv();
    const worlds = countWorlds(inv);
    if (worlds >= 150) {
      console.log(JSON.stringify({ phase: 'target-hit', worlds }, null, 2));
      return;
    }
    const next = nextWaveName();
    if (!next) {
      console.log(JSON.stringify({ phase: 'all-waves-done', worlds }, null, 2));
      return;
    }
    const repoFlight = listInFlight();
    const owFlight = listOwInFlight();
    if (repoFlight.length >= REPO_SOFT_CAP) {
      console.log(
        JSON.stringify({
          phase: 'wait-repo-cap',
          inflight: repoFlight.length,
          busy: repoFlight.map((x) => x.wave),
        }),
      );
      await new Promise((r) => setTimeout(r, LOOP_SLEEP_MS));
      continue;
    }
    if (owFlight.length >= LANE_PREFER) {
      // Poll one finished slot: run poll-only on oldest OW in-flight
      const oldest = owFlight[0];
      console.log(JSON.stringify({ phase: 'lane-poll', wave: oldest.wave, task_id: oldest.task_id }, null, 2));
      try {
        process.argv = process.argv.filter((a) => !a.startsWith('--wave=') && a !== '--fire' && a !== '--loop');
        process.argv.push(`--wave=${oldest.wave}`, '--poll-only');
        await runWave(oldest.wave);
      } catch (err) {
        console.error(JSON.stringify({ phase: 'poll-err', wave: oldest.wave, err: String(err.message || err) }));
        await new Promise((r) => setTimeout(r, LOOP_SLEEP_MS));
      }
      continue;
    }
    // Fire next into a free lane slot
    console.log(JSON.stringify({ phase: 'loop-fire', wave: next, worlds_so_far: worlds }, null, 2));
    const savedArgv = [...process.argv];
    try {
      process.argv = process.argv.filter((a) => !a.startsWith('--wave=') && a !== '--poll-only' && a !== '--loop');
      if (!process.argv.includes('--fire')) process.argv.push('--fire');
      process.argv.push(`--wave=${next}`);
      await runWave(next);
    } catch (err) {
      console.error(JSON.stringify({ phase: 'fire-err', wave: next, err: String(err.message || err) }));
      await new Promise((r) => setTimeout(r, LOOP_SLEEP_MS));
    } finally {
      process.argv = savedArgv;
    }
  }
}

async function main() {
  if (process.argv.includes('--audit-only')) {
    printAudit();
    return;
  }
  if (process.argv.includes('--doc-only')) {
    writeDocStub(loadInv());
    console.log(JSON.stringify({ phase: 'doc-only', inv: INV_REL, log: TRACKED_DOC_REL }, null, 2));
    return;
  }
  if (process.argv.includes('--loop')) {
    await runLoop();
    return;
  }
  let name = arg('wave');
  if (process.argv.includes('--next') || !name) {
    name = nextWaveName();
    if (!name) {
      console.log(JSON.stringify({ phase: 'all-done', waves: WAVE_ORDER.length }, null, 2));
      return;
    }
  }
  await runWave(name);
}

const isDirect =
  process.argv[1] &&
  (path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ||
    String(process.argv[1]).endsWith('request-overview-worlds.mjs'));
if (isDirect) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
