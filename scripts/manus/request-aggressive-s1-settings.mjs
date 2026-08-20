/**
 * Aggressive S1 — EDB setting backgrounds (stockpile only, no wiring).
 *
 *   node scripts/manus/request-aggressive-s1-settings.mjs --wave=s1set01 --fire
 *   node scripts/manus/request-aggressive-s1-settings.mjs --wave=s1set01 --poll-only
 *
 * Partition: harvested/manus-aggressive-stockpile/s1-settings/
 * Pack cap: 1 in-flight. Landscape 1×2 stages, board 1280×590.
 *
 * Deduped vs quiet flats (08_backgrounds), lt3/lt6/lt9 civic stages,
 * VG modular stages, and edb-settings-stockpile-keys planned interiors.
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
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

const STOCKPILE_REL = 'harvested/manus-aggressive-stockpile/s1-settings';
const STOCKPILE = path.join(ROOT, STOCKPILE_REL);
const LOCK = path.join(STOCKPILE, '.inv.lock');
const POLL_MS = 30_000;
const TIMEOUT_MS = 55 * 60 * 1000;

const STYLE = `EDB SETTING DROP — real lesson-stage environment (NOT quiet flat wash):

WHAT WE WANT:
- Real recognizable place with walls/floor/sky and key furniture silhouettes at EDGES only
- Open center floor band (horizontal ~20%–80%, lower third) for dragging props
- Clear standing surface. Soft children's-book / ClassIn ESL house illustration
- Child-friendly, not babyish. Same house style across every sheet in this harvest
- Board canvas ~1280×590 landscape. Each cell is a full-bleed stage, not a thumbnail icon

HARD FAIL:
- Abstract color wash + tiny corner glyph (docs/bg-theme-sets.md quiet-flat anti-room)
- Cinematic wallpaper / busy story illustration / photoreal / glossy 3D
- People, faces, animals (no distant crowd needed — empty stages)
- Readable text, letters, numbers, logos, signs, badges, watermarks
- Black-field prop cutouts
- Copying laundromat / hardware / ferry / bakery / barbershop / pharmacy / marina / skate-park / climbing-gym / boardwalk / music-shop / food-court / parking-garage civic stages already harvested

TEXT LOCK: BLANK. QUALITY: default only. STOCKPILE: raw sheets only — do not wire producer.`;

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function cell(slug, brief) {
  return {
    key: `aggressive-s1set-${slug}`,
    concept: slug,
    brief,
    family: 'S-settings',
    classification: 'MANUS_WORTHY',
    status: 'pending',
    qa_status: null,
  };
}

function pair(title, a, b) {
  return {
    id: title.replace(/\s+/g, '-').slice(0, 28),
    title,
    format: 'landscape-contact-1x2',
    cells: [cell(a[0], a[1]), cell(b[0], b[1])],
  };
}

export const WAVES = {
  s1set01: {
    id: 's1set01-school-home-cafe-library',
    title: 'Aggressive S1 settings — classroom/kitchen/bedroom/cafe/library',
    family: 'S-settings',
    families: ['S-settings'],
    style: STYLE,
    sheets: [
      pair('classroom 1x2',
        ['classroom-front', 'elementary classroom: chalkboard + teacher desk along BACK wall, student desks pushed to SIDE walls, wide open floor center, empty board no letters, no people'],
        ['classroom-side', 'same classroom alternate angle: bookshelf + cubbies at edges, wide empty floor band, no kids no text on walls']),
      pair('kitchen 1x2',
        ['kitchen-home', 'home kitchen: counters + fridge along back/side walls, open tile/wood floor center, stove silhouette at edge, no people no brand labels'],
        ['kitchen-island', 'same kitchen: island/counter at ONE edge, dining nook corner, wide empty floor band, no people']),
      pair('bedroom 1x2',
        ['bedroom-bed', 'kid bedroom: bed + nightstand along side wall, open play floor center, window/curtain at edge, no people no poster text'],
        ['bedroom-wardrobe', 'same bedroom: wardrobe + toy chest at edges, wide empty floor center, soft lamp glow, no people']),
      pair('cafe 1x2',
        ['cafe-counter', 'casual cafe interior: service counter at back, chairs/tables at EDGES, open floor center, blank menu board silhouette no letters, not a bakery shop stage, no people'],
        ['cafe-booth', 'same cafe: booth seating along walls, wide empty floor band, no people no logos']),
      pair('library 1x2',
        ['library-stacks', 'public library: bookshelves along walls, open reading floor center, study table at edge, no people no readable spines'],
        ['library-carpet', 'same library: desk + lamp at corner, wide empty carpet center, no people']),
    ],
  },
  s1set02: {
    id: 's1set02-clinic-hotel-workshop-station-gym',
    title: 'Aggressive S1 settings — clinic/hotel/workshop/station/gym',
    family: 'S-settings',
    families: ['S-settings'],
    style: STYLE,
    sheets: [
      pair('clinic 1x2',
        ['clinic-exam', 'clinic exam room: cabinet + exam bed along walls, open floor center, not a quiet teal wash, no people no logos'],
        ['clinic-waiting', 'same clinic: waiting chairs at edge, wide empty floor band, blank posters, no people']),
      pair('hotel lobby 1x2',
        ['hotel-lobby-desk', 'hotel lobby: reception desk at back, plants/seating at edges, open floor center, blank signage, no people no logos'],
        ['hotel-lobby-lounge', 'same lobby: sofa cluster at edge, wide empty marble/carpet center, no people']),
      pair('workshop 1x2',
        ['workshop-benches', 'home/school workshop: workbenches + tool silhouettes along walls, open floor center, no people no brand labels'],
        ['workshop-open', 'same workshop: lumber rack at edge, wide empty floor band, no people']),
      pair('station 1x2',
        ['station-platform', 'train/metro platform: shelter + tracks at edge, open platform floor center, no train no people no readable timetables'],
        ['station-concourse', 'same station: benches + ticket-gate silhouettes at edges, wide empty concourse, no people no logos']),
      pair('school gym 1x2',
        ['gym-class', 'school gymnasium: wall pads + stacked mats at edges, open wood floor center, not a climbing gym civic stage, no players'],
        ['gym-bleacher', 'same gym: bleachers at far edge, wide empty court floor, hoop far silhouette optional, no people no scoreboard numbers']),
    ],
  },
  s1set03: {
    id: 's1set03-bath-living-playground-park-shop',
    title: 'Aggressive S1 settings — bathroom/living-room/playground/park/shop',
    family: 'S-settings',
    families: ['S-settings'],
    style: STYLE,
    sheets: [
      pair('bathroom 1x2',
        ['bathroom-tub', 'home bathroom: tub + toilet along walls, open tile floor center, sink at edge, no people no labels'],
        ['bathroom-vanity', 'same bathroom: vanity + mirror at edge, wide empty tile band, no people no text']),
      pair('living-room 1x2',
        ['living-sofa', 'home living room: sofa + TV stand along walls, open rug floor center, lamp at edge, no people no screen content'],
        ['living-window', 'same living room: armchair + plant at edges, wide empty floor band, curtains, no people']),
      pair('playground 1x2',
        ['playground-equip', 'outdoor playground: slide + swing set at edges, open sand/rubber floor center, not a quiet green wash, no kids'],
        ['playground-bench', 'same playground: bench + fence at edges, wide empty play surface, no people']),
      pair('park 1x2',
        ['park-path', 'public park: trees + path at edges, open grass/path center for standing, bench at side, no people no signs'],
        ['park-pond', 'same park: pond/fountain at far edge, wide empty lawn band, no people']),
      pair('shop 1x2',
        ['shop-counter', 'small neighborhood shop: counter at back, shelves at side walls, open floor center, not a supermarket wash, not a civic marketplace, blank price tags, no people no logos'],
        ['shop-aisle', 'same shop: one aisle of shelves at edges, wide empty floor band, no people']),
    ],
  },
  s1set04: {
    id: 's1set04-restaurant-farm-airport-bus-beach',
    title: 'Aggressive S1 settings — restaurant/farm/airport/bus-stop/beach',
    family: 'S-settings',
    families: ['S-settings'],
    style: STYLE,
    sheets: [
      pair('restaurant 1x2',
        ['restaurant-tables', 'casual restaurant: tables/chairs at EDGES, open floor center, service counter at back, not a quiet warm wash, not bakery civic, blank menu board no letters, no people'],
        ['restaurant-booth', 'same restaurant: booth seating along walls, wide empty floor band, no people no logos']),
      pair('farm 1x2',
        ['farm-yard', 'farmyard: barn + fence at edges, open dirt/grass center, trough at side, no animals no people no signs'],
        ['farm-barn', 'same farm: barn interior/open doorway at edge, wide empty yard band, no people']),
      pair('airport 1x2',
        ['airport-gate', 'airport gate waiting: chairs at edges, open concourse floor center, window to tarmac at back, blank screens no letters, no people no logos'],
        ['airport-hall', 'same airport: check-in desk silhouettes at back, wide empty hall floor, no people']),
      pair('bus-stop 1x2',
        ['bus-stop-shelter', 'street bus stop: shelter + bench at edge, open sidewalk/street floor band, blank timetable board, no bus no people no letters'],
        ['bus-stop-street', 'same bus stop: curb + pole at edge, wide empty pavement, no people no ads']),
      pair('beach 1x2',
        ['beach-shore', 'beach shore: water + sky at back, open sand floor center, umbrella/towel at edges, not a quiet wash, no people no text'],
        ['beach-board', 'same beach: dune/grass at edge, wide empty sand band, not a civic boardwalk stage, no people']),
    ],
  },
  s1set05: {
    id: 's1set05-forest-zoo-pool-field-train',
    title: 'Aggressive S1 settings — forest/zoo/pool/sports-field/train-interior',
    family: 'S-settings',
    families: ['S-settings'],
    style: STYLE,
    sheets: [
      pair('forest 1x2',
        ['forest-path', 'forest path: trees at edges, open dirt path floor center, not a quiet outdoor wash, no animals no people'],
        ['forest-clearing', 'same forest: clearing with logs at edges, wide empty ground band, no people']),
      pair('zoo 1x2',
        ['zoo-path', 'zoo path: empty enclosure/fence silhouettes at edges, open walkway center, no animals no people no signs'],
        ['zoo-plaza', 'same zoo: plaza with bench + map kiosk blank, wide empty pavement, no people']),
      pair('pool 1x2',
        ['pool-deck', 'swimming pool: water at back/side, open deck floor center, lounge chairs at edges, not a quiet pool-cool wash, no people no text'],
        ['pool-shallow', 'same pool: shallow end + ladder at edge, wide empty deck band, no people']),
      pair('sports-field 1x2',
        ['field-pitch', 'grass sports field: goals/posts at far edges, open pitch center, not a climbing gym, no players no scoreboard numbers'],
        ['field-sideline', 'same field: bleachers/sideline at edge, wide empty grass band, no people']),
      pair('train interior 1x2',
        ['train-car', 'train/bus interior: seats along both sides, open aisle floor center, windows at sides, no people no ads no letters'],
        ['train-aisle', 'same interior: doors at edge, wide empty aisle band, no people']),
    ],
  },
  s1set06: {
    id: 's1set06-street-market-post-aquarium-museum',
    title: 'Aggressive S1 settings — street/supermarket/post-office/aquarium/museum',
    family: 'S-settings',
    families: ['S-settings'],
    style: STYLE,
    sheets: [
      pair('street 1x2',
        ['street-town', 'small-town street: storefronts at edges, open sidewalk/road floor center, blank signs, no cars close, no people no letters'],
        ['street-corner', 'same street: corner + lamp post at edge, wide empty pavement band, no people']),
      pair('supermarket 1x2',
        ['market-aisle', 'supermarket interior: shelves at side walls, open aisle floor center, not a quiet supermarket-cool wash, blank labels, no people no logos'],
        ['market-front', 'same supermarket: checkout counters at back edge, wide empty floor band, no people']),
      pair('post-office 1x2',
        ['post-counter', 'post office: service counter at back, waiting line space open center, PO boxes at edge, blank posters, not a quiet post-cool wash, no people no text'],
        ['post-lobby', 'same post office: benches at edge, wide empty lobby floor, no people']),
      pair('aquarium 1x2',
        ['aquarium-hall', 'aquarium hall: tank walls at sides/back, open visitor floor center, not a quiet aquarium-cool wash, no fish crowds as subjects, no people no text'],
        ['aquarium-tunnel', 'same aquarium: tunnel/tank at edges, wide empty walkway band, no people']),
      pair('museum 1x2',
        ['museum-gallery', 'museum gallery: pedestals/frames at edges, open floor center, blank canvases no pictures of text, no people no labels'],
        ['museum-hall', 'same museum: grand hall with bench at edge, wide empty floor band, no people']),
    ],
  },
  s1set07: {
    id: 's1set07-hall-cafeteria-office-greenhouse-court',
    title: 'Aggressive S1 settings — hallway/cafeteria/office/greenhouse/basketball',
    family: 'S-settings',
    families: ['S-settings'],
    style: STYLE,
    sheets: [
      pair('hallway 1x2',
        ['school-hall', 'school hallway: lockers along walls, open corridor floor center, blank bulletin board, no people no letters'],
        ['school-hall-end', 'same hallway: classroom doors at edges, wide empty corridor band, no people']),
      pair('cafeteria 1x2',
        ['cafeteria-tables', 'school cafeteria: tables/benches at EDGES, open floor center, serving line at back, not a civic food-court stage, blank menu board, no people no logos'],
        ['cafeteria-line', 'same cafeteria: tray rail at edge, wide empty floor band, no people']),
      pair('office 1x2',
        ['office-desk', 'small office: desks along walls, open floor center, blank computer screens, no people no text'],
        ['office-meeting', 'same office: table at edge, wide empty carpet band, no people']),
      pair('greenhouse 1x2',
        ['greenhouse-aisle', 'greenhouse: plant benches at edges, open gravel/path floor center, glass walls, no people no labels'],
        ['greenhouse-pot', 'same greenhouse: potting table at edge, wide empty path band, no people']),
      pair('basketball 1x2',
        ['bball-court', 'indoor basketball court: hoops at far ends, open wood floor center, not a climbing gym, no players no scoreboard numbers'],
        ['bball-sideline', 'same court: benches at edge, wide empty floor band, no people']),
    ],
  },
  s1set08: {
    id: 's1set08-camp-attic-basement-yard-pier',
    title: 'Aggressive S1 settings — campsite/attic/basement/school-yard/pier',
    family: 'S-settings',
    families: ['S-settings'],
    style: STYLE,
    sheets: [
      pair('campsite 1x2',
        ['camp-tent', 'campsite: tent + fire-ring at edges, open dirt/grass floor center, trees at back, no people no animals no text'],
        ['camp-clearing', 'same campsite: picnic table at edge, wide empty clearing band, no people']),
      pair('attic 1x2',
        ['attic-beams', 'attic: boxes + trunk at edges, open wood floor center, sloped roof, no people no labels'],
        ['attic-window', 'same attic: small window at edge, wide empty floor band, no people']),
      pair('basement 1x2',
        ['basement-open', 'basement: washer/shelves at edges, open concrete floor center, stairs at side, no people no labels'],
        ['basement-post', 'same basement: support post at edge, wide empty floor band, no people']),
      pair('school-yard 1x2',
        ['yard-open', 'school yard: building wall + fence at edges, open asphalt/grass floor center, not a civic skate-park, no people no hopscotch letters'],
        ['yard-bench', 'same yard: bench at edge, wide empty yard band, no people']),
      pair('pier 1x2',
        ['pier-wood', 'simple wooden pier: water at sides, open boardwalk floor center, not a marina civic stage, no boats close, no people no signs'],
        ['pier-end', 'same pier: railing at edges, wide empty planks band, no people']),
    ],
  },
  s1set09: {
    id: 's1set09-garage-ward-art-music-soccer',
    title: 'Aggressive S1 settings — garage/hospital-ward/art-studio/music-room/soccer',
    family: 'S-settings',
    families: ['S-settings'],
    style: STYLE,
    sheets: [
      pair('garage 1x2',
        ['garage-open', 'home garage interior: workbench + shelves at edges, open concrete floor center, not a civic parking-garage, no cars as heroes, no people no logos'],
        ['garage-door', 'same garage: open door to driveway at back, wide empty floor band, no people']),
      pair('hospital-ward 1x2',
        ['ward-bed', 'hospital ward: beds along walls, open floor center, not a quiet clinic wash, blank monitors, no people no text'],
        ['ward-hall', 'same ward: curtain rails at edges, wide empty floor band, no people']),
      pair('art-studio 1x2',
        ['art-easel', 'art studio: easels + sink at edges, open floor center, blank canvases, no people no letters'],
        ['art-table', 'same studio: drying rack at edge, wide empty floor band, no people']),
      pair('music-room 1x2',
        ['music-class', 'school music room: piano + chairs at edges, open floor center, not a civic music-shop, blank board, no people no notes as readable text'],
        ['music-stand', 'same music room: instrument cases at edge, wide empty floor band, no people']),
      pair('soccer 1x2',
        ['soccer-pitch', 'soccer field: goals at far ends, open grass floor center, not a climbing gym, no players no scoreboard numbers'],
        ['soccer-sideline', 'same field: bench at edge, wide empty grass band, no people']),
    ],
  },
  s1set10: {
    id: 's1set10-hotelroom-bus-lab-garden-diner',
    title: 'Aggressive S1 settings — hotel-room/bus-interior/science-lab/garden/diner',
    family: 'S-settings',
    families: ['S-settings'],
    style: STYLE,
    sheets: [
      pair('hotel-room 1x2',
        ['hotel-room-bed', 'hotel bedroom: bed + desk at edges, open floor center, blank TV, no people no logos no text'],
        ['hotel-room-window', 'same hotel room: window + armchair at edge, wide empty carpet band, no people']),
      pair('bus interior 1x2',
        ['bus-seats', 'city bus interior: seats along sides, open aisle floor center, not the train-car already harvested, no people no ads no letters'],
        ['bus-front', 'same bus: driver area silhouette empty at edge, wide empty aisle band, no people']),
      pair('science-lab 1x2',
        ['lab-benches', 'school science lab: benches + stools at edges, open floor center, blank boards, no people no formulas'],
        ['lab-sink', 'same lab: sink island at edge, wide empty floor band, no people']),
      pair('garden 1x2',
        ['garden-path', 'backyard garden: beds + fence at edges, open path/lawn floor center, not a park sheet, no people no labels'],
        ['garden-patio', 'same garden: patio table at edge, wide empty lawn band, no people']),
      pair('diner 1x2',
        ['diner-counter', 'diner: counter + stools at back, booths at edges, open floor center, not the cafe or restaurant sheets, blank menu board, no people no logos'],
        ['diner-booth', 'same diner: booths along walls, wide empty floor band, no people']),
    ],
  },
  s1set11: {
    id: 's1set11-dentist-bookstore-cinema-mountain-lake',
    title: 'Aggressive S1 settings — dentist/bookstore/cinema/mountain/lake',
    family: 'S-settings',
    families: ['S-settings'],
    style: STYLE,
    sheets: [
      pair('dentist 1x2',
        ['dentist-chair', 'dentist office: exam chair + cabinet along walls, open floor center, not a clinic exam room or vet clinic, blank posters, no people no logos no letters'],
        ['dentist-waiting', 'same dentist office: waiting chairs at edge, wide empty floor band, no people']),
      pair('bookstore 1x2',
        ['bookstore-aisle', 'bookstore: shelves along walls, open aisle floor center, not a library reading room, blank spines no letters, no people no logos'],
        ['bookstore-front', 'same bookstore: counter at back edge, wide empty floor band, no people']),
      pair('cinema 1x2',
        ['cinema-seats', 'movie theater auditorium: seats along sides, open aisle floor center, blank screen at back, not a cinema lobby, no people no titles no letters'],
        ['cinema-aisle', 'same auditorium: stairs at edge, wide empty aisle band, no people']),
      pair('mountain 1x2',
        ['mountain-trail', 'mountain trail: rocks + pines at edges, open dirt trail floor center, not a forest-path sheet, peaks far back, no people no signs'],
        ['mountain-overlook', 'same mountain: overlook rail at edge, wide empty trail/rock band, no people']),
      pair('lake 1x2',
        ['lake-shore', 'lake shore: water at back, open grass/sand floor center, not a beach sheet, dock/tree at edges, no people no boats close'],
        ['lake-path', 'same lake: path at edge, wide empty shore band, no people']),
    ],
  },
  s1set12: {
    id: 's1set12-river-cave-desert-island-plane',
    title: 'Aggressive S1 settings — river/cave/desert/island/airplane',
    family: 'S-settings',
    families: ['S-settings'],
    style: STYLE,
    sheets: [
      pair('river 1x2',
        ['river-bank', 'river bank: water at side/back, open dirt/grass floor center, not a lake sheet, reeds + rocks at edges, no people no signs'],
        ['river-bridge', 'same river: small bridge at far edge, wide empty bank band, no people']),
      pair('cave 1x2',
        ['cave-open', 'cave interior: rock walls at edges, open stone floor center, mouth of cave at back with daylight, no people no crystals filling frame'],
        ['cave-chamber', 'same cave: stalactite fringe at edges, wide empty stone band, no people']),
      pair('desert 1x2',
        ['desert-dune', 'desert: dunes at edges, open sand floor center, not a beach sheet, cactus/rock at far edge, no people no text'],
        ['desert-oasis', 'same desert: small oasis fringe at edge, wide empty sand band, no people']),
      pair('island 1x2',
        ['island-cove', 'small island cove: water + palms at edges, open sand floor center, not the beach or pier sheets, no people no boats close'],
        ['island-path', 'same island: path through palms at edges, wide empty sand/grass band, no people']),
      pair('airplane 1x2',
        ['plane-cabin', 'airplane cabin: seats along both sides, open aisle floor center, not the bus or train interiors, blank screens, no people no ads no letters'],
        ['plane-front', 'same cabin: bulkhead at edge, wide empty aisle band, no people']),
    ],
  },
  s1set13: {
    id: 's1set13-mall-treehouse-baseball-waterpark-ski',
    title: 'Aggressive S1 settings — mall/treehouse/baseball/waterpark/ski',
    family: 'S-settings',
    families: ['S-settings'],
    style: STYLE,
    sheets: [
      pair('mall 1x2',
        ['mall-atrium', 'shopping mall atrium: storefronts at edges, open tile floor center, not a civic food-court, blank shop signs, no people no logos'],
        ['mall-hall', 'same mall: bench + plant at edge, wide empty corridor band, no people']),
      pair('treehouse 1x2',
        ['treehouse-deck', 'treehouse: rail + trunk at edges, open wood deck floor center, not an attic, no people no letters'],
        ['treehouse-room', 'same treehouse: window + chest at edge, wide empty floor band, no people']),
      pair('baseball 1x2',
        ['baseball-diamond', 'baseball diamond: bases/dugout at edges, open dirt/grass floor center, not a soccer pitch, no players no scoreboard numbers'],
        ['baseball-outfield', 'same field: fence at far edge, wide empty grass band, no people']),
      pair('waterpark 1x2',
        ['waterpark-deck', 'waterpark: slides at far edges, open wet deck floor center, not the school pool sheet, no people no logos no text'],
        ['waterpark-lazy', 'same waterpark: lazy-river edge at side, wide empty deck band, no people']),
      pair('ski 1x2',
        ['ski-slope', 'ski slope: trees + lodge silhouette at edges, open snow floor center, not a mountain-trail dirt sheet, no people no trail-marker letters'],
        ['ski-lodge', 'same ski area: lodge deck at edge, wide empty snow band, no people']),
    ],
  },
  s1set14: {
    id: 's1set14-cabin-plaza-construction-factory-stadium',
    title: 'Aggressive S1 settings — cabin/plaza/construction/factory/stadium',
    family: 'S-settings',
    families: ['S-settings'],
    style: STYLE,
    sheets: [
      pair('cabin 1x2',
        ['cabin-room', 'log cabin interior: bed + stove at edges, open wood floor center, not an attic or tent, window at edge, no people no letters'],
        ['cabin-porch', 'same cabin: porch/rail at edge, wide empty wood floor band, no people']),
      pair('plaza 1x2',
        ['plaza-open', 'town plaza: fountain + facades at edges, open stone floor center, not a street-town sheet, blank signs, no people no letters'],
        ['plaza-bench', 'same plaza: bench at edge, wide empty stone band, no people']),
      pair('construction 1x2',
        ['construction-yard', 'construction site: fence + stacked materials at edges, open dirt floor center, not a workshop interior, blank boards, no people no logos no numbers'],
        ['construction-frame', 'same site: building frame at far edge, wide empty dirt band, no people']),
      pair('factory 1x2',
        ['factory-floor', 'factory floor: machines along walls, open concrete floor center, not a warehouse S3 stage, no people no labels'],
        ['factory-aisle', 'same factory: pallet rack at edge, wide empty floor band, no people']),
      pair('stadium 1x2',
        ['stadium-field', 'stadium: stands at far edges, open field floor center, not a soccer-pitch close sheet, no players no scoreboard numbers'],
        ['stadium-aisle', 'same stadium: aisle + seats at edges, wide empty concourse band, no people']),
    ],
  },
  s1set15: {
    id: 's1set15-waterfall-canyon-cottage-studio-party',
    title: 'Aggressive S1 settings — waterfall/canyon/cottage/tv-studio/party-hall',
    family: 'S-settings',
    families: ['S-settings'],
    style: STYLE,
    sheets: [
      pair('waterfall 1x2',
        ['waterfall-base', 'waterfall base: falls at back edge, open rock/pool-edge floor center, not a river-bank sheet, no people no signs'],
        ['waterfall-path', 'same falls: path at edge, wide empty rock band, no people']),
      pair('canyon 1x2',
        ['canyon-floor', 'canyon floor: cliff walls at edges, open dirt floor center, not a desert dune sheet, no people no text'],
        ['canyon-path', 'same canyon: path at edge, wide empty dirt band, no people']),
      pair('cottage 1x2',
        ['cottage-room', 'country cottage interior: hearth + chairs at edges, open floor center, not a log-cabin sheet, no people no letters'],
        ['cottage-door', 'same cottage: door/window at edge, wide empty floor band, no people']),
      pair('tv-studio 1x2',
        ['studio-floor', 'TV studio: cameras + lights at edges, open floor center, blank screens, no people no logos no letters'],
        ['studio-set', 'same studio: backdrop at back edge, wide empty floor band, no people']),
      pair('party-hall 1x2',
        ['party-hall', 'birthday party hall: tables at edges, open floor center, blank balloons no letters, no people no logos'],
        ['party-stage', 'same hall: small stage at back edge, wide empty floor band, no people']),
    ],
  },
  s1set16: {
    id: 's1set16-barn-windmill-mill-well-orchardpath',
    title: 'Aggressive S1 settings — barn/windmill/mill/village-well/orchard-path',
    family: 'S-settings',
    families: ['S-settings'],
    style: STYLE,
    sheets: [
      pair('barn 1x2',
        ['barn-open', 'barn interior: stalls + loft ladder at edges, open dirt/wood floor center, not a farmyard exterior sheet, no animals no people no labels'],
        ['barn-door', 'same barn: open barn doors at back, wide empty floor band, no people']),
      pair('windmill 1x2',
        ['windmill-base', 'windmill base: mill building at back/edge, open dirt floor center, sails far silhouette, no people no letters'],
        ['windmill-path', 'same windmill: path at edge, wide empty dirt band, no people']),
      pair('mill 1x2',
        ['mill-interior', 'water mill interior: wheel housing + sacks at edges, open wood floor center, not a factory, no people no labels'],
        ['mill-wheel', 'same mill: wheel at far edge, wide empty floor band, no people']),
      pair('well 1x2',
        ['well-square', 'village well: well + trough at edges, open packed-earth floor center, not a town plaza fountain sheet, no people no signs'],
        ['well-path', 'same well: cottages far fringe, wide empty earth band, no people']),
      pair('orchard-path 1x2',
        ['orchard-path', 'orchard path: tree rows at edges, open dirt path floor center, not a civic orchard stall, no people no labels'],
        ['orchard-clear', 'same orchard: crate stack at edge, wide empty path band, no people']),
    ],
  },
  s1set17: {
    id: 's1set17-radio-puppet-carousel-snow-igloo',
    title: 'Aggressive S1 settings — radio/puppet/carousel/snow/igloo',
    family: 'S-settings',
    families: ['S-settings'],
    style: STYLE,
    sheets: [
      pair('radio 1x2',
        ['radio-studio', 'radio studio: consoles + mics at edges, open floor center, not a TV studio, blank screens, no people no logos no letters'],
        ['radio-booth', 'same studio: glass booth at edge, wide empty floor band, no people']),
      pair('puppet 1x2',
        ['puppet-stage', 'puppet theater: stage + curtains at back, open floor center, blank backdrop, no people no letters'],
        ['puppet-seats', 'same theater: seats at edges, wide empty aisle band, no people']),
      pair('carousel 1x2',
        ['carousel-ground', 'fair carousel: ride at back/edge, open packed-earth floor center, not a civic boardwalk, no people no logos no letters'],
        ['carousel-path', 'same fair: path at edge, wide empty ground band, no people']),
      pair('snow 1x2',
        ['snow-play', 'snowy yard: fence + house wall at edges, open snow floor center, not a ski-slope, no people no letters'],
        ['snow-path', 'same yard: path at edge, wide empty snow band, no people']),
      pair('igloo 1x2',
        ['igloo-interior', 'igloo interior: ice walls, open snow/ice floor center, doorway at edge, no people no text'],
        ['igloo-outside', 'same igloo: exterior at edge, wide empty snow band, no people']),
    ],
  },
  s1set18: {
    id: 's1set18-maze-rosegarden-clockroom-belltower-fountaincourt',
    title: 'Aggressive S1 settings — maze/rose-garden/clock-room/bell-tower/fountain-court',
    family: 'S-settings',
    families: ['S-settings'],
    style: STYLE,
    sheets: [
      pair('maze 1x2',
        ['maze-path', 'hedge maze: hedges at edges, open dirt/grass path floor center, not a park lawn sheet, no people no signs'],
        ['maze-clear', 'same maze: opening at edge, wide empty path band, no people']),
      pair('rose-garden 1x2',
        ['rose-garden', 'rose garden: beds + trellis at edges, open gravel path floor center, not a backyard garden sheet, no people no labels'],
        ['rose-path', 'same garden: bench at edge, wide empty path band, no people']),
      pair('clock-room 1x2',
        ['clock-room', 'clock-tower room: gears + windows at edges, open wood floor center, blank clock faces no numbers, no people no letters'],
        ['clock-stair', 'same room: stair at edge, wide empty floor band, no people']),
      pair('bell-tower 1x2',
        ['bell-tower', 'bell tower interior: bell + rails at edges, open wood floor center, no people no letters'],
        ['bell-view', 'same tower: opening at edge, wide empty floor band, no people']),
      pair('fountain-court 1x2',
        ['fountain-court', 'courtyard fountain: fountain at far edge, open stone floor center, not a town plaza sheet, no people no signs'],
        ['fountain-path', 'same court: arcade at edges, wide empty stone band, no people']),
    ],
  },
  s1set19: {
    id: 's1set19-teagarden-ricepaddy-bamboo-olive-vineyardpath',
    title: 'Aggressive S1 settings — tea-garden/rice-paddy/bamboo/olive/vineyard-path',
    family: 'S-settings',
    families: ['S-settings'],
    style: STYLE,
    sheets: [
      pair('tea-garden 1x2',
        ['tea-garden', 'tea garden: hedges + pavilion at edges, open gravel path floor center, not a rose-garden sheet, no people no letters'],
        ['tea-path', 'same garden: bench at edge, wide empty path band, no people']),
      pair('rice-paddy 1x2',
        ['rice-paddy', 'rice paddy: dykes at edges, open packed-earth path floor center, water fields at sides not filling play space, no people no signs'],
        ['rice-path', 'same paddy: path at edge, wide empty earth band, no people']),
      pair('bamboo 1x2',
        ['bamboo-grove', 'bamboo grove: stalks at edges, open dirt path floor center, not a forest-path sheet, no people no signs'],
        ['bamboo-clear', 'same grove: clearing at edge, wide empty path band, no people']),
      pair('olive 1x2',
        ['olive-grove', 'olive grove: trees at edges, open dirt floor center, not an orchard-path sheet, no people no labels'],
        ['olive-path', 'same grove: path at edge, wide empty dirt band, no people']),
      pair('vineyard-path 1x2',
        ['vineyard-path', 'vineyard path: vine rows at edges, open dirt path floor center, not a civic orchard stall, no people no labels'],
        ['vineyard-clear', 'same vineyard: crate at edge, wide empty path band, no people']),
    ],
  },
};

export const WAVE_ORDER = Object.keys(WAVES);

function sheetBlock(sheet, index) {
  const lines = sheet.cells.map((c, i) => `${i + 1}. ${c.key} — ${c.brief}`);
  return `SHEET ${index} — ${sheet.title} (${sheet.format}):\n${lines.join('\n')}\nKeys: ${sheet.cells.map((c) => c.key).join(',')}`;
}

function buildBrief(wave, sheets) {
  return withEslAssetGeneratorBrief(`TASK: Produce **${sheets.length} landscape 1×2 PNG contact sheet(s)** of reusable ESL EDB setting-drop backgrounds for ClassIn (STREAM PACK 1 settings).

SOURCE OF TRUTH: scripts/manus/request-aggressive-s1-settings.mjs wave ${wave.id}.
Do NOT regenerate quiet flats, visual-grammar modular stages, or long-tail civic stages (laundromat/hardware/ferry/bakery/barbershop/pharmacy/marina/skate-park/climbing-gym/boardwalk/music-shop/food-court/parking-garage).

${wave.style}

HARD RULES:
- Generate ONLY the listed cells. Do not review, broaden, or add places.
- Each sheet is a 1×2 landscape contact of FULL-BLEED lesson stages (left→right).
- Open center floor band. Scenery at edges. No people.
- NO baked readable text.
- quality: default ONLY.
- Keep generating inside THIS task until every listed PNG exists. 5-image cap is per generate_image call. This wave has ${sheets.length} sheets: fire them inside THIS task.

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
  if (n.endsWith('.zip')) return 'zip';
  return n.endsWith('.png') ? 'png' : 'other';
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
  execFileSync('tar', ['-xf', zipPath, '-C', outDir], { stdio: 'ignore' });
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
  return sorted.map((src, i) => {
    const file = `${String(i + 1).padStart(2, '0')}.png`;
    const dest = path.join(sheetDir, file);
    fs.copyFileSync(src, dest);
    return { dest, bytes: fs.statSync(dest).size, name: path.basename(src), file };
  });
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
    const fallback = `${String(i).padStart(2, '0')}.${kind === 'zip' ? 'zip' : 'png'}`;
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
    fired: waves.filter((w) => w.task_id).length,
    sheets_downloaded: waves.reduce((n, w) => n + (w.sheets || []).length, 0),
    concept_count: items.length,
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
  if (!fs.existsSync(invPath)) return { kind: 'aggressive-s1-settings', waves: {}, running_total: {} };
  return JSON.parse(fs.readFileSync(invPath, 'utf8'));
}

function writeInv(inv) {
  inv.updated_at = new Date().toISOString();
  if (!inv.waves) inv.waves = {};
  recomputeTotals(inv);
  fs.mkdirSync(STOCKPILE, { recursive: true });
  const invPath = path.join(STOCKPILE, 'inventory.json');
  fs.writeFileSync(invPath, JSON.stringify(inv, null, 2));
  return invPath;
}

function upsertInventory(wave, sheets, dump) {
  const inv = loadInv();
  const haveLarge = (dump.saved || []).filter((s) => s.bytes > 80_000).length >= expectedSheets(wave);
  const items = sheets.flatMap((s) => s.cells.map((c) => ({
    ...c,
    status: haveLarge ? 'generated_raw' : dump.task_id ? 'fired' : 'pending',
    qa_status: c.qa_status || null,
    qa_note: haveLarge ? 'Raw setting sheet downloaded; harvest QA PASS/HOLD later. No producer wiring.' : null,
    path: dump.sheet_dir || null,
    sheet_id: s.id,
    manus_task_id: dump.task_id || null,
  })));
  inv.waves[wave.id] = {
    family: wave.family,
    title: wave.title,
    task_id: dump.task_id || null,
    task_url: dump.task_url || null,
    sheet_dir: dump.sheet_dir || null,
    expected_sheets: expectedSheets(wave),
    concept_count: items.length,
    sheets: (dump.saved || []).map((s) => ({ file: s.file || path.basename(s.dest || ''), bytes: s.bytes, name: s.name || null })),
    items,
    finished_at: dump.finished_at || null,
  };
  return writeInv(inv);
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
    JSON.stringify({
      wave: wave.id,
      family: wave.family,
      concept_count: sheets.reduce((n, s) => n + s.cells.length, 0),
      expected_sheets: NEED_SHEETS,
      sheets: sheets.map((s) => ({ id: s.id, title: s.title, format: s.format, keys: s.cells.map((c) => c.key) })),
    }, null, 2),
  );

  const BRIEF = buildBrief(wave, sheets);
  let taskId = arg('task');
  const dump = {
    started_at: new Date().toISOString(),
    kind: 'aggressive-s1-settings',
    wave: wave.id,
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
    const created = await createTask({
      title: wave.title,
      agent_profile: resolveAgentProfile(),
      force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
      interactive_mode: false,
      message: BRIEF,
    });
    taskId = created.task_id || created.id;
    dump.task_id = taskId;
    dump.task_url = created.task_url || `https://manus.im/app/${taskId}`;
    dump.created_at = new Date().toISOString();
    fs.writeFileSync(RUN_JSON, JSON.stringify({ ...dump, brief: BRIEF }, null, 2));
    await withInvLock(() => upsertInventory(wave, sheets, dump));
    console.log(JSON.stringify({ phase: 'created', ...dump }, null, 2));
    if (fireOnly) return;
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
    await sendMessage(taskId, {
      force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
      message: withEslAssetGeneratorBrief(
        `Continue THIS task. You returned ${large.length} usable PNG sheet(s); we need exactly ${NEED_SHEETS} landscape 1×2 setting sheets listed in the original brief. Do not restart. Do not add text. Do not change the key list. Keep firing generate_image until every listed sheet exists.`,
      ),
    });
    result = await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
    msgs = await listMessages(taskId, { order: 'asc', limit: 120 });
    saved = await downloadSheets(msgs.messages || [], SHEET_DIR);
    large = saved.filter((s) => s.bytes > 80_000);
  }

  dump.saved = saved;
  dump.agent_status = result && result.agent_status;
  dump.finished_at = new Date().toISOString();
  if (fs.existsSync(RUN_JSON)) {
    const prev = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8'));
    dump.started_at = prev.started_at || dump.started_at;
    dump.created_at = prev.created_at;
    dump.task_url = dump.task_url || prev.task_url;
    dump.brief = prev.brief;
  }
  fs.writeFileSync(RUN_JSON, JSON.stringify(dump, null, 2));
  const invPath = await withInvLock(() => upsertInventory(wave, sheets, dump));
  console.log(JSON.stringify({
    phase: 'downloaded',
    wave: wave.id,
    task_id: taskId,
    task_url: dump.task_url,
    count: saved.length,
    large: large.length,
    expected_sheets: NEED_SHEETS,
    sheet_dir: SHEET_DIR,
    inventory: invPath,
  }, null, 2));
  if (large.length < NEED_SHEETS) process.exit(2);
}

if (process.argv[1] && path.normalize(process.argv[1]).endsWith('request-aggressive-s1-settings.mjs')) {
  apiKey();
  await runWave(arg('wave', ''));
}
