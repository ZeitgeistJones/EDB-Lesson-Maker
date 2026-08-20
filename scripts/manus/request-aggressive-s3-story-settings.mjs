/**
 * Aggressive stockpile PACK 3 — EDB story-setting / stage drops.
 * Stockpile only. No PropBank merge, producer, recipes, or renderer wiring.
 *
 *   node scripts/manus/request-aggressive-s3-story-settings.mjs --wave=e1 --fire
 *   node scripts/manus/request-aggressive-s3-story-settings.mjs --wave=e1 --poll-only
 *
 * Partition: harvested/manus-aggressive-stockpile/s3-story-settings/
 * Prefix: aggressive-s3-set-
 * STOP peek-crop / modular-env (D/I) — those stay in s3-peek-env and are not resubmitted.
 *
 * Dedup: EDB s1-settings (classroom/bedroom/kitchen/bathroom), s2-settings
 * (living-room/playground/park/street-town), remaining edb waves 3–6, live
 * story-env-* keys, civic shop stages, and s3-peek-env architecture fragments.
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

export const STOCKPILE_REL = 'harvested/manus-aggressive-stockpile/s3-story-settings';
export const TRACKED_DOC_REL = 'docs/aggressive-stockpile-s3-story-settings.md';
export const PREFIX = 'aggressive-s3-set-';
export const BOARD = { width: 1280, height: 590 };
export const GROUND_Y_RANGE = '340–434';

const STOCKPILE = path.join(ROOT, STOCKPILE_REL);
const LOCK = path.join(STOCKPILE, '.inv.lock');
const POLL_MS = 30_000;
const TIMEOUT_MS = 70 * 60 * 1000;
const RATE_WAIT_MS = 90_000;

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

function otherInFlight(thisWaveId) {
  if (!fs.existsSync(STOCKPILE)) return null;
  for (const ent of fs.readdirSync(STOCKPILE, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const runPath = path.join(STOCKPILE, ent.name, 'run.json');
    if (!fs.existsSync(runPath)) continue;
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

function cell(slug, brief) {
  return {
    key: `${PREFIX}${slug}`,
    concept: slug,
    stream: 'E',
    family: 'story-setting',
    brief,
  };
}

const STYLE = `EDB STORY SETTING / STAGE DROP — full lesson-stage environment kids can stand in (Mia/Leo).

BOARD: panoramic ${BOARD.width}×${BOARD.height} landscape (~16:9). Open floor. Recognizable place at a glance.
WHAT WE WANT:
- Real place: walls/floor/sky + key furniture silhouettes at EDGES only
- Open center floor band (horizontal ~20%–80%, lower third) for standing characters and dragged props
- Clear ground plane (groundY ${GROUND_Y_RANGE} px on the ${BOARD.width}×${BOARD.height} board)
- Soft children's-book illustration — readable, not photoreal, NOT wallpaper, NOT a quiet flat wash
- Generic empty setting — no named plot, no teacher, no lesson text

HARD FAIL:
- Abstract color wash + tiny corner glyph (bg-theme-sets quiet-flat / anti-room)
- Decorative scenic poster / dense collage / no usable floor
- Busy cluttered mid-frame
- People, faces, animals, readable text, letters, numbers, logos, watermarks
- Black-field prop cutouts or modular door/window/fence FRAGMENTS (those already live in s3-peek-env)
- Copying a civic shop STAGE already harvested (bakery, barbershop, pharmacy, marina, laundromat, hardware, ferry, florist, recycling, marketplace)

quality: default ONLY (never high).`;

const DEDUPE = `DO NOT CLONE (already harvested):
S1-SETTINGS: classroom, bedroom, kitchen, bathroom.
S2-SETTINGS: living-room, playground, park, street-town.
EDB later waves: shop, restaurant, clinic, library, farm, zoo, beach, forest, airport, bus-stop, train-platform, train-interior, bus-interior, sports-field, basketball-court, swimming-pool.
STORY-ENV plates: classroom, home, bedroom, closet, clinic, hotel-lobby, airport-counter, bus-stop, bus-interior, train-platform, train-interior, basketball-court, soccer-field, grass-field, pool-edge, construction, woods, zoo, ocean, pasture.
S3-PEEK-ENV: isolated door/window/counter/fence/path/stall/hedge/rail SECTIONS — do not resubmit fragments.`;

const E1_SHEETS = [
  {
    id: 'S1',
    title: 'story settings home extras 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'dining-room',
        'home dining room: table + chairs pushed to back/side walls, wide open wood/tile floor center, simple window at edge, empty place for two kids to stand, no people no text',
      ),
      cell(
        'home-hallway',
        'home hallway: coat hooks + shoe rack at edges, open runner floor center, stair silhouette far end, empty standing space, no people no letters',
      ),
      cell(
        'laundry-room',
        'home laundry room (not a public laundromat): washer/dryer along back wall, hamper at edge, open tile floor center, no people no brand labels',
      ),
      cell(
        'backyard',
        'fenced backyard: grass floor center, patio furniture at far edge, house wall + door silhouette at back, empty play space, no people no animals',
      ),
    ],
  },
];

const E2_SHEETS = [
  {
    id: 'S1',
    title: 'story settings school extras 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'school-hallway',
        'school hallway: lockers along walls, open linoleum floor center, classroom doors at edges (blank panels, no letters), empty standing space, no people',
      ),
      cell(
        'cafeteria',
        'school cafeteria: long tables at edges, serving counter silhouette at back (no menu text), wide open floor center, no people no trays mid-frame',
      ),
      cell(
        'art-room',
        'school art room: easels + sink at edges, open floor center, blank paper on easels (no drawings/letters), no people',
      ),
      cell(
        'school-entrance',
        'school front entrance exterior: steps + doors at back, open paved yard center, flagpole silhouette (blank flag), no people no letters',
      ),
    ],
  },
];

const E3_SHEETS = [
  {
    id: 'S1',
    title: 'story settings town travel 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'post-office',
        'post-office interior: counter + blank parcel boxes at edges, open floor center, no readable stamps/signs, no people',
      ),
      cell(
        'fire-station-bay',
        'fire-station apparatus bay: truck silhouette at one edge, open concrete floor center, hose rack at wall, no people no logos',
      ),
      cell(
        'hotel-room',
        'hotel guest room (not a lobby): bed + desk at edges, open carpet floor center, window at back, no people no brand text',
      ),
      cell(
        'car-interior',
        'family-car interior: seats along sides, open floor/aisle between seats for standing toys, windshield band, no people no dashboard numbers',
      ),
    ],
  },
];

const E4_SHEETS = [
  {
    id: 'S1',
    title: 'story settings more home travel 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'luggage-claim',
        'airport luggage-claim hall: carousel at back edge, open terrazzo floor center, no bags mid-frame, no people no logos',
      ),
      cell(
        'attic-playroom',
        'attic playroom: sloped ceiling, toy boxes at edges, open wood floor center, small window at edge, no people no text',
      ),
      cell(
        'garage-interior',
        'home garage interior as a stage: car silhouette at edge, open concrete floor center, tool wall at back, no people no brand labels',
      ),
      cell(
        'music-room',
        'school music room: piano + music stands at edges, open floor center, blank stand sheets (no notes/letters), no people',
      ),
    ],
  },
];

const E5_SHEETS = [
  {
    id: 'S1',
    title: 'story settings more town 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'museum-gallery',
        'museum gallery: blank picture frames on walls (no art text), benches at edges, open marble floor center, no people',
      ),
      cell(
        'cinema-lobby',
        'cinema lobby: ticket counter + popcorn stand silhouettes at edges (no logos/text), open carpet floor center, no people',
      ),
      cell(
        'bank-interior',
        'bank interior: teller windows at back (blank panels), rope stanchions at edges, open floor center, no people no numbers',
      ),
      cell(
        'hospital-waiting',
        'hospital waiting room (not a clinic exam): chairs along walls, reception desk at edge (blank), open floor center, no people no signs',
      ),
    ],
  },
];

const E6_SHEETS = [
  {
    id: 'S1',
    title: 'story settings school travel more 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'science-lab',
        'school science lab: benches + empty glassware at edges, open floor center, blank whiteboard (no letters), no people',
      ),
      cell(
        'computer-lab',
        'school computer lab: desks + blank monitors at edges, open aisle floor center, no people no screen text',
      ),
      cell(
        'subway-platform',
        'subway platform (not a train-station above-ground): tiled walls, tracks at edge, open platform floor center, no train no people no signs',
      ),
      cell(
        'rest-stop',
        'highway rest-stop picnic area: picnic tables at edges, open pavement/grass center, restroom building silhouette at back, no people no letters',
      ),
    ],
  },
];

const E7_SHEETS = [
  {
    id: 'S1',
    title: 'story settings porch basement lot 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'front-porch',
        'house front porch: steps + door at back, open porch floor center, railing at edges, no people no letters',
      ),
      cell(
        'basement',
        'home basement rec room: stairs at edge, open concrete/wood floor center, washer silhouette far corner, no people',
      ),
      cell(
        'parking-lot',
        'school/store parking lot: empty stalls at edges, open asphalt center, lamp posts, no cars mid-frame, no people no signs',
      ),
      cell(
        'hotel-hallway',
        'hotel corridor (not a lobby or guest room): doors along walls (blank), open carpet runner center, no people no numbers',
      ),
    ],
  },
];

const E8_SHEETS = [
  {
    id: 'S1',
    title: 'story settings greenhouse rooftop camp 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'greenhouse',
        'greenhouse interior: glass walls + plant benches at edges, open gravel/tile floor center, no people no labels',
      ),
      cell(
        'rooftop',
        'building rooftop terrace: low wall at edges, open roof floor center, sky band, no people no logos',
      ),
      cell(
        'campground',
        'campground clearing: tent silhouettes at far edges, open dirt/grass floor center, trees behind, no people no fire mid-frame',
      ),
      cell(
        'bike-path',
        'park bike path: path center as standing/play band, trees + bench at edges, no people no signs',
      ),
    ],
  },
];

const E9_SHEETS = [
  {
    id: 'S1',
    title: 'story settings more leftovers 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'school-nurse',
        'school nurse office (not a clinic exam room): cot + cabinet at edges, open floor center, blank privacy screen, no people no letters',
      ),
      cell(
        'locker-room',
        'school locker room: benches + lockers along walls, open tile floor center, no people no numbers on lockers',
      ),
      cell(
        'courtyard',
        'school courtyard: building walls at edges, open paved center, tree/planter at far corner, no people',
      ),
      cell(
        'sunroom',
        'home sunroom: windows on three sides, plants at edges, open tile floor center, no people no text',
      ),
    ],
  },
];

const E10_SHEETS = [
  {
    id: 'S1',
    title: 'story settings office warehouse 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'home-office',
        'home office: desk + bookshelf at edges, open floor center, blank monitor, no people no letters',
      ),
      cell(
        'conference-room',
        'office conference room: table pushed back, chairs at edges, open floor near camera, blank whiteboard, no people no text',
      ),
      cell(
        'warehouse',
        'empty warehouse aisle: shelves at edges, open concrete floor center, no people no labels',
      ),
      cell(
        'stairwell',
        'building stairwell landing: stairs at edges, open landing floor center, no people no numbers on doors',
      ),
    ],
  },
];

const E11_SHEETS = [
  {
    id: 'S1',
    title: 'story settings driveway patio rec 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'driveway',
        'home driveway: house wall at back, cars only at far edges if any, wide empty asphalt center for two kids to stand, no people no signs',
      ),
      cell(
        'patio',
        'back patio: table/chairs pushed to one far edge, wide empty paver floor center, door at back, no people',
      ),
      cell(
        'rec-room',
        'home rec room: TV cabinet at back wall only, toys boxed at edges, wide empty carpet center, no people no text on screens',
      ),
      cell(
        'drive-thru-canopy',
        'empty drive-through canopy: posts at edges, open pavement center, blank menu board silhouette (no letters), no cars no people',
      ),
    ],
  },
];

const E12_SHEETS = [
  {
    id: 'S1',
    title: 'story settings ice bowl community 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'ice-rink',
        'indoor ice rink: boards at edges, wide empty ice/floor center for standing, no people no scoreboard numbers',
      ),
      cell(
        'bowling-alley',
        'bowling alley: lanes at far back, seating at edges, wide empty carpet floor in foreground, no people no letters on screens',
      ),
      cell(
        'community-center',
        'community-center lobby: desk at back edge, chairs at sides, wide empty floor center, no people no signs',
      ),
      cell(
        'gym-foyer',
        'school gym foyer: trophy case at edge (blank plaques), doors at back, wide empty floor center, no people no letters',
      ),
    ],
  },
];

const E13_SHEETS = [
  {
    id: 'S1',
    title: 'story settings arcade tent walk 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'arcade',
        'empty arcade: cabinets at left and right EDGES only, wide empty carpet floor center (20-80%), no people no letters on screens',
      ),
      cell(
        'tent-interior',
        'roomy camping tent interior: canvas walls, sleeping bags at EDGES, wide empty floor center, no people no logos',
      ),
      cell(
        'subway-car',
        'empty subway car: seats along both walls, wide empty aisle floor center, blank ads (no letters), no people',
      ),
      cell(
        'pier-walkway',
        'empty wooden pier: rails at edges, wide open plank floor center, water at sides, no boats as hero, no people no signs',
      ),
    ],
  },
];

const E14_SHEETS = [
  {
    id: 'S1',
    title: 'story settings treehouse elevator breezeway auditorium 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'treehouse',
        'empty wooden treehouse interior: rail at edges, wide empty plank floor center, leafy view through openings, no people no signs',
      ),
      cell(
        'elevator-lobby',
        'empty elevator lobby: doors at back edge, bench at side, wide empty floor center, blank floor indicator (no numbers), no people',
      ),
      cell(
        'school-breezeway',
        'covered school breezeway: columns at edges, wide empty walkway floor, courtyard visible beyond, no people no letters',
      ),
      cell(
        'auditorium-floor',
        'school auditorium: seats ONLY at far back edge, wide empty floor in foreground for standing, blank stage, no people no letters',
      ),
    ],
  },
];

const E15_SHEETS = [
  {
    id: 'S1',
    title: 'story settings mall garage cabin lodge 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'mall-corridor',
        'empty indoor mall corridor: shop fronts as blank windows at EDGES, wide empty tile floor center, no people no letters on signs',
      ),
      cell(
        'parking-garage',
        'empty indoor parking garage: pillars at edges, wide empty concrete floor center, no cars no people no numbers on walls',
      ),
      cell(
        'cabin-interior',
        'empty log cabin room: fireplace at back EDGE, chairs at sides, wide empty wood floor center, no people no writing',
      ),
      cell(
        'ski-lodge-lobby',
        'empty ski-lodge lobby: desk at back edge, benches at sides, wide empty floor center, no people no logos',
      ),
    ],
  },
];

const E16_SHEETS = [
  {
    id: 'S1',
    title: 'story settings atrium radio news depot 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'atrium',
        'empty building atrium: plants and stairs at EDGES, wide empty floor center, skylight above, no people no signs',
      ),
      cell(
        'radio-studio',
        'empty radio studio: console at back EDGE, chairs at sides, wide empty floor center, blank screens (no letters), no people',
      ),
      cell(
        'newsroom',
        'empty newsroom: desks at back and side EDGES only, wide empty floor center, blank wall screens, no people no letters',
      ),
      cell(
        'bus-depot',
        'empty indoor bus depot: bays at far back, wide empty concrete floor center, no buses as hero, no people no numbers',
      ),
    ],
  },
];

const E17_SHEETS = [
  {
    id: 'S1',
    title: 'story settings planetarium plaza rehearsal track 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'planetarium',
        'empty planetarium hall: dome at top, seats ONLY at far back edge, wide empty floor in foreground, no people no letters',
      ),
      cell(
        'fountain-plaza',
        'empty town plaza: fountain at BACK edge only, wide empty pavement floor center, buildings at far sides, no people no signs',
      ),
      cell(
        'rehearsal-hall',
        'empty rehearsal hall: piano at back EDGE, chairs stacked at sides, wide empty wood floor center, no people no writing',
      ),
      cell(
        'indoor-track',
        'empty indoor running track: lanes at outer EDGES, wide empty infield floor center, no people no numbers',
      ),
    ],
  },
];

const E18_SHEETS = [
  {
    id: 'S1',
    title: 'story settings barn amphitheater conservatory dock 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'barn-interior',
        'empty barn aisle: stalls at left and right EDGES, wide empty dirt/wood floor center, no animals no people no writing',
      ),
      cell(
        'amphitheater',
        'empty outdoor amphitheater: seats at far back EDGE only, wide empty stage floor in foreground, no people no letters',
      ),
      cell(
        'conservatory',
        'empty glass conservatory: plants at EDGES, wide empty tile floor center, no people no signs',
      ),
      cell(
        'loading-dock',
        'empty warehouse loading dock: doors at back edge, wide empty concrete floor center, no trucks as hero, no people no numbers',
      ),
    ],
  },
];

const E19_SHEETS = [
  {
    id: 'S1',
    title: 'story settings courtroom foodcourt canal helipad 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'courtroom',
        'empty courtroom: bench at back EDGE, empty pews at far sides, wide empty floor center, no people no letters on plaques',
      ),
      cell(
        'food-court',
        'empty indoor food court: counters at back EDGE, tables ONLY at left and right edges, wide empty tile floor center, blank menu boards, no people no letters',
      ),
      cell(
        'canal-walk',
        'empty canal walkway: rail at edges, wide open pavement floor, water at one side, no boats as hero, no people no signs',
      ),
      cell(
        'helipad-roof',
        'empty rooftop helipad: pad marking at BACK (no letters or numbers), wide empty roof floor in foreground, no helicopter, no people',
      ),
    ],
  },
];

const E20_SHEETS = [
  {
    id: 'S1',
    title: 'story settings underpass escalator lighthouse ticket 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'underpass',
        'empty pedestrian underpass: walls at sides, wide empty pavement floor center, daylight at far end, no people no graffiti letters',
      ),
      cell(
        'escalator-hall',
        'empty transit hall: escalators at left and right EDGES, wide empty tile floor center, blank boards (no letters), no people',
      ),
      cell(
        'lighthouse-interior',
        'empty lighthouse ground room: spiral stair at back EDGE, wide empty round floor center, no people no numbers',
      ),
      cell(
        'ticket-hall',
        'empty station ticket hall: counters at back EDGE, wide empty floor center, blank windows (no letters), no people',
      ),
    ],
  },
];

const E21_SHEETS = [
  {
    id: 'S1',
    title: 'story settings observation cave cloister diner 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'observation-deck',
        'empty observation deck: rail at edges, wide empty floor in foreground, sky beyond, no people no letters no H-marks',
      ),
      cell(
        'cave-mouth',
        'empty cave mouth: rock walls at edges, wide empty stone floor center, daylight opening at back, no people no animals',
      ),
      cell(
        'cloister-walk',
        'empty cloister walk: columns at edges, garden visible beyond arches, wide empty stone floor, no people no letters',
      ),
      cell(
        'diner-interior',
        'empty diner: booths at left and right EDGES only, counter at back EDGE, wide empty checkered floor center, blank boards, no people no letters',
      ),
    ],
  },
];

const E22_SHEETS = [
  {
    id: 'S1',
    title: 'story settings control ferry workshop bell 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'control-room',
        'empty control room: consoles at back EDGE only, chairs at sides, wide empty floor center, blank screens (no letters), no people no silhouettes',
      ),
      cell(
        'ferry-lounge',
        'empty ferry lounge: windows at back, benches at side EDGES, wide empty floor center, no people no logos (not a marina shop)',
      ),
      cell(
        'workshop-bay',
        'empty workshop bay: benches and tools at EDGES, wide empty concrete floor center, no vehicles as hero, no people no letters',
      ),
      cell(
        'bell-chamber',
        'empty bell chamber: one bell at back EDGE, wide empty wood floor center, no people no numbers no writing',
      ),
    ],
  },
];

const E23_SHEETS = [
  {
    id: 'S1',
    title: 'story settings rotunda studio slope boardwalk 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'rotunda-foyer',
        'empty rotunda foyer: columns at EDGES, wide empty circular floor center, no people no letters no silhouettes',
      ),
      cell(
        'tv-studio',
        'empty TV studio: cameras and desks at back EDGE only, wide empty floor center, blank screens (no letters), no people no silhouettes',
      ),
      cell(
        'ski-slope',
        'empty ski slope: trees at far sides, wide empty snow floor in foreground, lodge tiny at back, no people no letters',
      ),
      cell(
        'boardwalk',
        'empty seaside boardwalk: rail at edges, wide empty wood floor, water at one side, no shops as hero, no people no signs',
      ),
    ],
  },
];

const E24_SHEETS = [
  {
    id: 'S1',
    title: 'story settings mews windmill orchard bandstand 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'mews-alley',
        'empty mews alley: stable doors at EDGES, wide empty cobble floor center, no cars no people no letters',
      ),
      cell(
        'windmill-interior',
        'empty windmill ground floor: millstones at back EDGE, wide empty wood floor center, no people no numbers',
      ),
      cell(
        'orchard-path',
        'empty orchard path: trees at left and right EDGES, wide empty dirt path floor center, no people no fruit-stand signs',
      ),
      cell(
        'bandstand',
        'empty park bandstand: rail at edges, wide empty wood floor on the platform, park tiny beyond, no people no letters',
      ),
    ],
  },
];

const E25_SHEETS = [
  {
    id: 'S1',
    title: 'story settings lounge coatcheck kiosk observatory 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'waiting-lounge',
        'empty waiting lounge: chairs at side EDGES only, wide empty floor center, blank wall clock silhouette (no numbers), no people no silhouettes',
      ),
      cell(
        'coat-check',
        'empty coat-check lobby: counter at back EDGE, racks at sides, wide empty floor center, no coats as clutter, no people no letters',
      ),
      cell(
        'kiosk-plaza',
        'empty outdoor plaza: one kiosk at back EDGE, wide empty pavement floor center, no market stalls, no people no signs',
      ),
      cell(
        'observatory-floor',
        'empty observatory floor: telescope at back EDGE, wide empty floor center, dome above, no people no letters no numbers',
      ),
    ],
  },
];

const E26_SHEETS = [
  {
    id: 'S1',
    title: 'story settings boathouse silo pagoda lock 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'boathouse-interior',
        'empty boathouse interior: hulls at side EDGES only, wide empty wood floor center, no people no letters (not a marina shop)',
      ),
      cell(
        'silo-interior',
        'empty grain silo: chute at back EDGE only, wide empty round floor center, no people no numbers',
      ),
      cell(
        'pagoda-floor',
        'empty pagoda hall: pillars at EDGES, wide empty wood floor center, no people no letters',
      ),
      cell(
        'canal-lock',
        'empty canal lock: gates at far back, wide empty water/path in foreground, towpath at edges, no boats as hero, no people no numbers',
      ),
    ],
  },
];

const E27_SHEETS = [
  {
    id: 'S1',
    title: 'story settings greenroom boiler vestibule booth 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'green-room',
        'empty theater green room: sofa at back EDGE, chairs at sides, wide empty floor center, no people no silhouettes no letters',
      ),
      cell(
        'boiler-room',
        'empty boiler room: tanks at back EDGE, pipes at sides, wide empty concrete floor center, no people no numbers',
      ),
      cell(
        'vestibule',
        'empty building vestibule: doors at back EDGE, benches at sides, wide empty floor center, no people no letters',
      ),
      cell(
        'projection-booth',
        'empty projection booth: projectors at back EDGE, wide empty floor in foreground, blank screens (no letters), no people',
      ),
    ],
  },
];

const E28_SHEETS = [
  {
    id: 'S1',
    title: 'story settings mudroom copy break mail 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'mudroom',
        'empty home mudroom: benches and hooks at EDGES, wide empty tile floor center, no people no letters no coats as clutter',
      ),
      cell(
        'copy-room',
        'empty copy room: copiers at back EDGE, cabinets at sides, wide empty floor center, blank panels (no letters), no people',
      ),
      cell(
        'break-room',
        'empty staff break room: counter at back EDGE, tables ONLY at left and right edges, wide empty floor center, no people no letters',
      ),
      cell(
        'mail-room',
        'empty mail room: pigeonholes at back EDGE (no letters), wide empty floor center, no people no numbers',
      ),
    ],
  },
];

const E29_SHEETS = [
  {
    id: 'S1',
    title: 'story settings darkroom potting server cloak 2x2',
    format: 'landscape-contact-2x2',
    cells: [
      cell(
        'darkroom',
        'empty photo darkroom: sinks at back EDGE, trays at sides, wide empty floor center, no people no letters',
      ),
      cell(
        'potting-shed',
        'empty potting shed: benches at side EDGES, pots at back, wide empty dirt/wood floor center, no people no signs',
      ),
      cell(
        'server-room',
        'empty server room: racks at left and right EDGES only, wide empty floor center, blank screens (no letters), no people',
      ),
      cell(
        'cloakroom',
        'empty school cloakroom: hooks at side EDGES, wide empty floor center, no coats as clutter, no people no letters',
      ),
    ],
  },
];

export const WAVES = {
  e1: {
    id: 's3-e1-home',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E1 — story settings home extras (2×2)',
    sheets: E1_SHEETS,
  },
  e2: {
    id: 's3-e2-school',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E2 — story settings school extras (2×2)',
    sheets: E2_SHEETS,
  },
  e3: {
    id: 's3-e3-town-travel',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E3 — story settings town/travel (2×2)',
    sheets: E3_SHEETS,
  },
  e4: {
    id: 's3-e4-more',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E4 — story settings more home/travel (2×2)',
    sheets: E4_SHEETS,
  },
  e5: {
    id: 's3-e5-town-more',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E5 — story settings more town (2×2)',
    sheets: E5_SHEETS,
  },
  e6: {
    id: 's3-e6-school-travel',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E6 — story settings school/travel more (2×2)',
    sheets: E6_SHEETS,
  },
  e7: {
    id: 's3-e7-porch-lot',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E7 — story settings porch/basement/lot (2×2)',
    sheets: E7_SHEETS,
  },
  e8: {
    id: 's3-e8-leftovers',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E8 — story settings leftovers (2×2)',
    sheets: E8_SHEETS,
  },
  e9: {
    id: 's3-e9-more-leftovers',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E9 — story settings more leftovers (2×2)',
    sheets: E9_SHEETS,
  },
  e10: {
    id: 's3-e10-office-warehouse',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E10 — story settings office/warehouse (2×2)',
    sheets: E10_SHEETS,
  },
  e11: {
    id: 's3-e11-driveway-patio',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E11 — story settings driveway/patio (2×2)',
    sheets: E11_SHEETS,
  },
  e12: {
    id: 's3-e12-rink-community',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E12 — story settings rink/community (2×2)',
    sheets: E12_SHEETS,
  },
  e13: {
    id: 's3-e13-arcade-pier',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E13 — story settings arcade/tent/subway/pier (2×2)',
    sheets: E13_SHEETS,
  },
  e14: {
    id: 's3-e14-treehouse-auditorium',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E14 — story settings treehouse/lobby/breezeway (2×2)',
    sheets: E14_SHEETS,
  },
  e15: {
    id: 's3-e15-mall-cabin',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E15 — story settings mall/garage/cabin/lodge (2×2)',
    sheets: E15_SHEETS,
  },
  e16: {
    id: 's3-e16-atrium-depot',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E16 — story settings atrium/radio/news/depot (2×2)',
    sheets: E16_SHEETS,
  },
  e17: {
    id: 's3-e17-plaza-track',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E17 — story settings planetarium/plaza/rehearsal/track (2×2)',
    sheets: E17_SHEETS,
  },
  e18: {
    id: 's3-e18-barn-dock',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E18 — story settings barn/amphitheater/conservatory/dock (2×2)',
    sheets: E18_SHEETS,
  },
  e19: {
    id: 's3-e19-court-helipad',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E19 — story settings courtroom/food-court/canal/helipad (2×2)',
    sheets: E19_SHEETS,
  },
  e20: {
    id: 's3-e20-underpass-ticket',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E20 — story settings underpass/escalator/lighthouse/ticket (2×2)',
    sheets: E20_SHEETS,
  },
  e21: {
    id: 's3-e21-deck-diner',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E21 — story settings observation/cave/cloister/diner (2×2)',
    sheets: E21_SHEETS,
  },
  e22: {
    id: 's3-e22-control-workshop',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E22 — story settings control/ferry/workshop/bell (2×2)',
    sheets: E22_SHEETS,
  },
  e23: {
    id: 's3-e23-rotunda-slope',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E23 — story settings rotunda/studio/slope/boardwalk (2×2)',
    sheets: E23_SHEETS,
  },
  e24: {
    id: 's3-e24-mews-orchard',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E24 — story settings mews/windmill/orchard/bandstand (2×2)',
    sheets: E24_SHEETS,
  },
  e25: {
    id: 's3-e25-lounge-observatory',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E25 — story settings lounge/coat-check/kiosk/observatory (2×2)',
    sheets: E25_SHEETS,
  },
  e26: {
    id: 's3-e26-boathouse-pagoda',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E26 — story settings boathouse/silo/pagoda/lock (2×2)',
    sheets: E26_SHEETS,
  },
  e27: {
    id: 's3-e27-greenroom-booth',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E27 — story settings green-room/boiler/vestibule/booth (2×2)',
    sheets: E27_SHEETS,
  },
  e28: {
    id: 's3-e28-mudroom-mail',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E28 — story settings mudroom/copy/break/mail (2×2)',
    sheets: E28_SHEETS,
  },
  e29: {
    id: 's3-e29-darkroom-server',
    stream: 'E',
    family: 'story-setting',
    title: 'Aggressive S3 E29 — story settings darkroom/potting/server/cloak (2×2)',
    sheets: E29_SHEETS,
  },
};

export const WAVE_ORDER = ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'e10', 'e11', 'e12', 'e13', 'e14', 'e15', 'e16', 'e17', 'e18', 'e19', 'e20', 'e21', 'e22', 'e23', 'e24', 'e25', 'e26', 'e27', 'e28', 'e29'];

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function sheetBlock(sheet, index) {
  const lines = sheet.cells.map((c, i) => `${i + 1}. ${c.key} — ${c.brief}`);
  return `SHEET ${index} — ${sheet.title} (${sheet.format}, one 16:9 stage per cell):\n${lines.join('\n')}\nKeys: ${sheet.cells.map((c) => c.key).join(',')}`;
}

function buildBrief(wave, sheets) {
  return withEslAssetGeneratorBrief(`TASK: Produce **${sheets.length} landscape PNG contact sheet(s)** for ClassIn ESL aggressive stockpile PACK 3 story SETTINGS.

These are FULL-BLEED lesson-stage environments (NOT black-field props, NOT quiet flats, NOT modular architecture fragments).

${STYLE}

${DEDUPE}

STREAM E — STORY SETTINGS / STAGE DROPS.
Home rooms, school, town, travel interiors/exteriors with a clear play floor so two kids can stand in the place.

HARD RULES:
- Generate ONLY the listed cells. Do not review, research, broaden, or add concepts.
- Reading order left→right, top→bottom.
- Sheet layout: **2×2 grid** of landscape panels. Each cell is one complete ${BOARD.width}×${BOARD.height}-feel stage.
- NO people, faces, animals as subjects.
- NO baked readable text.
- quality: default ONLY.
- Keep generating inside THIS task until every listed PNG exists. The 5-image cap is per generate_image call, not per task.

${sheets.map((s, i) => sheetBlock(s, i + 1)).join('\n\n')}

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

function expectedSheets(wave) {
  return wave.sheets.length;
}

function recomputeTotals(inv) {
  const waves = Object.values(inv.waves || {});
  const items = waves.flatMap((w) => w.items || []);
  inv.running_total = {
    pass: items.filter((it) => it.qa_status === 'PASS').length,
    hold: items.filter((it) => it.qa_status === 'HOLD').length,
    setting_cells: items.length,
    sheets_downloaded: waves.reduce((n, w) => n + (w.sheets || []).length, 0),
    tasks_used: waves.filter((w) => w.task_id).length,
  };
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

function loadInv() {
  const invPath = path.join(STOCKPILE, 'inventory.json');
  if (!fs.existsSync(invPath)) {
    return {
      kind: 'aggressive-s3-story-settings',
      prefix: PREFIX,
      waves: {},
      running_total: {},
    };
  }
  return JSON.parse(fs.readFileSync(invPath, 'utf8'));
}

function writeInv(inv) {
  inv.updated_at = new Date().toISOString();
  if (!inv.waves) inv.waves = {};
  recomputeTotals(inv);
  fs.mkdirSync(STOCKPILE, { recursive: true });
  fs.writeFileSync(path.join(STOCKPILE, 'inventory.json'), JSON.stringify(inv, null, 2));
  return path.join(STOCKPILE, 'inventory.json');
}

function upsertInventory(wave, sheets, dump) {
  const inv = loadInv();
  const haveLarge = (dump.saved || []).filter((s) => s.bytes > 80_000).length >= expectedSheets(wave);
  const items = sheets.flatMap((s) => s.cells.map((c) => ({
    ...c,
    status: haveLarge ? 'generated_raw' : dump.task_id ? 'fired' : 'pending',
    qa_status: c.qa_status || null,
    qa_note: haveLarge
      ? 'Raw sheet downloaded; visual QA must record PASS or HOLD before close.'
      : null,
    path: dump.sheet_dir || null,
    sheet_id: s.id,
    manus_task_id: dump.task_id || null,
  })));
  inv.waves[wave.id] = {
    family: wave.family,
    stream: wave.stream,
    title: wave.title,
    task_id: dump.task_id || null,
    task_url: dump.task_url || null,
    agent_status: dump.agent_status || null,
    sheet_dir: dump.sheet_dir || null,
    expected_sheets: expectedSheets(wave),
    concept_count: items.length,
    sheets: (dump.saved || []).map((s) => ({ file: s.file || path.basename(s.dest || ''), bytes: s.bytes, name: s.name || null })),
    items,
    holds: dump.holds || [],
    finished_at: dump.finished_at || null,
  };
  return writeInv(inv);
}

function writeDocStub(inv) {
  const tot = inv.running_total || {};
  const lines = [
    '# Aggressive stockpile S3 — story settings / stage drops',
    '',
    'Stockpile only. No producer wiring. Prefix `aggressive-s3-set-`.',
    'Partition `harvested/manus-aggressive-stockpile/s3-story-settings/`.',
    '',
    'Full EDB lesson stages (1280×590 feel): open floor, recognizable place, not quiet flats, not wallpaper, no text.',
    'Peek-crop / modular-env stay in `s3-peek-env` and are not resubmitted.',
    '',
    'Deduped vs s1-settings, s2-settings, edb waves 3–6, live `story-env-*`, civic shop stages, and s3-peek-env fragments.',
    '',
    '## Running totals',
    '',
    `| Metric | Count |`,
    `|---|---:|`,
    `| Tasks | ${tot.tasks_used || 0} |`,
    `| Sheets downloaded | ${tot.sheets_downloaded || 0} |`,
    `| Setting cells | ${tot.setting_cells || 0} |`,
    `| PASS | ${tot.pass || 0} |`,
    `| HOLD | ${tot.hold || 0} |`,
    '',
    '## Waves',
    '',
  ];
  for (const [id, w] of Object.entries(inv.waves || {})) {
    lines.push(`- **${id}** — ${w.task_url || 'unfired'} — sheets ${w.expected_sheets || 0} — cells ${w.concept_count || 0}`);
  }
  lines.push('', '## QA notes', '', '- Stockpile only. No producer wiring.', '');
  fs.mkdirSync(path.dirname(path.join(ROOT, TRACKED_DOC_REL)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, TRACKED_DOC_REL), `${lines.join('\n')}\n`);
}

export async function runWave(waveName) {
  const wave = WAVES[waveName];
  if (!wave) throw new Error(`Need --wave=${WAVE_ORDER.join('|')}`);

  const OUT_DIR = path.join(STOCKPILE, wave.id);
  const SHEET_DIR = path.join(OUT_DIR, 'sheets');
  const RUN_JSON = path.join(OUT_DIR, 'run.json');
  const fireOnly = process.argv.includes('--fire') || process.argv.includes('--create-only');
  const pollOnly = process.argv.includes('--poll-only');
  const sheets = wave.sheets;
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
        prefix: PREFIX,
        concept_count: sheets.reduce((n, s) => n + s.cells.length, 0),
        expected_sheets: NEED_SHEETS,
        sheets: sheets.map((s) => ({ id: s.id, title: s.title, format: s.format, keys: s.cells.map((c) => c.key) })),
      },
      null,
      2,
    ),
  );

  const BRIEF = buildBrief(wave, sheets);
  let taskId = arg('task');
  const dump = {
    started_at: new Date().toISOString(),
    kind: 'aggressive-s3-story-settings',
    wave: wave.id,
    stream: wave.stream,
    family: wave.family,
    sheet_dir: SHEET_DIR,
    concept_count: sheets.reduce((n, s) => n + s.cells.length, 0),
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
    await withInvLock(() => {
      upsertInventory(wave, sheets, dump);
      writeDocStub(loadInv());
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

  let result = await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
  let msgs = await listMessages(taskId, { order: 'asc', limit: 120 });
  let saved = await downloadSheets(msgs.messages || [], SHEET_DIR);
  let large = saved.filter((s) => s.bytes > 80_000);

  if (large.length < NEED_SHEETS) {
    console.log(JSON.stringify({ phase: 'need-more-sheets', have: large.length, need: NEED_SHEETS }, null, 2));
    await withRateBackoff(() => sendMessage(taskId, {
      force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
      message: withEslAssetGeneratorBrief(
        `Continue THIS task. You returned ${large.length} usable PNG sheet(s); we need exactly ${NEED_SHEETS} landscape 2×2 story-setting sheet(s) listed in the original brief. Do not restart. Do not add text. Do not change the key list. Keep firing generate_image until every listed sheet exists.`,
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
    const p = upsertInventory(wave, sheets, dump);
    writeDocStub(loadInv());
    return p;
  });
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

const isMain = process.argv[1] && path.normalize(process.argv[1]).endsWith('request-aggressive-s3-story-settings.mjs');
if (isMain) {
  apiKey();
  const names = (arg('wave', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!names.length) throw new Error(`Need --wave=${WAVE_ORDER.join('|')} (comma-ok)`);
  for (const n of names) {
    await runWave(n);
  }
}
