/**
 * Content-worlds FGHI stockpile (weather families, everyday life, occasions,
 * festivals, country places). Stockpile only — no producer wiring.
 *
 *   node scripts/manus/request-cw-fghi.mjs --wave=f1 --fire
 *   node scripts/manus/request-cw-fghi.mjs --wave=f1 --poll-only
 *   node scripts/manus/request-cw-fghi.mjs --next --fire
 *
 * Slot: 1 of 4 Manus slots. Max 1 in-flight in harvested/content-worlds/.
 * Prefix: cw-
 * Songs: not in this catalog (rights workflow not ready).
 * Never: flags, maps, seals, labels, Mia/Leo fused into sacred practice.
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

export const STOCKPILE_REL = 'harvested/content-worlds';
export const TRACKED_DOC_REL = 'docs/content-worlds-fghi.md';
export const PREFIX = 'cw-';
export const BOARD = { width: 1280, height: 590 };

const STOCKPILE = path.join(ROOT, STOCKPILE_REL);
const LOCK = path.join(STOCKPILE, '.inv-fghi.lock');
const POLL_MS = 30_000;
const TIMEOUT_MS = 70 * 60 * 1000;
const RATE_WAIT_MS = 90_000;

const STAGE_LOCK = `EDB CONTENT-WORLD STAGE — full-bleed lesson place kids can stand in.

BOARD: panoramic ${BOARD.width}×${BOARD.height} landscape. Open floor band (lower third, ~20–80% width).
Soft children's-book illustration. Recognizable place at a glance. Empty of people.
NO readable text, letters, numbers, logos, watermarks, flags, maps, seals, country names.
NO Mia, Leo, teachers, worshippers, or faces.
quality: default ONLY.`;

const COMPANION_LOCK = `BLACK-FIELD COMPANIONS — isolated still-life cutouts on pure #000000.
One object per cell. Generous margin. No people, no text, no logos, no flags.
quality: default ONLY.`;

const GATE = {
  ok: ['ok_everyday'],
  wx: ['ok_everyday', 'affordance_family'],
  life: ['ok_everyday', 'anti_stereotype'],
  fest: ['cultural_review_required'],
  sacred: ['cultural_review_required', 'sacred_adjacent'],
  place: ['cultural_review_required', 'no_flag_map_seal', 'anti_stereotype'],
};

function s(key, brief, research_gate, extra = {}) {
  return { key: `${PREFIX}${key}`, concept: key, brief, research_gate, ...extra };
}

function sh(id, title, format, cells) {
  return { id, title, format, cells };
}

const SAME_STREET =
  'REGISTERED FAMILY wx-town-street. SAME camera, SAME two-storey corner shop with BLANK awning, SAME round planter, SAME bench, SAME left tree, SAME curb. Only weather/light/ground change. Open floor center. No people no text no flags.';
const SAME_GARDEN =
  'REGISTERED FAMILY wx-back-garden. SAME camera, SAME house back wall + door, SAME raised beds, SAME hose reel, SAME patio stones. Only season change. Open patio center. No people no text.';
const SAME_YARD =
  'REGISTERED FAMILY wx-schoolyard. SAME camera, SAME two-storey school wall (blank, no letters), SAME climbing frame, SAME painted play circle. Only weather change. Open yard center. No people no text.';
const SAME_PLAY =
  'REGISTERED FAMILY wx-playground. SAME camera, SAME slide, SAME swing frame, SAME sandbox, SAME bench. Only weather/season change. Open ground center. No people no text.';
const SAME_POND =
  'REGISTERED FAMILY wx-park-pond. SAME camera, SAME oval pond, SAME small bridge, SAME two benches, SAME reeds. Only season/weather change. Open bank floor. No people no animals as subjects no text.';
const SAME_FARM =
  'REGISTERED FAMILY wx-farm-lane. SAME camera, SAME barn end, SAME fence, SAME dirt lane, SAME tree. Only season/weather/time change. Open lane center. No people no text.';
const SAME_BEACH =
  'REGISTERED FAMILY wx-beach-pier. SAME camera, SAME wooden pier boards, SAME two lamp posts, SAME rail, SAME ladder notch. Only weather/light change. Open pier center. No people no text no boats as subjects.';
const SAME_PORCH =
  'REGISTERED FAMILY wx-front-porch. SAME camera, SAME house front door + sidelights (blank), SAME three steps, SAME rail, SAME mailbox. Only weather/season change. Open walk/step floor. No people no text.';
const SAME_ROOF =
  'REGISTERED FAMILY wx-rooftop. SAME camera, SAME flat deck, SAME low rail, SAME fabric awning frame, SAME planter box. Only weather change. Open deck center. No people no text no skyline logos.';
const SAME_WALK =
  'REGISTERED FAMILY wx-covered-walk. SAME camera, SAME colonnade/roof posts, SAME paved strip, SAME side garden bed. Only weather/light change. Open walk center. No people no text.';
const SAME_LIB =
  'REGISTERED FAMILY wx-library-window. SAME camera, SAME tall blank window bay, SAME reading bench, SAME low shelf (blank spines as shapes only), SAME rug edge. Only weather/light outside the glass. Open rug floor. No people no readable text.';
const SAME_BIKE =
  'REGISTERED FAMILY wx-bike-path. SAME camera, SAME paved bike path curve, SAME two trees, SAME bench, SAME rack. Only weather/season change. Open path center. No people no text.';
const SAME_BALC =
  'REGISTERED FAMILY wx-balcony. SAME camera, SAME apartment balcony rail, SAME two planters, SAME sliding door (blank curtain), SAME tile floor. Only weather/light change. Open balcony floor. No people no text.';
const SAME_BRIDGE =
  'REGISTERED FAMILY wx-footbridge. SAME camera, SAME wooden footbridge, SAME two rails, SAME stream under, SAME trees both banks. Only weather change. Open bridge center. No people no text.';
const SAME_SQUARE =
  'REGISTERED FAMILY wx-market-square. SAME camera, SAME open square paving, SAME two empty stall frames at edges, SAME fountain rim far, SAME clock-tower silhouette blank (no numerals readable). Only weather/light change. Open square center. No people no text no flags.';
const SAME_GREEN =
  'REGISTERED FAMILY wx-greenhouse. SAME camera, SAME glasshouse aisle, SAME potting bench at edge, SAME hose reel, SAME roof vents. Only weather/light outside and inside. Open aisle center. No people no text.';
const SAME_PLAT =
  'REGISTERED FAMILY wx-train-plat. SAME camera, SAME platform edge, SAME canopy posts, SAME bench, SAME blank departure board shape (ZERO letters/numbers). Only weather/light change. Open platform floor. No people no logos.';
const SAME_CAMP =
  'REGISTERED FAMILY wx-campground. SAME camera, SAME clearing, SAME one empty tent, SAME fire-ring stones, SAME log bench, SAME trees. Only weather/light change. Open clearing center. No people no text.';
const SAME_DOCK =
  'REGISTERED FAMILY wx-dock. SAME camera, SAME wooden fishing dock, SAME two posts, SAME rope coil, SAME crate stack at edge. Only weather/light change. Open dock center. No people no boats as subjects no text.';
const SAME_BUS =
  'REGISTERED FAMILY wx-bus-shelter. SAME camera, SAME glass/metal shelter, SAME bench, SAME blank timetable panel (ZERO letters/numbers), SAME curb. Only weather/light change. Open curb/shelter floor. No people no logos.';
const SAME_ATTIC =
  'REGISTERED FAMILY wx-attic. SAME camera, SAME attic room, SAME dormer window, SAME trunk, SAME rafters. Only weather/light outside the glass. Open floor center. No people no text.';

export const WAVES = {
  f1: {
    id: 'cw-f1-wx-street-garden',
    harvest_family: 'weather-seasons',
    family: 'weather-seasons',
    title: 'CW FGHI F1 — weather families street+garden (2×2 ×2)',
    kind: 'stage',
    sheets: [
      sh('S1', 'wx town street family 2x2', 'landscape-contact-2x2', [
        s('wx-town-street-sunny', `${SAME_STREET} STATE sunny: dry pavement, open awning shade, bike rack usable. Affordance: lean a bike, sit bench in sun.`, GATE.wx, { family_id: 'wx-town-street' }),
        s('wx-town-street-rain', `${SAME_STREET} STATE rain: puddles in street/gutter, wet sheen, awning CLOSED, umbrella stand at door. Affordance: splash puddles, grab umbrella. Not a rain overlay on the sunny plate — rebuild the place wet.`, GATE.wx, { family_id: 'wx-town-street' }),
        s('wx-town-street-snow', `${SAME_STREET} STATE snow: packed berms, shovel leaning, rack buried, grey sky. Affordance: shovel/path, no bike. Rebuild the place snowed.`, GATE.wx, { family_id: 'wx-town-street' }),
        s('wx-town-street-night', `${SAME_STREET} STATE night: street lamps on, shop interior glow, door shut, dry evening. Affordance: lights, closed shop. Rebuild the place at night.`, GATE.wx, { family_id: 'wx-town-street' }),
      ]),
      sh('S2', 'wx back garden family 2x2', 'landscape-contact-2x2', [
        s('wx-back-garden-spring', `${SAME_GARDEN} STATE spring: fresh soil, small seedlings, watering possible. Affordance: plant/water.`, GATE.wx, { family_id: 'wx-back-garden' }),
        s('wx-back-garden-summer', `${SAME_GARDEN} STATE summer: harsh sun, wilted leaves, deep shade by wall. Affordance: seek shade, need water.`, GATE.wx, { family_id: 'wx-back-garden' }),
        s('wx-back-garden-autumn', `${SAME_GARDEN} STATE autumn: leaf piles, rake at edge, bare-ish beds. Affordance: rake/collect leaves.`, GATE.wx, { family_id: 'wx-back-garden' }),
        s('wx-back-garden-winter', `${SAME_GARDEN} STATE winter: frost, dormant beds, hose put away. Affordance: no planting, icy stones.`, GATE.wx, { family_id: 'wx-back-garden' }),
      ]),
    ],
  },
  f2: {
    id: 'cw-f2-wx-yard-play',
    harvest_family: 'weather-seasons',
    family: 'weather-seasons',
    title: 'CW FGHI F2 — weather families schoolyard+playground',
    kind: 'stage',
    sheets: [
      sh('S1', 'wx schoolyard family 2x2', 'landscape-contact-2x2', [
        s('wx-schoolyard-dry', `${SAME_YARD} STATE dry: open circle playable, metal bars dry. Affordance: run/climb.`, GATE.wx, { family_id: 'wx-schoolyard' }),
        s('wx-schoolyard-rain', `${SAME_YARD} STATE rain: puddles on circle, covered-walk drip edge, wet bars. Affordance: splash, stay under cover. Rebuild wet.`, GATE.wx, { family_id: 'wx-schoolyard' }),
        s('wx-schoolyard-snow', `${SAME_YARD} STATE snow: circle buried, bars iced, packed path. Affordance: packed snow play, climb unsafe. Rebuild snowed.`, GATE.wx, { family_id: 'wx-schoolyard' }),
        s('wx-schoolyard-wind', `${SAME_YARD} STATE wind: leaves skidding, cones blown to fence, sky streaked. Affordance: chase papers/leaves, lean into wind.`, GATE.wx, { family_id: 'wx-schoolyard' }),
      ]),
      sh('S2', 'wx playground family 2x2', 'landscape-contact-2x2', [
        s('wx-playground-dry', `${SAME_PLAY} STATE dry: slide/swings usable, sandbox open. Affordance: slide, swing, dig.`, GATE.wx, { family_id: 'wx-playground' }),
        s('wx-playground-wet', `${SAME_PLAY} STATE wet: shiny metal slide, puddle at slide foot, sandbox darkened. Affordance: slip risk, splash, no dry sit.`, GATE.wx, { family_id: 'wx-playground' }),
        s('wx-playground-snow', `${SAME_PLAY} STATE snow: slide coated, swings still, sandbox buried. Affordance: snow pile play, slide unusable.`, GATE.wx, { family_id: 'wx-playground' }),
        s('wx-playground-autumn', `${SAME_PLAY} STATE autumn: sandbox full of leaves, dry cool light. Affordance: leaf pile in box, rake.`, GATE.wx, { family_id: 'wx-playground' }),
      ]),
    ],
  },
  f3: {
    id: 'cw-f3-wx-pond-farm',
    harvest_family: 'weather-seasons',
    family: 'weather-seasons',
    title: 'CW FGHI F3 — weather families pond+farm lane',
    kind: 'stage',
    sheets: [
      sh('S1', 'wx park pond family 2x2', 'landscape-contact-2x2', [
        s('wx-park-pond-summer', `${SAME_POND} STATE summer: open bank, clear water edge. Affordance: stand at bank, look in.`, GATE.wx, { family_id: 'wx-park-pond' }),
        s('wx-park-pond-autumn', `${SAME_POND} STATE autumn: low water, leaves on surface, brown reeds. Affordance: leaf-skimming bank.`, GATE.wx, { family_id: 'wx-park-pond' }),
        s('wx-park-pond-frozen', `${SAME_POND} STATE frozen: opaque ice, frosted bridge. Affordance: ice surface (empty, no skaters drawn). Rebuild frozen.`, GATE.wx, { family_id: 'wx-park-pond' }),
        s('wx-park-pond-rain', `${SAME_POND} STATE rain: ripples, wet path closed-looking, dark benches. Affordance: watch ripples, stay off slick bridge.`, GATE.wx, { family_id: 'wx-park-pond' }),
      ]),
      sh('S2', 'wx farm lane family 2x2', 'landscape-contact-2x2', [
        s('wx-farm-lane-harvest', `${SAME_FARM} STATE harvest: crate stacks at barn edge, dry dirt. Affordance: stack/move crates.`, GATE.wx, { family_id: 'wx-farm-lane' }),
        s('wx-farm-lane-mud', `${SAME_FARM} STATE rain mud: deep ruts, puddles in lane. Affordance: splash/mud walk, crates under eaves.`, GATE.wx, { family_id: 'wx-farm-lane' }),
        s('wx-farm-lane-snow', `${SAME_FARM} STATE snow: packed lane, barn door clear. Affordance: packed path only.`, GATE.wx, { family_id: 'wx-farm-lane' }),
        s('wx-farm-lane-dusk', `${SAME_FARM} STATE dusk: lantern on hook, long shadows, dry. Affordance: lantern light, quieter farm.`, GATE.wx, { family_id: 'wx-farm-lane' }),
      ]),
    ],
  },
  f4: {
    id: 'cw-f4-wx-companions',
    harvest_family: 'weather-seasons',
    family: 'weather-seasons',
    title: 'CW FGHI F4 — weather companions 3×3 black field',
    kind: 'companion',
    sheets: [
      sh('S1', 'weather companions 3x3', 'black-contact-3x3', [
        s('wx-umb-brella', 'open child umbrella still-life, no brand, no text', GATE.ok),
        s('wx-puddle-ring', 'single rain puddle oval, isolated, no scene', GATE.ok),
        s('wx-snow-shovel', 'child snow shovel still-life', GATE.ok),
        s('wx-sled', 'simple wooden sled still-life', GATE.ok),
        s('wx-raincoat-hook', 'yellow raincoat on a hook, empty of person', GATE.ok),
        s('wx-sun-hat', 'wide sun hat still-life', GATE.ok),
        s('wx-leaf-rake', 'leaf rake still-life', GATE.ok),
        s('wx-watering-can', 'watering can still-life', GATE.ok),
        s('wx-ice-scraper', 'ice scraper still-life', GATE.ok),
      ]),
    ],
  },
  g1: {
    id: 'cw-g1-breakfast',
    harvest_family: 'everyday-life',
    family: 'everyday-life',
    title: 'CW FGHI G1 — breakfast tables (not a kitchen clone)',
    kind: 'stage',
    sheets: [
      sh('S1', 'breakfast tables 2x2', 'landscape-contact-2x2', [
        s('life-breakfast-rice-soup', 'small dining alcove: low/western table SET with rice bowls + soup pots, empty chairs pushed aside, open floor so kids can stand at the table. Not a full kitchen. No people no labels. Global everyday, not “a country”.', GATE.life),
        s('life-breakfast-bread-tea', 'breakfast nook: bread board, jam jars, teapot, cups at table edge, open floor center. Not the home-kitchen stage already stockpiled. No people no text.', GATE.life),
        s('life-breakfast-cereal', 'simple table with cereal boxes (BLANK faces), bowls, milk jug, open floor. No brand letters. No people.', GATE.life),
        s('life-breakfast-street-stall', 'outdoor breakfast stall: steamer/pots at back, empty stools at edge, open pavement center. Unlabeled region. Not a restaurant interior. No people no signs.', GATE.life),
      ]),
    ],
  },
  g2: {
    id: 'cw-g2-commute',
    harvest_family: 'everyday-life',
    family: 'everyday-life',
    title: 'CW FGHI G2 — commute modes (not generic bus-stop clone)',
    kind: 'stage',
    sheets: [
      sh('S1', 'commute places 2x2', 'landscape-contact-2x2', [
        s('life-commute-queue-boxes', 'city curb with PAINTED queue boxes + bike rack, NOT a cloned bus-shelter sheet. Open pavement center. Blank metal sign back (no letters). No people no flags.', GATE.life),
        s('life-commute-bike-lane', 'protected bike lane beside a quiet street, morning light, empty lane as play floor, rack at edge. No people no logos.', GATE.life),
        s('life-commute-metro-stair', 'metro stair mouth at street: stairs down at back, open plaza floor center, blank wayfinding totems (no letters). Not a full station concourse clone. No people.', GATE.life),
        s('life-commute-ferry-gangway', 'small ferry gangway + empty dock floor, water at edge, no logos no names. Not a cloned pier sheet. No people.', GATE.life),
      ]),
    ],
  },
  g3: {
    id: 'cw-g3-market',
    harvest_family: 'everyday-life',
    family: 'everyday-life',
    title: 'CW FGHI G3 — markets (variation, not country X)',
    kind: 'stage',
    sheets: [
      sh('S1', 'market places 2x2', 'landscape-contact-2x2', [
        s('life-market-wet-indoor', 'indoor wet-market aisle: tile floor center, fish/produce bins at EDGES, hanging pans. No people no price tags. Not “a country”.', GATE.life),
        s('life-market-trestle', 'outdoor trestle produce market: tables at edges, open dirt/paving center. No people no labels.', GATE.life),
        s('life-market-grain-scoop', 'grain/spice scoop stalls: sacks + scoops at edges, open aisle center. Unlabeled. No people no text.', GATE.life),
        s('life-market-canal-pier', 'canal-side boat market pier: boats at edge, open dock floor. Unlabeled. No people no flags.', GATE.life),
      ]),
    ],
  },
  g4: {
    id: 'cw-g4-clinic-extras',
    harvest_family: 'everyday-life',
    family: 'everyday-life',
    title: 'CW FGHI G4 — clinic extras (not exam/waiting clones)',
    kind: 'stage',
    sheets: [
      sh('S1', 'clinic extras 2x2', 'landscape-contact-2x2', [
        s('life-clinic-pharmacy', 'pharmacy counter interior: shelves of BLANK boxes at back, counter at edge, open floor center. Not clinic-exam or waiting-room. No people no letters.', GATE.life),
        s('life-clinic-dental', 'dental chair room: chair + lamp at edge, open tile floor center. Empty of people. No charts with letters.', GATE.life),
        s('life-clinic-vax', 'vaccination station: privacy screen + tray table at edge, open floor, no needles in foreground gore, no people no posters with text.', GATE.life),
        s('life-clinic-optician', 'optician room: lens set + empty chair at edge, open floor, blank eye-chart SHAPE with no letters/numbers.', GATE.life),
      ]),
    ],
  },
  g5: {
    id: 'cw-g5-life-companions',
    harvest_family: 'everyday-life',
    family: 'everyday-life',
    title: 'CW FGHI G5 — everyday companions 3×3',
    kind: 'companion',
    sheets: [
      sh('S1', 'everyday companions 3x3', 'black-contact-3x3', [
        s('life-rice-bowl', 'rice bowl still-life, no pattern letters', GATE.ok),
        s('life-teapot', 'simple teapot still-life', GATE.ok),
        s('life-backpack', 'school backpack still-life, blank, no logos', GATE.ok),
        s('life-bike-helmet', 'bike helmet still-life, no brand', GATE.ok),
        s('life-produce-crate', 'produce crate with veg, no labels', GATE.ok),
        s('life-scoop-bin', 'grain scoop in a bin still-life', GATE.ok),
        s('life-pill-bottle', 'blank medicine bottle, no letters', GATE.ok),
        s('life-dental-tray', 'dental mirror tray still-life, kid-safe, not gory', GATE.ok),
        s('life-ticket-stub', 'blank ticket stub SHAPE, absolutely no numbers or letters', GATE.ok),
      ]),
    ],
  },
  h1: {
    id: 'cw-h1-birthday-stages',
    harvest_family: 'occasions',
    family: 'occasions',
    title: 'CW FGHI H1 — birthday deep stages',
    kind: 'stage',
    sheets: [
      sh('S1', 'birthday stages 2x2', 'landscape-contact-2x2', [
        s('occ-bday-living-table', 'living room birthday: cake table at back/side, balloon cluster at edge, WIDE open floor for kids. Blank banner cloth (no letters). No people.', GATE.ok),
        s('occ-bday-backyard', 'backyard birthday: picnic table at edge, string lights, open grass center. No people no text.', GATE.ok),
        s('occ-bday-arch-room', 'indoor party room: balloon arch at back, empty floor center, gift pile at edge. No letters on balloons. No people.', GATE.ok),
        s('occ-bday-park-picnic', 'park picnic birthday: cloth on ground at edge, open grass center, one tree. No people no signs.', GATE.ok),
      ]),
    ],
  },
  h2: {
    id: 'cw-h2-birthday-companions',
    harvest_family: 'occasions',
    family: 'occasions',
    title: 'CW FGHI H2 — birthday companions 3×3',
    kind: 'companion',
    sheets: [
      sh('S1', 'birthday companions 3x3', 'black-contact-3x3', [
        s('occ-bday-cake', 'birthday cake still-life, no letters on icing', GATE.ok),
        s('occ-bday-candles', 'cluster of unlit birthday candles', GATE.ok),
        s('occ-bday-gift', 'wrapped gift box, no tags with text', GATE.ok),
        s('occ-bday-hat', 'party hat still-life', GATE.ok),
        s('occ-bday-balloons', 'small balloon bunch, no printed text', GATE.ok),
        s('occ-bday-pinata', 'simple star piñata still-life, no letters', GATE.ok),
        s('occ-bday-banner-blank', 'blank fabric banner strip, ZERO letters', GATE.ok),
        s('occ-bday-plates', 'stack of party plates', GATE.ok),
        s('occ-bday-blower', 'party blower still-life', GATE.ok),
      ]),
    ],
  },
  h3: {
    id: 'cw-h3-other-occasions',
    harvest_family: 'occasions',
    family: 'occasions',
    title: 'CW FGHI H3 — other occasions (1 world each, not deep)',
    kind: 'stage',
    sheets: [
      sh('S1', 'other occasions 2x2', 'landscape-contact-2x2', [
        s('occ-graduation-hall', 'empty graduation hall: chairs + dais at edges, open floor center, blank backdrop (no letters). No people no diplomas with text.', GATE.ok),
        s('occ-wedding-garden', 'secular garden wedding aisle: arch of flowers, empty chairs at edges, open aisle floor. No clergy staging, no people, no text.', GATE.fest),
        s('occ-nursery', 'empty baby nursery: crib at edge, open floor center, no people no wall letters.', GATE.ok),
        s('occ-halloween-porch', 'secular Halloween porch: pumpkin + bucket at edge, open walkway center, no scary gore, no people no text.', GATE.ok),
      ]),
    ],
  },
  i1: {
    id: 'cw-i1-festivals-a',
    harvest_family: 'festivals',
    family: 'festivals',
    title: 'CW FGHI I1 — festival empty stages A (8)',
    kind: 'stage',
    cultural_review_required: true,
    sheets: [
      sh('S1', 'festival stages A1 2x2', 'landscape-contact-2x2', [
        s('fest-lantern-walk', 'ONE place ONE action: dusk street with ONE string of paper lanterns between two posts, open empty pavement. No temples, no flags, no people, no text, no symbol soup. Mia/Leo absent.', GATE.fest),
        s('fest-harvest-fair', 'ONE place: two empty harvest booths at edges, crates, open dirt aisle. No people no signs no flags.', GATE.fest),
        s('fest-blossom-picnic', 'ONE place: lawn + one blossom tree + one empty picnic cloth at edge, open grass. No people no writing.', GATE.fest),
        s('fest-winter-market', 'ONE place: wooden winter stall row, wreath without text, open street floor. No people no logos.', GATE.fest),
      ]),
      sh('S2', 'festival stages A2 2x2', 'landscape-contact-2x2', [
        s('fest-color-courtyard', 'ONE place: empty courtyard with small COLOR POWDER piles at edges, open floor. No people throwing, no labels, no flags. Guest layers later.', GATE.fest),
        s('fest-water-street', 'ONE place: street with water BASINS at edges, wet pavement, open center. No people splashing, no signs.', GATE.fest),
        s('fest-moon-terrace', 'ONE place: empty terrace, low wall, moon in sky, open floor. No people, no poetry text, no flags.', GATE.fest),
        s('fest-newyear-courtyard', 'ONE place: courtyard, lanterns, open floor. NO couplets, NO letters, NO people in ritual, NO firecrackers as weapons. Empty stage only.', GATE.fest),
      ]),
    ],
  },
  i2: {
    id: 'cw-i2-festivals-b',
    harvest_family: 'festivals',
    family: 'festivals',
    title: 'CW FGHI I2 — festival empty stages B (8)',
    kind: 'stage',
    cultural_review_required: true,
    sheets: [
      sh('S1', 'festival stages B1 2x2', 'landscape-contact-2x2', [
        s('fest-parade-route', 'ONE place: empty parade street, crowd barriers at edges, open asphalt. No floats yet, no people, no banners with text.', GATE.fest),
        s('fest-ofrenda-room', 'ONE place: quiet room, one ofrenda TABLE with cloth + flowers only (no people praying, no portraits that read as photos of real people, no text). Open floor. Sacred-adjacent empty stage. Mia/Leo NEVER in this plate.', GATE.sacred),
        s('fest-lamp-courtyard', 'ONE place: courtyard with small row lamps/diya-like bowls at edges, open floor. No people lighting, no text, no flags. Empty stage. Mia/Leo absent.', GATE.sacred),
        s('fest-feast-courtyard', 'ONE place: long empty floor seating / cloth at edges, open center for a feast setup. No people, no religious dress, no text. Empty stage.', GATE.sacred),
      ]),
      sh('S2', 'festival stages B2 2x2', 'landscape-contact-2x2', [
        s('fest-dragonboat-dock', 'ONE place: dock with ONE boat at the edge, open dock floor. No teams, no people, no race numbers, no flags.', GATE.fest),
        s('fest-carnival-street', 'ONE place: street with ONE unoccupied float silhouette at edge, open street. No people, no letters on float, no flags.', GATE.fest),
        s('fest-maypole-clearing', 'ONE place: grass clearing, one maypole with ribbons, open floor. No dancers, no people, no text.', GATE.fest),
        s('fest-kite-field', 'ONE place: open field, one kite reel at edge, big sky, empty grass floor. No people, no writing on kites.', GATE.fest),
      ]),
    ],
  },
  i3: {
    id: 'cw-i3-fest-companions',
    harvest_family: 'festivals',
    family: 'festivals',
    title: 'CW FGHI I3 — festival companions 3×3',
    kind: 'companion',
    cultural_review_required: true,
    sheets: [
      sh('S1', 'festival companions 3x3', 'black-contact-3x3', [
        s('fest-paper-lantern', 'single paper lantern still-life, no letters', GATE.fest),
        s('fest-water-basin', 'water basin still-life', GATE.fest),
        s('fest-powder-pile', 'small color-powder pile still-life', GATE.fest),
        s('fest-small-lamp', 'small bowl lamp still-life, not a logo', GATE.sacred),
        s('fest-marigold', 'marigold bunch still-life', GATE.sacred),
        s('fest-paddle', 'boat paddle still-life', GATE.fest),
        s('fest-blank-mask', 'plain festival mask, no sacred faces, no letters', GATE.fest),
        s('fest-wheat-sheaf', 'wheat sheaf still-life', GATE.fest),
        s('fest-ribbon-spool', 'ribbon spool still-life', GATE.fest),
      ]),
    ],
  },
  j1: {
    id: 'cw-j1-places-a',
    harvest_family: 'countries',
    family: 'countries',
    title: 'CW FGHI J1 — country PLACE worlds A (8)',
    kind: 'stage',
    cultural_review_required: true,
    sheets: [
      sh('S1', 'place worlds A1 2x2', 'landscape-contact-2x2', [
        s('place-utility-alley', 'everyday residential alley with utility poles and hanging laundry poles, scooters at EDGES, open pavement center. Neighborhood, not a postcard. NO flags, maps, seals, famous landmarks, labels.', GATE.place, { country_hint: 'JP' }),
        s('place-apt-courtyard', 'apartment-block courtyard, painted play markings, open pavement. Everyday housing. NO flags maps seals labels.', GATE.place, { country_hint: 'KR' }),
        s('place-hutong-court', 'quiet courtyard housing: blank doors, brick/grey walls, open court floor. Everyday. NO tourist-wall collage, NO flags maps seals labels.', GATE.place, { country_hint: 'CN' }),
        s('place-shopfront-bikes', 'narrow shopfront street with motorbikes parked at EDGES, open lane center. Everyday transport street. NO flags maps seals labels, no famous bridges.', GATE.place, { country_hint: 'VN' }),
      ]),
      sh('S2', 'place worlds A2 2x2', 'landscape-contact-2x2', [
        s('place-canal-walk', 'canal-house wooden walkway, water at edge, open boardwalk floor. Everyday. NO flags maps seals labels.', GATE.place, { country_hint: 'TH' }),
        s('place-kampung-alley', 'kampung alley with a small stall sill at edge, open dirt/paving center. Everyday street. NO flags maps seals labels.', GATE.place, { country_hint: 'ID' }),
        s('place-bazaar-lane', 'bazaar lane: hanging pots/textiles at EDGES (no letters on cloth), open aisle. Market place. NO Taj, NO flags maps seals labels.', GATE.place, { country_hint: 'IN' }),
        s('place-bus-park', 'open bus park with a few buses at FAR edges, open packed-dirt center. Transport place. NO flags maps seals labels, no operator names.', GATE.place, { country_hint: 'NG' }),
      ]),
    ],
  },
  j2: {
    id: 'cw-j2-places-b',
    harvest_family: 'countries',
    family: 'countries',
    title: 'CW FGHI J2 — country PLACE worlds B (8)',
    kind: 'stage',
    cultural_review_required: true,
    sheets: [
      sh('S1', 'place worlds B1 2x2', 'landscape-contact-2x2', [
        s('place-open-stall-row', 'open-air stall row, tarps, produce bins at edges, open aisle. Market. NO flags maps seals labels.', GATE.place, { country_hint: 'KE' }),
        s('place-compound-court', 'family compound courtyard, rooms around, open packed-earth center. Housing. NO flags maps seals labels.', GATE.place, { country_hint: 'GH' }),
        s('place-nile-street', 'riverside residential street, water far back, open street floor. Everyday. NO pyramids, sphinx, temples, flags, maps, seals, labels.', GATE.place, { country_hint: 'EG' }),
        s('place-medina-alley', 'narrow medina alley, plaster walls, open passage floor. Everyday street. NOT a tourism collage. NO flags maps seals labels.', GATE.place, { country_hint: 'MA' }),
      ]),
      sh('S2', 'place worlds B2 2x2', 'landscape-contact-2x2', [
        s('place-courtyard-street', 'street opening into a painted-wall courtyard, open floor. Everyday. NO flags maps seals labels, no monument stack.', GATE.place, { country_hint: 'MX' }),
        s('place-stair-houses', 'steep residential stair street between houses, open steps as floor. Everyday. NO famous statues, NO flags maps seals labels.', GATE.place, { country_hint: 'BR' }),
        s('place-highland-plaza', 'highland village plaza, mountains far, simple buildings at edges, open packed plaza. Landscape+town. NO flags maps seals labels.', GATE.place, { country_hint: 'PE' }),
        s('place-ferry-landing', 'small ferry landing, water, waiting floor open. Transport. NO skyline logos, NO flags maps seals labels.', GATE.place, { country_hint: 'TR' }),
      ]),
    ],
  },
  j3: {
    id: 'cw-j3-places-c',
    harvest_family: 'countries',
    family: 'countries',
    title: 'CW FGHI J3 — country PLACE worlds C (4)',
    kind: 'stage',
    cultural_review_required: true,
    sheets: [
      sh('S1', 'place worlds C 2x2', 'landscape-contact-2x2', [
        s('place-whitewashed-lane', 'whitewashed island lane, open stone floor, simple doors. Everyday street. NO flags maps seals labels.', GATE.place, { country_hint: 'GR' }),
        s('place-terrace-street', 'terraced-house residential street, open sidewalk/road center. Housing. NO flags maps seals labels, no palace collage.', GATE.place, { country_hint: 'UK' }),
        s('place-tram-street', 'residential street with tram tracks + stop shelter (blank), open street floor. Transport. NO flags maps seals labels.', GATE.place, { country_hint: 'DE' }),
        s('place-wood-waterfront', 'wooden houses on a quiet waterfront, open dock/path floor. Landscape. NO flags maps seals labels.', GATE.place, { country_hint: 'SE' }),
      ]),
    ],
  },
  // --- Wave 19+ extension (post first-18 stockpile) ---
  f5: {
    id: 'cw-f5-wx-beach-porch',
    harvest_family: 'weather-seasons',
    family: 'weather-seasons',
    title: 'CW FGHI F5 — weather families beach pier+front porch',
    kind: 'stage',
    sheets: [
      sh('S1', 'wx beach pier family 2x2', 'landscape-contact-2x2', [
        s('wx-beach-pier-sunny', `${SAME_BEACH} STATE sunny: dry boards, bright glare, towel roll at edge. Affordance: walk pier, sit edge.`, GATE.wx, { family_id: 'wx-beach-pier' }),
        s('wx-beach-pier-storm', `${SAME_BEACH} STATE storm: wet boards, spray, rope whipping, dark sky. Affordance: hold rail, no sit. Rebuild wet/windy.`, GATE.wx, { family_id: 'wx-beach-pier' }),
        s('wx-beach-pier-fog', `${SAME_BEACH} STATE fog: soft grey, short visibility, damp boards. Affordance: careful steps, muted sea.`, GATE.wx, { family_id: 'wx-beach-pier' }),
        s('wx-beach-pier-dusk', `${SAME_BEACH} STATE dusk: warm low light, lamp posts on, dry. Affordance: evening walk, lamp glow.`, GATE.wx, { family_id: 'wx-beach-pier' }),
      ]),
      sh('S2', 'wx front porch family 2x2', 'landscape-contact-2x2', [
        s('wx-front-porch-sunny', `${SAME_PORCH} STATE sunny: dry steps, open door shade, mat flat. Affordance: sit step, wipe shoes.`, GATE.wx, { family_id: 'wx-front-porch' }),
        s('wx-front-porch-rain', `${SAME_PORCH} STATE rain: dripping eaves, wet steps, closed umbrella in stand. Affordance: stay under roof, splash step.`, GATE.wx, { family_id: 'wx-front-porch' }),
        s('wx-front-porch-snow', `${SAME_PORCH} STATE snow: packed steps, shovel leaning, mail slot rimmed white. Affordance: clear step path.`, GATE.wx, { family_id: 'wx-front-porch' }),
        s('wx-front-porch-autumn', `${SAME_PORCH} STATE autumn: leaf drift on steps, dry cool light, rake at edge. Affordance: sweep leaves.`, GATE.wx, { family_id: 'wx-front-porch' }),
      ]),
    ],
  },
  f6: {
    id: 'cw-f6-wx-roof-walk',
    harvest_family: 'weather-seasons',
    family: 'weather-seasons',
    title: 'CW FGHI F6 — weather families rooftop+covered walk',
    kind: 'stage',
    sheets: [
      sh('S1', 'wx rooftop terrace family 2x2', 'landscape-contact-2x2', [
        s('wx-rooftop-sunny', `${SAME_ROOF} STATE sunny: hot deck, hard shade under awning, dry. Affordance: stand in shade, look out.`, GATE.wx, { family_id: 'wx-rooftop' }),
        s('wx-rooftop-rain', `${SAME_ROOF} STATE rain: puddles on deck, awning taut, wet rail. Affordance: stay under awning.`, GATE.wx, { family_id: 'wx-rooftop' }),
        s('wx-rooftop-snow', `${SAME_ROOF} STATE snow: packed berms, rail capped white, awning sagging slightly. Affordance: packed path only.`, GATE.wx, { family_id: 'wx-rooftop' }),
        s('wx-rooftop-wind', `${SAME_ROOF} STATE wind: chairs tipped at edge, sky streaked, dry. Affordance: lean into wind, grab rail.`, GATE.wx, { family_id: 'wx-rooftop' }),
      ]),
      sh('S2', 'wx covered walk family 2x2', 'landscape-contact-2x2', [
        s('wx-covered-walk-dry', `${SAME_WALK} STATE dry: open walk usable, bright outside. Affordance: walk corridor, stand in light edge.`, GATE.wx, { family_id: 'wx-covered-walk' }),
        s('wx-covered-walk-rain', `${SAME_WALK} STATE rain: drip line at edge, wet outside pavement, dry under cover. Affordance: stay under, watch drips.`, GATE.wx, { family_id: 'wx-covered-walk' }),
        s('wx-covered-walk-snow', `${SAME_WALK} STATE snow: outside packed, under-cover dry strip, cold light. Affordance: clear threshold.`, GATE.wx, { family_id: 'wx-covered-walk' }),
        s('wx-covered-walk-night', `${SAME_WALK} STATE night: ceiling lamps on, dark outside, dry. Affordance: lit path, closed outside.`, GATE.wx, { family_id: 'wx-covered-walk' }),
      ]),
    ],
  },
  h4: {
    id: 'cw-h4-school-outings',
    harvest_family: 'occasions',
    family: 'occasions',
    title: 'CW FGHI H4 — graduation / field-trip / snow-day stages',
    kind: 'stage',
    sheets: [
      sh('S1', 'school outing stages 2x2', 'landscape-contact-2x2', [
        s('occ-grad-foyer', 'school foyer graduation: empty chair rows at edges, blank backdrop cloth (no letters), open floor center for kids. Not the hall dais clone. No people no diplomas with text.', GATE.ok),
        s('occ-fieldtrip-museum', 'museum lobby field-trip: ticket desk at edge (BLANK face), wide open floor, one empty display plinth at back. No people no labels no logos.', GATE.ok),
        s('occ-fieldtrip-nature-path', 'nature-center trailhead: boardwalk start, trail map board BLANK (no letters), open packed-dirt floor. Outdoor field trip. No people no signs with text.', GATE.ok),
        s('occ-snowday-living', 'snow-day living room: window with snow berm outside, cocoa mugs + blanket pile at edge, WIDE open rug floor center. Indoor snow day. No people no TV text.', GATE.ok),
      ]),
    ],
  },
  h5: {
    id: 'cw-h5-outing-companions',
    harvest_family: 'occasions',
    family: 'occasions',
    title: 'CW FGHI H5 — graduation/field-trip/snow-day companions 3×3',
    kind: 'companion',
    sheets: [
      sh('S1', 'outing companions 3x3', 'black-contact-3x3', [
        s('occ-grad-cap', 'graduation cap still-life, no letters on tassel tag', GATE.ok),
        s('occ-grad-scroll', 'blank rolled diploma scroll SHAPE, ZERO letters', GATE.ok),
        s('occ-field-clipboard', 'blank clipboard still-life, no writing', GATE.ok),
        s('occ-field-lunchbox', 'simple lunchbox still-life, no brand', GATE.ok),
        s('occ-field-name-tag-blank', 'blank name-tag SHAPE on lanyard, ZERO letters', GATE.ok),
        s('occ-snow-cocoa', 'cocoa mug with steam, no logo', GATE.ok),
        s('occ-snow-boots', 'pair of kid snow boots still-life', GATE.ok),
        s('occ-snow-mitten', 'single mitten still-life', GATE.ok),
        s('occ-snow-sled-pull', 'small pull-cord sled still-life', GATE.ok),
      ]),
    ],
  },
  j4: {
    id: 'cw-j4-places-d',
    harvest_family: 'countries',
    family: 'countries',
    title: 'CW FGHI J4 — country PLACE worlds D (8)',
    kind: 'stage',
    cultural_review_required: true,
    sheets: [
      sh('S1', 'place worlds D1 2x2', 'landscape-contact-2x2', [
        s('place-veranda-street', 'timber veranda shop street, open road center, shade under eaves. Everyday. NO flags maps seals labels, no opera house collage.', GATE.place, { country_hint: 'AU' }),
        s('place-jeepney-curb', 'residential curb with jeepney-like vans at FAR edge only, open pavement center. Transport street. NO flags maps seals labels, no operator names.', GATE.place, { country_hint: 'PH' }),
        s('place-plaza-arcade', 'small town plaza with arcade at edges, open paving center. Everyday square. NO flags maps seals labels, no cathedral tourism stack.', GATE.place, { country_hint: 'ES' }),
        s('place-portico-court', 'residential courtyard with portico columns, open stone floor. Housing. NO flags maps seals labels, no Colosseum.', GATE.place, { country_hint: 'IT' }),
      ]),
      sh('S2', 'place worlds D2 2x2', 'landscape-contact-2x2', [
        s('place-cafe-terrace-lane', 'quiet lane with empty cafe terrace tables at edge, open cobble center. Everyday. NO flags maps seals labels, no Eiffel.', GATE.place, { country_hint: 'FR' }),
        s('place-timber-market', 'timber-roof covered market aisle, stalls at edges, open floor. Market. NO flags maps seals labels.', GATE.place, { country_hint: 'PL' }),
        s('place-snow-fence-street', 'winter residential street with snow fence + packed path, open center. Everyday cold climate. NO flags maps seals labels.', GATE.place, { country_hint: 'CA' }),
        s('place-patio-block', 'low apartment block with shared patio, laundry lines at edge, open patio floor. Housing. NO flags maps seals labels.', GATE.place, { country_hint: 'AR' }),
      ]),
    ],
  },
  j5: {
    id: 'cw-j5-places-e',
    harvest_family: 'countries',
    family: 'countries',
    title: 'CW FGHI J5 — country PLACE worlds E (4)',
    kind: 'stage',
    cultural_review_required: true,
    sheets: [
      sh('S1', 'place worlds E 2x2', 'landscape-contact-2x2', [
        s('place-souk-arch', 'narrow souk passage with arch, hanging pans at edges (no letters), open aisle. Market street. NO flags maps seals labels, no landmark collage.', GATE.place, { country_hint: 'AE' }),
        s('place-hill-laneway', 'steep green hill laneway between houses, open path floor. Everyday. NO flags maps seals labels.', GATE.place, { country_hint: 'NZ' }),
        s('place-harbor-crate-dock', 'small harbor crate dock, boats at FAR edge, open dock floor. Transport/work. NO flags maps seals labels.', GATE.place, { country_hint: 'PT' }),
        s('place-steppe-stop', 'simple roadside stop with flat steppe horizon, bench + blank shelter, open dirt floor. Landscape+transport. NO flags maps seals labels.', GATE.place, { country_hint: 'MN' }),
      ]),
    ],
  },
  // --- Wave 25+ extension (keep stockpile rolling) ---
  f7: {
    id: 'cw-f7-wx-lib-bike',
    harvest_family: 'weather-seasons',
    family: 'weather-seasons',
    title: 'CW FGHI F7 — weather families library window+bike path',
    kind: 'stage',
    sheets: [
      sh('S1', 'wx library window family 2x2', 'landscape-contact-2x2', [
        s('wx-library-window-sunny', `${SAME_LIB} STATE sunny outside: bright glass, dry light on rug. Affordance: sit bench, look out.`, GATE.wx, { family_id: 'wx-library-window' }),
        s('wx-library-window-rain', `${SAME_LIB} STATE rain outside: streaked glass, grey light, drip edge visible. Affordance: watch rain, stay inside.`, GATE.wx, { family_id: 'wx-library-window' }),
        s('wx-library-window-snow', `${SAME_LIB} STATE snow outside: frosted sill, soft white light. Affordance: warm indoor floor vs cold glass.`, GATE.wx, { family_id: 'wx-library-window' }),
        s('wx-library-window-dusk', `${SAME_LIB} STATE dusk: lamps on inside, deep blue outside. Affordance: lamp glow, evening quiet.`, GATE.wx, { family_id: 'wx-library-window' }),
      ]),
      sh('S2', 'wx bike path family 2x2', 'landscape-contact-2x2', [
        s('wx-bike-path-dry', `${SAME_BIKE} STATE dry: clear path, rack usable. Affordance: ride/lean bike.`, GATE.wx, { family_id: 'wx-bike-path' }),
        s('wx-bike-path-rain', `${SAME_BIKE} STATE rain: puddles, wet sheen, rack dripping. Affordance: splash, careful ride. Rebuild wet.`, GATE.wx, { family_id: 'wx-bike-path' }),
        s('wx-bike-path-snow', `${SAME_BIKE} STATE snow: packed berms, rack buried, grey sky. Affordance: walk packed path only.`, GATE.wx, { family_id: 'wx-bike-path' }),
        s('wx-bike-path-autumn', `${SAME_BIKE} STATE autumn: leaf carpet on path, cool light. Affordance: kick leaves, clear path.`, GATE.wx, { family_id: 'wx-bike-path' }),
      ]),
    ],
  },
  g6: {
    id: 'cw-g6-laundry-park',
    harvest_family: 'everyday-life',
    family: 'everyday-life',
    title: 'CW FGHI G6 — laundry yard + park bench life',
    kind: 'stage',
    sheets: [
      sh('S1', 'laundry and park 2x2', 'landscape-contact-2x2', [
        s('life-laundry-yard', 'backyard laundry: clothesline poles at edges (BLANK cloth shapes, no letters), open packed-dirt/grass center. Not a full kitchen. No people.', GATE.life),
        s('life-laundry-basement', 'basement laundry corner: washer/dryer shapes at edge (no brand letters), open tile floor center. No people no text.', GATE.life),
        s('life-park-chess-table', 'park with empty concrete chess/game table at edge, open paved plaza center. Not a playground clone. No people no text.', GATE.life),
        s('life-park-fountain-rim', 'park fountain rim (water on, empty), wide open pavement ring as floor. No people no statues as subjects no text.', GATE.life),
      ]),
    ],
  },
  h6: {
    id: 'cw-h6-school-days',
    harvest_family: 'occasions',
    family: 'occasions',
    title: 'CW FGHI H6 — first-day / sports-day / recital stages',
    kind: 'stage',
    sheets: [
      sh('S1', 'school day occasions 2x2', 'landscape-contact-2x2', [
        s('occ-firstday-gate', 'school gate first-day: empty gate + backpack rack at edge, open pavement floor. Blank sign back (no letters). No people.', GATE.ok),
        s('occ-sportsday-field', 'sports-day grass field: cone row + finish ribbon posts at edges (blank ribbon), open field center. No people no scoreboard text.', GATE.ok),
        s('occ-recital-stage', 'school recital stage: empty stage floor center, curtain at back, one piano silhouette at edge. No people no sheet music letters.', GATE.ok),
        s('occ-class-photo-wall', 'class-photo backdrop: blank fabric wall + empty stool row at edge, open floor center. ZERO letters on backdrop. No people.', GATE.ok),
      ]),
    ],
  },
  i4: {
    id: 'cw-i4-festivals-c',
    harvest_family: 'festivals',
    family: 'festivals',
    title: 'CW FGHI I4 — festival empty stages C (4)',
    kind: 'stage',
    cultural_review_required: true,
    sheets: [
      sh('S1', 'festival stages C 2x2', 'landscape-contact-2x2', [
        s('fest-boat-lantern-canal', 'ONE place: quiet canal edge, ONE unlit paper lantern boat at water edge, open bank floor. No people, no text, no flags. Mia/Leo absent.', GATE.fest),
        s('fest-midsummer-table', 'ONE place: outdoor long table with flower garland at edge, open grass floor. Empty stage. No people no text.', GATE.fest),
        s('fest-diwali-doorstep', 'ONE place: residential doorstep with small lamp row at edges, open walk floor. Empty stage. No people lighting, no text, no flags. Mia/Leo absent.', GATE.sacred),
        s('fest-ramadan-iftar-cloth', 'ONE place: empty courtyard with low feast cloth at edges, open center. Empty stage only. No people, no religious dress focus, no text. Mia/Leo absent.', GATE.sacred),
      ]),
    ],
  },
  j6: {
    id: 'cw-j6-places-f',
    harvest_family: 'countries',
    family: 'countries',
    title: 'CW FGHI J6 — country PLACE worlds F (8)',
    kind: 'stage',
    cultural_review_required: true,
    sheets: [
      sh('S1', 'place worlds F1 2x2', 'landscape-contact-2x2', [
        s('place-izakaya-alley', 'narrow evening alley with blank noren-like cloths (ZERO letters), open pavement. Everyday street. NO flags maps seals labels.', GATE.place, { country_hint: 'JP' }),
        s('place-hanok-court', 'hanok-style wooden courtyard housing, open packed court. Everyday. NO flags maps seals labels, no palace tourism.', GATE.place, { country_hint: 'KR' }),
        s('place-shophouse-fivefoot', 'shophouse five-foot-way arcade, open covered walk floor. Everyday. NO flags maps seals labels.', GATE.place, { country_hint: 'MY' }),
        s('place-sauna-yard', 'wooden sauna shed + yard, lake edge far, open yard floor. Everyday landscape. NO flags maps seals labels.', GATE.place, { country_hint: 'FI' }),
      ]),
      sh('S2', 'place worlds F2 2x2', 'landscape-contact-2x2', [
        s('place-riads-court', 'quiet riad-style inner court, fountain rim at edge, open tile floor. Housing. NO flags maps seals labels.', GATE.place, { country_hint: 'MA' }),
        s('place-favela-stair-landing', 'residential stair landing between houses, open landing floor. Everyday. NO famous statues, NO flags maps seals labels.', GATE.place, { country_hint: 'BR' }),
        s('place-polder-bike-dike', 'flat polder bike path on a low dike, open path floor. Landscape+transport. NO flags maps seals labels.', GATE.place, { country_hint: 'NL' }),
        s('place-adobe-plaza', 'small adobe-walled plaza, open packed earth. Everyday. NO flags maps seals labels, no monument stack.', GATE.place, { country_hint: 'MX' }),
      ]),
    ],
  },
  // --- Wave 30+ extension ---
  f8: {
    id: 'cw-f8-wx-balcony-bridge',
    harvest_family: 'weather-seasons',
    family: 'weather-seasons',
    title: 'CW FGHI F8 — weather families balcony+footbridge',
    kind: 'stage',
    sheets: [
      sh('S1', 'wx balcony family 2x2', 'landscape-contact-2x2', [
        s('wx-balcony-sunny', `${SAME_BALC} STATE sunny: dry tiles, harsh light, plant wilted edge. Affordance: stand rail shade.`, GATE.wx, { family_id: 'wx-balcony' }),
        s('wx-balcony-rain', `${SAME_BALC} STATE rain: wet tiles, dripping rail, closed door. Affordance: stay under overhang.`, GATE.wx, { family_id: 'wx-balcony' }),
        s('wx-balcony-snow', `${SAME_BALC} STATE snow: berms on tiles, rail capped white. Affordance: clear step to door.`, GATE.wx, { family_id: 'wx-balcony' }),
        s('wx-balcony-night', `${SAME_BALC} STATE night: apartment glow through blank curtain, dry. Affordance: lamp light, quiet rail.`, GATE.wx, { family_id: 'wx-balcony' }),
      ]),
      sh('S2', 'wx footbridge family 2x2', 'landscape-contact-2x2', [
        s('wx-footbridge-dry', `${SAME_BRIDGE} STATE dry: clear boards, bright. Affordance: cross bridge.`, GATE.wx, { family_id: 'wx-footbridge' }),
        s('wx-footbridge-rain', `${SAME_BRIDGE} STATE rain: wet boards, stream high, dark. Affordance: careful steps, watch water.`, GATE.wx, { family_id: 'wx-footbridge' }),
        s('wx-footbridge-snow', `${SAME_BRIDGE} STATE snow: packed boards, frosted rail. Affordance: packed path only.`, GATE.wx, { family_id: 'wx-footbridge' }),
        s('wx-footbridge-fog', `${SAME_BRIDGE} STATE fog: soft grey, short view, damp boards. Affordance: slow cross.`, GATE.wx, { family_id: 'wx-footbridge' }),
      ]),
    ],
  },
  g7: {
    id: 'cw-g7-library-post',
    harvest_family: 'everyday-life',
    family: 'everyday-life',
    title: 'CW FGHI G7 — library desk + post office life',
    kind: 'stage',
    sheets: [
      sh('S1', 'library and post 2x2', 'landscape-contact-2x2', [
        s('life-library-checkout', 'library checkout desk interior: desk at edge, open carpet floor, blank shelf spines as shapes. Not the window-bay weather family. No people no letters.', GATE.life),
        s('life-library-story-rug', 'children story-time corner: blank rug + empty cushion pile at edge, open floor. No people no wall letters.', GATE.life),
        s('life-post-counter', 'post office counter: empty counter + parcel shelf at back (BLANK), open tile floor. No people no postage text.', GATE.life),
        s('life-post-box-street', 'street with free-standing mailbox at edge, open sidewalk floor. Blank metal, no logos. No people.', GATE.life),
      ]),
    ],
  },
  h7: {
    id: 'cw-h7-holiday-break',
    harvest_family: 'occasions',
    family: 'occasions',
    title: 'CW FGHI H7 — holiday-break / sleepover / picnic stages',
    kind: 'stage',
    sheets: [
      sh('S1', 'break occasions 2x2', 'landscape-contact-2x2', [
        s('occ-holiday-living-tree', 'secular holiday living room: evergreen tree silhouette at edge (no ornaments with letters), open rug floor. No people no text.', GATE.ok),
        s('occ-sleepover-floor', 'sleepover living room: blanket nest + pillow pile at edge, WIDE open floor. No people no TV text.', GATE.ok),
        s('occ-picnic-blanket-field', 'open field picnic: cloth at edge, basket, open grass center. Not birthday park clone. No people no signs.', GATE.ok),
        s('occ-campout-tent-clearing', 'backyard campout: one empty tent at edge, lantern, open grass floor. No people no brand logos.', GATE.ok),
      ]),
    ],
  },
  j7: {
    id: 'cw-j7-places-g',
    harvest_family: 'countries',
    family: 'countries',
    title: 'CW FGHI J7 — country PLACE worlds G (4)',
    kind: 'stage',
    cultural_review_required: true,
    sheets: [
      sh('S1', 'place worlds G 2x2', 'landscape-contact-2x2', [
        s('place-township-court', 'simple township courtyard housing, open packed center. Everyday. NO flags maps seals labels.', GATE.place, { country_hint: 'ZA' }),
        s('place-stilt-boardwalk', 'stilt-house boardwalk over water, open board floor. Everyday. NO flags maps seals labels.', GATE.place, { country_hint: 'KH' }),
        s('place-chess-park-plaza', 'city park plaza with empty outdoor game tables at edge, open paving. Everyday. NO flags maps seals labels.', GATE.place, { country_hint: 'RU' }),
        s('place-coral-path-village', 'village path with coral/stone walls, open packed path. Everyday. NO flags maps seals labels, no resort collage.', GATE.place, { country_hint: 'FJ' }),
      ]),
    ],
  },
  // --- Wave 34+ extension ---
  f9: {
    id: 'cw-f9-wx-market-square',
    harvest_family: 'weather-seasons',
    family: 'weather-seasons',
    title: 'CW FGHI F9 — weather family market square',
    kind: 'stage',
    sheets: [
      sh('S1', 'wx market square family 2x2', 'landscape-contact-2x2', [
        s('wx-market-square-sunny', `${SAME_SQUARE} STATE sunny: dry paving, open stall shade. Affordance: walk aisle, sit step.`, GATE.wx, { family_id: 'wx-market-square' }),
        s('wx-market-square-rain', `${SAME_SQUARE} STATE rain: puddles, tarps down, wet sheen. Affordance: splash, duck under tarp.`, GATE.wx, { family_id: 'wx-market-square' }),
        s('wx-market-square-snow', `${SAME_SQUARE} STATE snow: packed berms, stalls closed-looking. Affordance: packed path only.`, GATE.wx, { family_id: 'wx-market-square' }),
        s('wx-market-square-dusk', `${SAME_SQUARE} STATE dusk: string lights on (no letter bulbs), dry. Affordance: evening walk, lamp glow.`, GATE.wx, { family_id: 'wx-market-square' }),
      ]),
    ],
  },
  g8: {
    id: 'cw-g8-sports-gym',
    harvest_family: 'everyday-life',
    family: 'everyday-life',
    title: 'CW FGHI G8 — sports court + gym life',
    kind: 'stage',
    sheets: [
      sh('S1', 'sports life 2x2', 'landscape-contact-2x2', [
        s('life-sports-court', 'outdoor hard court with hoop at edge (blank backboard), open court floor center. No people no scoreboard text.', GATE.life),
        s('life-sports-track', 'school running track bend, open lane floor, blank stands far. No people no lane numbers readable.', GATE.life),
        s('life-gym-mats', 'indoor gym: stacked mats + rope at edges, open wood floor center. No people no wall letters.', GATE.life),
        s('life-pool-deck', 'empty pool deck: water at edge, open tile floor, one kickboard pile. No people no depth numbers.', GATE.life),
      ]),
    ],
  },
  h8: {
    id: 'cw-h8-move-day',
    harvest_family: 'occasions',
    family: 'occasions',
    title: 'CW FGHI H8 — moving-day / clean-up / plant-day stages',
    kind: 'stage',
    sheets: [
      sh('S1', 'chore occasions 2x2', 'landscape-contact-2x2', [
        s('occ-moving-empty-room', 'empty new-home room: boxes at edges, open floor center, blank walls. Moving day. No people no labels on boxes.', GATE.ok),
        s('occ-cleanup-park', 'park clean-up: bins + gloves pile at edge, open grass/path floor. No people no text on bins.', GATE.ok),
        s('occ-plant-day-plot', 'community garden plant-day: empty raised beds + tools at edge, open dirt aisle. No people no signs.', GATE.ok),
        s('occ-bake-sale-table', 'bake-sale table at edge (BLANK treats, no price tags), open pavement floor. School fundraiser. No people no letters.', GATE.ok),
      ]),
    ],
  },
  j8: {
    id: 'cw-j8-places-h',
    harvest_family: 'countries',
    family: 'countries',
    title: 'CW FGHI J8 — country PLACE worlds H (4)',
    kind: 'stage',
    cultural_review_required: true,
    sheets: [
      sh('S1', 'place worlds H 2x2', 'landscape-contact-2x2', [
        s('place-tram-hill-street', 'hilly residential street with tram wires, open street floor. Everyday. NO flags maps seals labels.', GATE.place, { country_hint: 'PT' }),
        s('place-cedar-house-lane', 'cedar-sided house lane, open sidewalk. Everyday. NO flags maps seals labels.', GATE.place, { country_hint: 'CA' }),
        s('place-olive-grove-path', 'olive grove path between trees, open dirt floor. Landscape. NO flags maps seals labels.', GATE.place, { country_hint: 'IT' }),
        s('place-red-earth-compound', 'red-earth family compound yard, open packed center. Housing. NO flags maps seals labels.', GATE.place, { country_hint: 'BF' }),
      ]),
    ],
  },
  // --- Wave 38+ extension ---
  f10: {
    id: 'cw-f10-wx-greenhouse',
    harvest_family: 'weather-seasons',
    family: 'weather-seasons',
    title: 'CW FGHI F10 — weather family greenhouse',
    kind: 'stage',
    sheets: [
      sh('S1', 'wx greenhouse family 2x2', 'landscape-contact-2x2', [
        s('wx-greenhouse-sunny', `${SAME_GREEN} STATE sunny: bright glass, dry pots, hose ready. Affordance: water, stand aisle.`, GATE.wx, { family_id: 'wx-greenhouse' }),
        s('wx-greenhouse-rain', `${SAME_GREEN} STATE rain outside: streaked glass, grey light, wet path outside door. Affordance: stay inside dry.`, GATE.wx, { family_id: 'wx-greenhouse' }),
        s('wx-greenhouse-snow', `${SAME_GREEN} STATE snow outside: frosted panes, warm interior contrast. Affordance: warm aisle vs cold glass.`, GATE.wx, { family_id: 'wx-greenhouse' }),
        s('wx-greenhouse-dusk', `${SAME_GREEN} STATE dusk: grow-lamp glow shapes (no text), deep outside. Affordance: evening light.`, GATE.wx, { family_id: 'wx-greenhouse' }),
      ]),
    ],
  },
  g9: {
    id: 'cw-g9-atelier-lab',
    harvest_family: 'everyday-life',
    family: 'everyday-life',
    title: 'CW FGHI G9 — art studio + science lab life',
    kind: 'stage',
    sheets: [
      sh('S1', 'atelier and lab 2x2', 'landscape-contact-2x2', [
        s('life-art-studio', 'art studio: easels + paint trays at edges, open floor center, blank canvases. No people no wall letters.', GATE.life),
        s('life-pottery-wheel', 'pottery corner: wheel + clay shelves at edge, open floor. No people no labels.', GATE.life),
        s('life-science-lab-bench', 'school science lab: benches at edges with blank bottles (no labels), open aisle floor. No people no hazard text.', GATE.life),
        s('life-makerspace-bench', 'makerspace: tool wall shapes at back (blank), open workbench floor. No people no brand logos.', GATE.life),
      ]),
    ],
  },
  h9: {
    id: 'cw-h9-parade-fair',
    harvest_family: 'occasions',
    family: 'occasions',
    title: 'CW FGHI H9 — parade route / school fair stages',
    kind: 'stage',
    sheets: [
      sh('S1', 'fair occasions 2x2', 'landscape-contact-2x2', [
        s('occ-parade-curb', 'parade curb: barriers at edges, open asphalt floor, one blank float silhouette far. Not festival parade clone depth. No people no banner text.', GATE.ok),
        s('occ-school-fair-booths', 'school fair: two empty booths at edges, open dirt aisle. No people no signs with letters.', GATE.ok),
        s('occ-book-fair-tables', 'book fair: empty table rows at edges, open aisle, blank book spine shapes. No people no titles readable.', GATE.ok),
        s('occ-costume-hallway', 'costume-day hallway: empty lockers + one costume rack at edge, open floor. Secular dress-up. No people no wall letters.', GATE.ok),
      ]),
    ],
  },
  j9: {
    id: 'cw-j9-places-i',
    harvest_family: 'countries',
    family: 'countries',
    title: 'CW FGHI J9 — country PLACE worlds I (4)',
    kind: 'stage',
    cultural_review_required: true,
    sheets: [
      sh('S1', 'place worlds I 2x2', 'landscape-contact-2x2', [
        s('place-tin-roof-alley', 'tin-roof residential alley, open packed path. Everyday. NO flags maps seals labels.', GATE.place, { country_hint: 'PH' }),
        s('place-stone-village-lane', 'stone village lane, open cobble floor. Everyday. NO flags maps seals labels, no castle collage.', GATE.place, { country_hint: 'IE' }),
        s('place-desert-oasis-stop', 'desert roadside stop with shade structure, open sand/dirt floor. Landscape+transport. NO flags maps seals labels.', GATE.place, { country_hint: 'JO' }),
        s('place-bamboo-path-court', 'bamboo-edged courtyard path, open packed floor. Everyday. NO flags maps seals labels.', GATE.place, { country_hint: 'CN' }),
      ]),
    ],
  },
  // --- Wave 42+ extension ---
  f11: {
    id: 'cw-f11-wx-train-plat',
    harvest_family: 'weather-seasons',
    family: 'weather-seasons',
    title: 'CW FGHI F11 — weather family train platform',
    kind: 'stage',
    sheets: [
      sh('S1', 'wx train platform family 2x2', 'landscape-contact-2x2', [
        s('wx-train-plat-sunny', `${SAME_PLAT} STATE sunny: dry platform, bright. Affordance: stand wait zone, sit bench.`, GATE.wx, { family_id: 'wx-train-plat' }),
        s('wx-train-plat-rain', `${SAME_PLAT} STATE rain: wet platform, canopy drip line. Affordance: stay under canopy.`, GATE.wx, { family_id: 'wx-train-plat' }),
        s('wx-train-plat-snow', `${SAME_PLAT} STATE snow: packed berms, canopy clear strip. Affordance: packed path only.`, GATE.wx, { family_id: 'wx-train-plat' }),
        s('wx-train-plat-night', `${SAME_PLAT} STATE night: platform lamps on, dry. Affordance: lit wait zone.`, GATE.wx, { family_id: 'wx-train-plat' }),
      ]),
    ],
  },
  g10: {
    id: 'cw-g10-grocery-bank',
    harvest_family: 'everyday-life',
    family: 'everyday-life',
    title: 'CW FGHI G10 — grocery aisle + bank lobby life',
    kind: 'stage',
    sheets: [
      sh('S1', 'grocery and bank 2x2', 'landscape-contact-2x2', [
        s('life-grocery-aisle', 'grocery aisle: shelves at edges with BLANK box faces, open floor center, empty cart at edge. No people no price tags.', GATE.life),
        s('life-grocery-checkout', 'checkout lane empty: belt + bag stand at edge, open floor. Blank register screen shape (no text). No people.', GATE.life),
        s('life-bank-lobby', 'bank lobby: teller counter at back (blank), open tile floor, one rope queue stand. No people no logos.', GATE.life),
        s('life-atm-recess', 'ATM wall recess at edge (blank screen), open sidewalk floor. No people no bank names.', GATE.life),
      ]),
    ],
  },
  h10: {
    id: 'cw-h10-award-day',
    harvest_family: 'occasions',
    family: 'occasions',
    title: 'CW FGHI H10 — award day / talent show stages',
    kind: 'stage',
    sheets: [
      sh('S1', 'award occasions 2x2', 'landscape-contact-2x2', [
        s('occ-award-stage', 'school award stage: empty podium at edge, blank backdrop cloth, open stage floor. No people no trophy engravings readable.', GATE.ok),
        s('occ-talent-curtains', 'talent-show stage: curtains at back, open stage floor, one mic stand at edge. No people no banner text.', GATE.ok),
        s('occ-science-fair-tables', 'science fair: empty display tables at edges, open aisle. Blank boards (ZERO letters). No people.', GATE.ok),
        s('occ-spelling-bee-chairs', 'spelling-bee room: chair rows at edges, open floor center, blank easel shape (no letters). No people.', GATE.ok),
      ]),
    ],
  },
  j10: {
    id: 'cw-j10-places-j',
    harvest_family: 'countries',
    family: 'countries',
    title: 'CW FGHI J10 — country PLACE worlds J (4)',
    kind: 'stage',
    cultural_review_required: true,
    sheets: [
      sh('S1', 'place worlds J 2x2', 'landscape-contact-2x2', [
        s('place-fjord-dock', 'small fjord dock, mountains far, open dock floor. Landscape. NO flags maps seals labels.', GATE.place, { country_hint: 'NO' }),
        s('place-savanna-stop', 'savanna roadside stop with acacia silhouettes far, open dirt floor. Landscape+transport. NO flags maps seals labels.', GATE.place, { country_hint: 'TZ' }),
        s('place-colonial-arcade', 'arcade-lined residential street, open covered walk. Everyday. NO flags maps seals labels, no palace collage.', GATE.place, { country_hint: 'CU' }),
        s('place-pagoda-lane-quiet', 'quiet residential lane with simple roof eaves (not a temple stack), open stone floor. Everyday. NO flags maps seals labels.', GATE.place, { country_hint: 'MM' }),
      ]),
    ],
  },
  // --- Wave 46+ extension ---
  f12: {
    id: 'cw-f12-wx-campground',
    harvest_family: 'weather-seasons',
    family: 'weather-seasons',
    title: 'CW FGHI F12 — weather family campground',
    kind: 'stage',
    sheets: [
      sh('S1', 'wx campground family 2x2', 'landscape-contact-2x2', [
        s('wx-campground-sunny', `${SAME_CAMP} STATE sunny: dry ground, open tent flap. Affordance: sit log, walk clearing.`, GATE.wx, { family_id: 'wx-campground' }),
        s('wx-campground-rain', `${SAME_CAMP} STATE rain: wet ground, tent closed, puddles. Affordance: stay under fly.`, GATE.wx, { family_id: 'wx-campground' }),
        s('wx-campground-snow', `${SAME_CAMP} STATE snow: packed clearing, tent frosted. Affordance: packed path only.`, GATE.wx, { family_id: 'wx-campground' }),
        s('wx-campground-dusk', `${SAME_CAMP} STATE dusk: lantern glow, dry. Affordance: evening fire ring (empty).`, GATE.wx, { family_id: 'wx-campground' }),
      ]),
    ],
  },
  g11: {
    id: 'cw-g11-salon-barber',
    harvest_family: 'everyday-life',
    family: 'everyday-life',
    title: 'CW FGHI G11 — salon + barber life',
    kind: 'stage',
    sheets: [
      sh('S1', 'salon life 2x2', 'landscape-contact-2x2', [
        s('life-hair-salon', 'hair salon: empty chairs + mirrors at edges, open floor center. Blank bottles. No people no wall letters.', GATE.life),
        s('life-barber-shop', 'barber shop: empty chair + pole silhouette (no text), open floor. No people no logos.', GATE.life),
        s('life-nail-station', 'nail station: empty table + lamp at edge, open floor. No people no brand labels.', GATE.life),
        s('life-waiting-sofa', 'salon waiting nook: sofa + plant at edge, open floor. Not clinic waiting clone. No people no magazines with text.', GATE.life),
      ]),
    ],
  },
  h11: {
    id: 'cw-h11-family-reunion',
    harvest_family: 'occasions',
    family: 'occasions',
    title: 'CW FGHI H11 — reunion / potluck / open-house stages',
    kind: 'stage',
    sheets: [
      sh('S1', 'gathering occasions 2x2', 'landscape-contact-2x2', [
        s('occ-reunion-yard', 'family reunion yard: long empty tables at edges, open grass center. No people no banners with letters.', GATE.ok),
        s('occ-potluck-hall', 'community potluck hall: empty buffet tables at edges, open floor. Blank food trays. No people no signs.', GATE.ok),
        s('occ-openhouse-living', 'open-house living room: staged empty, open floor, blank brochure stand shape (ZERO text). No people.', GATE.ok),
        s('occ-housewarming-entry', 'housewarming entry: gift table at edge, open foyer floor. No people no cards with text.', GATE.ok),
      ]),
    ],
  },
  j11: {
    id: 'cw-j11-places-k',
    harvest_family: 'countries',
    family: 'countries',
    title: 'CW FGHI J11 — country PLACE worlds K (4)',
    kind: 'stage',
    cultural_review_required: true,
    sheets: [
      sh('S1', 'place worlds K 2x2', 'landscape-contact-2x2', [
        s('place-rice-terrace-path', 'rice terrace path, open packed path floor, fields stepped. Landscape. NO flags maps seals labels.', GATE.place, { country_hint: 'ID' }),
        s('place-canyon-pueblo-court', 'pueblo-style courtyard housing, open packed center. Everyday. NO flags maps seals labels, no tourism stack.', GATE.place, { country_hint: 'US' }),
        s('place-thermal-boardwalk', 'thermal pool boardwalk (steam), open board floor. Landscape. NO flags maps seals labels.', GATE.place, { country_hint: 'IS' }),
        s('place-spice-godown-aisle', 'spice warehouse aisle: sacks at edges, open floor. Market/work. NO flags maps seals labels.', GATE.place, { country_hint: 'LK' }),
      ]),
    ],
  },
  // --- Wave 50+ extension ---
  f13: {
    id: 'cw-f13-wx-dock',
    harvest_family: 'weather-seasons',
    family: 'weather-seasons',
    title: 'CW FGHI F13 — weather family fishing dock',
    kind: 'stage',
    sheets: [
      sh('S1', 'wx fishing dock family 2x2', 'landscape-contact-2x2', [
        s('wx-dock-sunny', `${SAME_DOCK} STATE sunny: dry boards, bright water. Affordance: stand dock, sit crate.`, GATE.wx, { family_id: 'wx-dock' }),
        s('wx-dock-rain', `${SAME_DOCK} STATE rain: wet boards, ripples, dark. Affordance: careful steps.`, GATE.wx, { family_id: 'wx-dock' }),
        s('wx-dock-fog', `${SAME_DOCK} STATE fog: soft grey, short view, damp. Affordance: slow walk.`, GATE.wx, { family_id: 'wx-dock' }),
        s('wx-dock-dusk', `${SAME_DOCK} STATE dusk: warm low light, lantern on post. Affordance: evening dock.`, GATE.wx, { family_id: 'wx-dock' }),
      ]),
    ],
  },
  g12: {
    id: 'cw-g12-hotel-lobby',
    harvest_family: 'everyday-life',
    family: 'everyday-life',
    title: 'CW FGHI G12 — hotel lobby + luggage life',
    kind: 'stage',
    sheets: [
      sh('S1', 'hotel life 2x2', 'landscape-contact-2x2', [
        s('life-hotel-lobby', 'hotel lobby: desk at edge (blank), open carpet floor, luggage cart empty. No people no logos.', GATE.life),
        s('life-hotel-corridor', 'hotel corridor: doors at edges, open carpet runner floor. No people no room numbers readable.', GATE.life),
        s('life-luggage-claim', 'luggage claim hall: empty carousel at edge, open floor. No people no airline logos.', GATE.life),
        s('life-concierge-desk', 'concierge desk nook: desk + key rack shapes at edge (blank), open floor. No people no text.', GATE.life),
      ]),
    ],
  },
  h12: {
    id: 'cw-h12-new-year-secular',
    harvest_family: 'occasions',
    family: 'occasions',
    title: 'CW FGHI H12 — secular new-year / countdown stages',
    kind: 'stage',
    sheets: [
      sh('S1', 'new year occasions 2x2', 'landscape-contact-2x2', [
        s('occ-countdown-living', 'secular countdown living room: blank TV shape (no text), snack table at edge, open rug floor. No people.', GATE.ok),
        s('occ-party-hats-table', 'party table with blank hats + noisemakers at edge, open floor. Secular. No people no year numbers.', GATE.ok),
        s('occ-midnight-balcony', 'balcony at night with string lights, open balcony floor. Secular new year. No fireworks as weapons, no people no text.', GATE.ok),
        s('occ-resolution-desk', 'desk with blank notebook + calendar shape (ZERO numerals/letters), open floor. No people.', GATE.ok),
      ]),
    ],
  },
  j12: {
    id: 'cw-j12-places-l',
    harvest_family: 'countries',
    family: 'countries',
    title: 'CW FGHI J12 — country PLACE worlds L (4)',
    kind: 'stage',
    cultural_review_required: true,
    sheets: [
      sh('S1', 'place worlds L 2x2', 'landscape-contact-2x2', [
        s('place-tundra-path', 'tundra village path, open packed path, low buildings at edges. Landscape. NO flags maps seals labels.', GATE.place, { country_hint: 'GL' }),
        s('place-orchard-ladder-lane', 'orchard lane with ladder at edge, open dirt floor. Landscape/work. NO flags maps seals labels.', GATE.place, { country_hint: 'CL' }),
        s('place-tram-cable-stop', 'hill cable-tram stop platform (blank shelter), open platform floor. Transport. NO flags maps seals labels.', GATE.place, { country_hint: 'HK' }),
        s('place-mudbrick-lane', 'mudbrick residential lane, open packed floor. Everyday. NO flags maps seals labels.', GATE.place, { country_hint: 'ML' }),
      ]),
    ],
  },
  // --- Wave 54+ extension ---
  f14: {
    id: 'cw-f14-wx-bus-stop',
    harvest_family: 'weather-seasons',
    family: 'weather-seasons',
    title: 'CW FGHI F14 — weather family bus shelter',
    kind: 'stage',
    sheets: [
      sh('S1', 'wx bus shelter family 2x2', 'landscape-contact-2x2', [
        s('wx-bus-shelter-sunny', `${SAME_BUS} STATE sunny: dry bench, bright curb. Affordance: sit bench, stand curb.`, GATE.wx, { family_id: 'wx-bus-shelter' }),
        s('wx-bus-shelter-rain', `${SAME_BUS} STATE rain: wet curb, drip from roof edge. Affordance: stay under shelter.`, GATE.wx, { family_id: 'wx-bus-shelter' }),
        s('wx-bus-shelter-snow', `${SAME_BUS} STATE snow: berms, packed path to curb. Affordance: packed path only.`, GATE.wx, { family_id: 'wx-bus-shelter' }),
        s('wx-bus-shelter-night', `${SAME_BUS} STATE night: shelter lamp on, dry. Affordance: lit wait zone.`, GATE.wx, { family_id: 'wx-bus-shelter' }),
      ]),
    ],
  },
  g13: {
    id: 'cw-g13-fire-police',
    harvest_family: 'everyday-life',
    family: 'everyday-life',
    title: 'CW FGHI G13 — fire station + police lobby life',
    kind: 'stage',
    sheets: [
      sh('S1', 'public safety life 2x2', 'landscape-contact-2x2', [
        s('life-fire-bay', 'fire station bay: empty truck bay at edge, open concrete floor. No people no logos no numbers.', GATE.life),
        s('life-fire-pole-room', 'fire station gear room: empty racks at edge, open floor. Blank coats. No people no text.', GATE.life),
        s('life-police-lobby', 'police station lobby: desk at edge (blank), open tile floor. No people no badges as logos.', GATE.life),
        s('life-crossing-guard-corner', 'school crossing corner: blank stop paddle shape at edge, open crosswalk floor. No people no letters on paddle.', GATE.life),
      ]),
    ],
  },
  h13: {
    id: 'cw-h13-pet-day',
    harvest_family: 'occasions',
    family: 'occasions',
    title: 'CW FGHI H13 — pet-day / show-and-tell stages',
    kind: 'stage',
    sheets: [
      sh('S1', 'pet day occasions 2x2', 'landscape-contact-2x2', [
        s('occ-pet-day-classroom', 'classroom pet-day: empty desks at edges, open floor, one pet carrier at edge (empty). No animals drawn as subjects, no people no wall letters.', GATE.ok),
        s('occ-show-tell-circle', 'show-and-tell rug circle: empty cushions at edge, open rug center. No people no posters with text.', GATE.ok),
        s('occ-adoption-fair-booth', 'pet adoption fair booth: empty pens at edges (no animals), open aisle. No people no signs with text.', GATE.ok),
        s('occ-vet-waiting', 'vet waiting room: empty chairs at edge, open floor. Not clinic clone. No people no posters with text.', GATE.ok),
      ]),
    ],
  },
  j13: {
    id: 'cw-j13-places-m',
    harvest_family: 'countries',
    family: 'countries',
    title: 'CW FGHI J13 — country PLACE worlds M (4)',
    kind: 'stage',
    cultural_review_required: true,
    sheets: [
      sh('S1', 'place worlds M 2x2', 'landscape-contact-2x2', [
        s('place-tea-garden-path', 'tea garden path between shrubs, open packed path. Landscape. NO flags maps seals labels.', GATE.place, { country_hint: 'LK' }),
        s('place-baobab-court', 'village court with baobab silhouette far, open packed center. Everyday. NO flags maps seals labels.', GATE.place, { country_hint: 'SN' }),
        s('place-canal-house-yard', 'canal-side house backyard with bike rack, open yard floor. Everyday. NO flags maps seals labels.', GATE.place, { country_hint: 'NL' }),
        s('place-monastery-outer-court', 'outer courtyard of simple stone buildings (not sacred interior), open floor. Everyday/landscape. NO flags maps seals labels, Mia/Leo absent.', GATE.place, { country_hint: 'BT' }),
      ]),
    ],
  },
  f15: {
    id: 'cw-f15-wx-attic',
    harvest_family: 'weather-seasons',
    family: 'weather-seasons',
    title: 'CW FGHI F15 — weather family attic window',
    kind: 'stage',
    sheets: [
      sh('S1', 'wx attic window family 2x2', 'landscape-contact-2x2', [
        s('wx-attic-sunny', `${SAME_ATTIC} STATE sunny outside: bright dust motes, dry floor. Affordance: sit trunk, look out.`, GATE.wx, { family_id: 'wx-attic' }),
        s('wx-attic-rain', `${SAME_ATTIC} STATE rain outside: streaked glass, grey light. Affordance: watch rain, stay dry.`, GATE.wx, { family_id: 'wx-attic' }),
        s('wx-attic-snow', `${SAME_ATTIC} STATE snow outside: frosted sill, soft white light. Affordance: warm attic vs cold glass.`, GATE.wx, { family_id: 'wx-attic' }),
        s('wx-attic-dusk', `${SAME_ATTIC} STATE dusk: lamp glow inside, deep blue outside. Affordance: evening quiet.`, GATE.wx, { family_id: 'wx-attic' }),
      ]),
    ],
  },
  g14: {
    id: 'cw-g14-hardware-tool',
    harvest_family: 'everyday-life',
    family: 'everyday-life',
    title: 'CW FGHI G14 — hardware aisle + tool bench life',
    kind: 'stage',
    sheets: [
      sh('S1', 'hardware life 2x2', 'landscape-contact-2x2', [
        s('life-hardware-aisle', 'hardware store aisle: bins at edges (blank labels), open floor center. No people no price tags.', GATE.life),
        s('life-paint-mixing', 'paint mixing counter: cans at edge (blank), open floor. No people no brand logos.', GATE.life),
        s('life-garage-bench', 'home garage tool bench at edge, open concrete floor, blank tool wall shapes. No people no logos.', GATE.life),
        s('life-bike-repair-stand', 'bike repair stand at edge (empty bike silhouette OK), open floor. No people no brand logos.', GATE.life),
      ]),
    ],
  },
  h14: {
    id: 'cw-h14-lost-found',
    harvest_family: 'occasions',
    family: 'occasions',
    title: 'CW FGHI H14 — lost-and-found / orientation stages',
    kind: 'stage',
    sheets: [
      sh('S1', 'school admin occasions 2x2', 'landscape-contact-2x2', [
        s('occ-lost-found-shelf', 'lost-and-found shelf at edge with unlabeled items, open hallway floor. No people no name tags with text.', GATE.ok),
        s('occ-orientation-booth', 'school orientation booth: empty table + blank brochure stand (ZERO text), open floor. No people.', GATE.ok),
        s('occ-teacher-desk-night', 'classroom after-hours: empty teacher desk at edge, open floor, dusk window. No people no papers with text.', GATE.ok),
        s('occ-assembly-floor', 'gym assembly: empty chair rows at edges, open floor center. No people no banner letters.', GATE.ok),
      ]),
    ],
  },
  j14: {
    id: 'cw-j14-places-n',
    harvest_family: 'countries',
    family: 'countries',
    title: 'CW FGHI J14 — country PLACE worlds N (4)',
    kind: 'stage',
    cultural_review_required: true,
    sheets: [
      sh('S1', 'place worlds N 2x2', 'landscape-contact-2x2', [
        s('place-lavender-field-path', 'lavender field path, open dirt path floor. Landscape. NO flags maps seals labels.', GATE.place, { country_hint: 'FR' }),
        s('place-fishing-village-slip', 'fishing village slipway, boats at FAR edge, open slip floor. Transport/work. NO flags maps seals labels.', GATE.place, { country_hint: 'PT' }),
        s('place-stepwell-rim', 'quiet stepwell rim courtyard, open stone floor (empty of bathers). Everyday/landscape. NO flags maps seals labels.', GATE.place, { country_hint: 'IN' }),
        s('place-cedar-forest-trail', 'cedar forest trail, open packed path. Landscape. NO flags maps seals labels.', GATE.place, { country_hint: 'LB' }),
      ]),
    ],
  },
};

export const WAVE_ORDER = [
  'f1', 'f2', 'f3', 'f4',
  'g1', 'g2', 'g3', 'g4', 'g5',
  'h1', 'h2', 'h3',
  'i1', 'i2', 'i3',
  'j1', 'j2', 'j3',
  'f5', 'f6',
  'h4', 'h5',
  'j4', 'j5',
  'f7', 'g6', 'h6', 'i4', 'j6',
  'f8', 'g7', 'h7', 'j7',
  'f9', 'g8', 'h8', 'j8',
  'f10', 'g9', 'h9', 'j9',
  'f11', 'g10', 'h10', 'j10',
  'f12', 'g11', 'h11', 'j11',
  'f13', 'g12', 'h12', 'j12',
  'f14', 'g13', 'h13', 'j13',
  'f15', 'g14', 'h14', 'j14',
];

function isRateLimitError(err) {
  const msg = String(err && err.message ? err.message : err);
  return /\b429\b/.test(msg) || /rate limit/i.test(msg) || /resource_exhausted/i.test(msg);
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

function fghiFamilyDirs() {
  const names = [...new Set(WAVE_ORDER.map((id) => WAVES[id].harvest_family))];
  return names.map((n) => path.join(STOCKPILE, n));
}

function otherInFlight(thisWaveId) {
  for (const dir of fghiFamilyDirs()) {
    for (const runPath of walkRunJsons(dir)) {
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
  return path.join(STOCKPILE, wave.harvest_family, wave.id);
}

function sheetBlock(sheet, index, kind) {
  const lines = sheet.cells.map((c, i) => `${i + 1}. ${c.key} — ${c.brief}`);
  const layout =
    kind === 'companion'
      ? '3×3 black-field grid, one companion per cell'
      : '2×2 grid of landscape panels; each cell is one complete 1280×590-feel stage';
  return `SHEET ${index} — ${sheet.title} (${sheet.format}, ${layout}):\n${lines.join('\n')}\nKeys: ${sheet.cells.map((c) => c.key).join(',')}`;
}

function buildBrief(wave, sheets) {
  const kind = wave.kind === 'companion' ? 'companion' : 'stage';
  const lock = kind === 'companion' ? COMPANION_LOCK : STAGE_LOCK;
  const extra =
    wave.family === 'festivals'
      ? 'FESTIVAL RULE: empty stage + few anchors. ONE place, ONE action. No symbol soup. Mia/Leo absent. cultural_review_required=true.'
      : wave.family === 'countries'
        ? 'PLACE RULE: everyday landscape/street/housing/transport/market. NOT a tourism collage. NO flags, maps, seals, labels, famous-monument stacks.'
        : wave.family === 'weather-seasons' && kind === 'stage'
          ? 'FAMILY RULE: registered similar-scene set. Camera and architecture LOCKED across the four cells. Weather/season must CHANGE affordance (puddles, berms, shade, ice), not just recolor the sky.'
          : wave.family === 'everyday-life'
            ? 'LIFE RULE: global everyday variation. Do not caption or costume the scene as “this is all of country X”.'
            : '';
  return withEslAssetGeneratorBrief(`TASK: Produce **${sheets.length} landscape PNG contact sheet(s)** for ClassIn ESL content-world stockpile FGHI (${wave.family}).

${lock}

${extra}

HARD RULES:
- Generate ONLY the listed cells. Do not research extra festivals/countries or add concepts.
- Reading order left→right, top→bottom.
- NO people, faces, animals as subjects (props/boats/empty chairs OK).
- NO baked readable text. NO flags, maps, seals, country names.
- quality: default ONLY.
- Keep generating inside THIS task until every listed PNG exists. The 5-image cap is per generate_image call, not per task.

${sheets.map((sheet, i) => sheetBlock(sheet, i + 1, kind)).join('\n\n')}

Return PNGs, preferably one zip plus CDN links. No essay.`);
}

function collectImageAtts(messages) {
  const hits = [];
  for (const m of messages || []) {
    const b = m.assistant_message || (m.type === 'assistant_message' ? m : null);
    const atts = (b && b.attachments) || m.attachments || [];
    for (const a of atts) {
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
  const r = spawnSync('tar', ['-xf', zipPath, '-C', outDir], { encoding: 'utf8', windowsHide: true });
  if (r.status === 0) return;
  const ps = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-Command', `Expand-Archive -LiteralPath ${JSON.stringify(zipPath)} -DestinationPath ${JSON.stringify(outDir)} -Force`],
    { encoding: 'utf8', windowsHide: true },
  );
  if (ps.status !== 0) {
    throw new Error(`Failed to extract zip (tar: ${r.stderr || r.status}; Expand-Archive: ${ps.stderr || ps.status})`);
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

function allCells() {
  return WAVE_ORDER.flatMap((id) => WAVES[id].sheets.flatMap((sh) => sh.cells));
}

function recomputeTotals(inv) {
  const waves = Object.values(inv.waves || {});
  const items = waves.flatMap((w) => w.items || []);
  inv.running_total = {
    tasks: waves.filter((w) => w.task_id).length,
    sheets_downloaded: waves.reduce((n, w) => n + (w.sheets || []).length, 0),
    stage_cells: items.filter((it) => it.kind !== 'companion').length,
    companion_cells: items.filter((it) => it.kind === 'companion').length,
    weather_families: 20,
    country_places: ['j1', 'j2', 'j3', 'j4', 'j5', 'j6', 'j7', 'j8', 'j9', 'j10', 'j11', 'j12', 'j13']
      .filter((id) => WAVES[id])
      .reduce((n, id) => n + WAVES[id].sheets.reduce((m, sh) => m + sh.cells.length, 0), 0),
    festival_stages: ['i1', 'i2', 'i4']
      .filter((id) => WAVES[id])
      .reduce((n, id) => n + WAVES[id].sheets.reduce((m, sh) => m + sh.cells.length, 0), 0),
    pass: items.filter((it) => it.qa_status === 'PASS').length,
    hold: items.filter((it) => it.qa_status === 'HOLD').length,
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
  const invPath = path.join(STOCKPILE, 'inventory-fghi.json');
  if (!fs.existsSync(invPath)) {
    return {
      kind: 'content-worlds-fghi',
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
  fs.writeFileSync(path.join(STOCKPILE, 'inventory-fghi.json'), JSON.stringify(inv, null, 2));
  return path.join(STOCKPILE, 'inventory-fghi.json');
}

function provenance(cell, wave) {
  const gates = cell.research_gate || [];
  return {
    content_family: wave.family,
    title: cell.concept,
    source: 'manus-generated-stockpile',
    rights_status: 'generated-stockpile',
    verification_date: new Date().toISOString().slice(0, 10),
    cultural_review_needed: gates.includes('cultural_review_required') || gates.includes('sacred_adjacent'),
    map_review_needed: false,
    research_gate: gates,
    country_hint: cell.country_hint || null,
    family_id: cell.family_id || null,
    notes: wave.cultural_review_required
      ? 'Hold before lesson wiring. Empty stage; Mia/Leo not fused into practice.'
      : cell.family_id
        ? `Registered similar-scene family ${cell.family_id}.`
        : '',
  };
}

function waveSlot(wave) {
  return WAVE_ORDER.find((id) => WAVES[id] && WAVES[id].id === wave.id) || wave.id;
}

function upsertInventory(wave, sheets, dump) {
  const inv = loadInv();
  const haveLarge = (dump.saved || []).filter((x) => x.bytes > 80_000).length >= expectedSheets(wave);
  const items = sheets.flatMap((sheet) => sheet.cells.map((c) => ({
    ...c,
    kind: wave.kind,
    status: haveLarge ? 'generated_raw' : dump.task_id ? 'fired' : 'pending',
    qa_status: c.qa_status || null,
    path: dump.sheet_dir || null,
    sheet_id: sheet.id,
    manus_task_id: dump.task_id || null,
    provenance: provenance(c, wave),
  })));
  inv.waves[waveSlot(wave)] = {
    family: wave.family,
    harvest_family: wave.harvest_family,
    title: wave.title,
    kind: wave.kind,
    task_id: dump.task_id || null,
    task_url: dump.task_url || null,
    agent_status: dump.agent_status || null,
    sheet_dir: dump.sheet_dir || null,
    expected_sheets: expectedSheets(wave),
    concept_count: items.length,
    sheets: (dump.saved || []).map((x) => ({ file: x.file || path.basename(x.dest || ''), bytes: x.bytes, name: x.name || null })),
    items,
    holds: dump.holds || [],
    finished_at: dump.finished_at || null,
  };
  return writeInv(inv);
}

function catalogCounts() {
  const cells = allCells();
  const stages = cells.filter((c) => !String(c.key).includes('wx-umb') && WAVES);
  void stages;
  const byWaveKind = WAVE_ORDER.map((id) => WAVES[id]);
  return {
    waves_planned: WAVE_ORDER.length,
    stage_cells_planned: byWaveKind.filter((w) => w.kind === 'stage').reduce((n, w) => n + w.sheets.reduce((m, sh) => m + sh.cells.length, 0), 0),
    companion_cells_planned: byWaveKind.filter((w) => w.kind === 'companion').reduce((n, w) => n + w.sheets.reduce((m, sh) => m + sh.cells.length, 0), 0),
    weather_families: 20,
    country_places: 68,
    festival_stages: 20,
  };
}

function writeDocStub(inv) {
  const tot = inv.running_total || {};
  const planned = catalogCounts();
  const lines = [
    '# Content worlds FGHI — stockpile catalog',
    '',
    'Stockpile only. No producer wiring. Prefix `cw-`.',
    'Harvest `harvested/content-worlds/{weather-seasons,everyday-life,occasions,festivals,countries}/`.',
    'Songs excluded. No flags/maps/seals. Festival + country + wedding: `cultural_review_required`.',
    '',
    '## Planned catalog',
    '',
    `| Metric | Count |`,
    `|---|---:|`,
    `| Weather families (registered) | ${planned.weather_families} |`,
    `| Country PLACE worlds | ${planned.country_places} |`,
    `| Festival stages | ${planned.festival_stages} |`,
    `| Stage cells planned | ${planned.stage_cells_planned} |`,
    `| Companion cells planned | ${planned.companion_cells_planned} |`,
    `| Waves / tasks planned | ${planned.waves_planned} |`,
    '',
    '## Running totals',
    '',
    `| Metric | Count |`,
    `|---|---:|`,
    `| Tasks | ${tot.tasks || 0} |`,
    `| Sheets downloaded | ${tot.sheets_downloaded || 0} |`,
    `| Stage cells harvested | ${tot.stage_cells || 0} |`,
    `| Companion cells harvested | ${tot.companion_cells || 0} |`,
    '',
    '## Waves',
    '',
  ];
  for (const id of WAVE_ORDER) {
    const w = (inv.waves || {})[id];
    const meta = WAVES[id];
    if (!w) {
      lines.push(`- **${id}** — ${meta.title} — unfired — cells ${meta.sheets.reduce((n, sh) => n + sh.cells.length, 0)}`);
      continue;
    }
    lines.push(`- **${id}** — ${w.task_url || 'unfired'} — sheets ${w.expected_sheets || 0} — cells ${w.concept_count || 0}`);
  }
  lines.push('', '## research_gate', '');
  lines.push('- `ok_everyday` — generic life/birthday/weather tools');
  lines.push('- `affordance_family` — registered similar-scene weather/season set');
  lines.push('- `anti_stereotype` — everyday + country places; not “all of country X”');
  lines.push('- `cultural_review_required` — all festivals, country places, wedding garden');
  lines.push('- `sacred_adjacent` — ofrenda / lamp / feast plates + matching companions');
  lines.push('- `no_flag_map_seal` — country PLACE worlds');
  lines.push('', '## QA notes', '', '- Stockpile only. No producer wiring.', '');
  fs.mkdirSync(path.dirname(path.join(ROOT, TRACKED_DOC_REL)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, TRACKED_DOC_REL), `${lines.join('\n')}\n`);
}

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
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
  const sheets = wave.sheets;
  const NEED_SHEETS = expectedSheets(wave);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(SHEET_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, 'keys.json'),
    JSON.stringify(
      {
        wave: wave.id,
        family: wave.family,
        harvest_family: wave.harvest_family,
        prefix: PREFIX,
        kind: wave.kind,
        cultural_review_required: Boolean(wave.cultural_review_required),
        concept_count: sheets.reduce((n, sh) => n + sh.cells.length, 0),
        expected_sheets: NEED_SHEETS,
        sheets: sheets.map((sh) => ({
          id: sh.id,
          title: sh.title,
          format: sh.format,
          keys: sh.cells.map((c) => c.key),
          research_gate: sh.cells.map((c) => ({ key: c.key, research_gate: c.research_gate, country_hint: c.country_hint || null, family_id: c.family_id || null })),
        })),
      },
      null,
      2,
    ),
  );

  const BRIEF = buildBrief(wave, sheets);
  let taskId = arg('task');
  const dump = {
    started_at: new Date().toISOString(),
    kind: 'content-worlds-fghi',
    wave: wave.id,
    family: wave.family,
    harvest_family: wave.harvest_family,
    sheet_dir: SHEET_DIR,
    concept_count: sheets.reduce((n, sh) => n + sh.cells.length, 0),
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
        `Continue THIS task. You returned ${large.length} usable PNG sheet(s); we need exactly ${NEED_SHEETS} sheet(s) listed in the original brief. Do not restart. Do not add text. Do not change the key list. Keep firing generate_image until every listed sheet exists.`,
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
    const p = upsertInventory(wave, sheets, dump);
    writeDocStub(loadInv());
    return p;
  });
  console.log(JSON.stringify({
    phase: 'downloaded',
    wave: wave.id,
    family: wave.family,
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

const isMain = process.argv[1] && path.normalize(process.argv[1]).endsWith('request-cw-fghi.mjs');
if (isMain) {
  if (process.argv.includes('--doc-only')) {
    writeDocStub(loadInv());
    console.log(JSON.stringify({ phase: 'doc', path: TRACKED_DOC_REL }, null, 2));
    process.exit(0);
  }
  apiKey();
  let names = (arg('wave', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (process.argv.includes('--next')) {
    const n = nextWaveName();
    if (!n) {
      console.log(JSON.stringify({ phase: 'all-done', waves: WAVE_ORDER.length }, null, 2));
      process.exit(0);
    }
    names = [n];
  }
  if (!names.length) throw new Error(`Need --wave=${WAVE_ORDER.join('|')} or --next`);
  for (const n of names) {
    await runWave(n);
  }
}
