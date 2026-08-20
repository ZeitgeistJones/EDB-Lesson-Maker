/**
 * Aggressive S2 leftover EDB setting-drops (quiet lesson stages).
 * Does NOT include parked cinematic pack: space / volcano / castle / concert-hall.
 * Stockpile only. No PropBank / picker / manifest wiring.
 *
 * Partition: harvested/manus-aggressive-stockpile/s2-settings/
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const PREFIX = 'aggressive-s2-set-';
export const STOCKPILE_REL = 'harvested/manus-aggressive-stockpile/s2-settings';
export const TRACKED_DOC_REL = 'docs/aggressive-stockpile-s2-settings.md';
export const BOARD = { width: 1280, height: 590 };
export const GROUND_Y_RANGE = '340–434';

/** Parked first pack — do not resurrect or remop. */
export const PARKED_WAVE_IDS = [
  's2-set-space',
  's2-set-volcano',
  's2-set-castle',
  's2-set-concert-hall',
];

/**
 * Skip clones of S1 settings, EDB classroom→pool, civic stages, VG modular stages,
 * and S3 story-settings places.
 */
export const DEDUPE_SKIP = [
  // S1 settings (downloaded)
  'classroom', 'kitchen', 'bedroom', 'cafe', 'library',
  'clinic', 'hotel-lobby', 'workshop', 'station', 'gymnasium', 'gym',
  'bathroom', 'living-room', 'playground', 'park', 'shop',
  'restaurant', 'farm', 'airport', 'bus-stop', 'beach',
  'supermarket', 'pool', 'swimming-pool',
  'dentist', 'bookstore', 'cinema', 'salon', 'barbershop',
  'hardware', 'hardware-store', 'ferry', 'ferry-deck', 'florist',
  'laundromat', 'construction', 'recycling-center', 'marketplace',
  'hotel-lobby', 'train-interior', 'pottery-studio', 'school-nurse',
  'locker-room', 'school-hallway', 'parking-garage', 'rooftop',
  'garage', 'art-studio', 'tv-studio', 'studio',
  // already landed leftover S2
  'office', 'lighthouse', 'vet-clinic', 'gas-station', 'police-station',
  'toy-store', 'ice-cream-shop', 'tennis-court', 'clothing-store',
  'bike-shop', 'pet-shop', 'stadium', 'shoe-store', 'newsstand',
  // EDB classic
  'street-town', 'zoo', 'forest', 'train-platform', 'train-interior', 'bus-interior',
  'sports-field', 'basketball-court', 'swimming-pool',
  // Civic long-tail
  'laundromat', 'hardware-store', 'marketplace', 'ferry-deck', 'florist', 'recycling-center',
  'bakery', 'barbershop', 'pharmacy', 'marina', 'orchard', 'pottery-studio', 'ice-rink',
  'bowling-alley', 'skate-park', 'climbing-gym', 'boardwalk', 'music-shop', 'food-court',
  'parking-garage', 'observatory', 'cafeteria', 'pier',
  'fire-station', 'post-office', 'garage', 'museum', 'theater', 'aquarium',
  // S3 story-settings
  'dining-room', 'home-hallway', 'laundry-room', 'backyard',
  'school-hallway', 'art-room', 'school-entrance',
  'fire-station-bay', 'hotel-room', 'car-interior',
  'luggage-claim', 'attic-playroom', 'garage-interior', 'music-room',
  'museum-gallery', 'cinema-lobby', 'bank-interior', 'hospital-waiting',
  'science-lab', 'computer-lab', 'subway-platform', 'rest-stop',
  'construction-site',
  'greenhouse', 'rooftop', 'campground', 'campsite', 'bike-path',
  // Parked cinematic S2
  'space', 'volcano', 'castle', 'concert-hall',
  'desert', 'cave',
];

function setting(slug, category, title, a, b) {
  return {
    slug,
    category,
    title,
    variants: [
      { slug: `${slug}-a`, brief: a },
      { slug: `${slug}-b`, brief: b },
    ],
  };
}

export const SETTINGS = {
  office: setting(
    'office',
    'office',
    'Aggressive S2 leftover setting — office (2 variants)',
    'quiet office lesson stage: desks + cabinets along walls only, wide empty carpet floor center for props, blank screens, no people no UI text or logos, not cinematic wallpaper',
    'same office: window + plant at far edge, open floor band, furniture silhouettes at edges only, not a furnished cubicle close-up, no text',
  ),
  greenhouse: setting(
    'greenhouse',
    'greenhouse',
    'Aggressive S2 leftover setting — greenhouse (2 variants)',
    'quiet greenhouse lesson stage: plant benches along walls, wide empty tile/path center, glass roof haze, no people no plant labels, not a jungle collage',
    'same greenhouse: potting table at edge, open floor band, not cinematic, no text',
  ),
  campsite: setting(
    'campsite',
    'camp',
    'Aggressive S2 leftover setting — campsite (2 variants)',
    'quiet campsite lesson stage: tent + lantern at edges, wide empty dirt/grass floor center, trees as fringe only, no people no camp-sign letters, not a habitat photo',
    'same camp: fire-ring at far edge (no flames filling frame), open floor band, not cinematic wallpaper, no text',
  ),
  lighthouse: setting(
    'lighthouse',
    'lighthouse',
    'Aggressive S2 leftover setting — lighthouse (2 variants)',
    'quiet lighthouse terrace lesson stage: tower + rail at edges, wide empty stone floor center, sea/horizon fringe, no people no light-numbers, not a movie still',
    'same terrace: lantern-room at far edge, open floor band, not cinematic, no text',
  ),
  'vet-clinic': setting(
    'vet-clinic',
    'vet clinic',
    'Aggressive S2 leftover setting — vet clinic (2 variants)',
    'quiet vet waiting-room lesson stage: counter + chairs at edges, wide empty floor center, blank posters, no people no animals no clinic letters, not a hospital clone',
    'same vet: exam-table at far edge, open floor band, no pet names or logos, no text',
  ),
  'gas-station': setting(
    'gas-station',
    'gas station',
    'Aggressive S2 leftover setting — gas station (2 variants)',
    'quiet gas-station lesson stage: pumps + canopy at edges, wide empty pavement center, blank pump faces, no people no prices or brand logos',
    'same station: shop kiosk at far edge, open forecourt band, not cinematic, no text',
  ),
  'police-station': setting(
    'police-station',
    'police station',
    'Aggressive S2 leftover setting — police station (2 variants)',
    'quiet police-station lobby lesson stage: desk + blank badge watermark at edges, wide empty floor center, door-arch fringe, no people no letters numbers logos, not a fire-station bay',
    'same station: chairs along wall, open floor band, not a furnished bullpen, no text',
  ),
  supermarket: setting(
    'supermarket',
    'supermarket',
    'Aggressive S2 leftover setting — supermarket (2 variants)',
    'quiet supermarket lesson stage: shelves along side walls, wide empty aisle/floor center, cart silhouette at edge, blank tags no numbers, not a civic marketplace stall, no people no logos',
    'same supermarket: checkout silhouette at far edge, open floor band, not a busy illustration, no text',
  ),
  'toy-store': setting(
    'toy-store',
    'toy store',
    'Aggressive S2 leftover setting — toy store (2 variants)',
    'quiet toy-store lesson stage: shelves along walls, wide empty aisle/floor center, blank boxes at edges (no letters), no people no logos, not a supermarket clone',
    'same toy store: display table at far edge, open floor band, not busy illustration, no text',
  ),
  'ice-cream-shop': setting(
    'ice-cream-shop',
    'ice cream shop',
    'Aggressive S2 leftover setting — ice cream shop (2 variants)',
    'quiet ice-cream shop lesson stage: counter at back, stools at edges, wide empty tile floor center, blank menu board no letters, no people no logos, not a bakery civic stage',
    'same shop: freezer case at far edge, open floor band, not cinematic, no text',
  ),
  'tennis-court': setting(
    'tennis-court',
    'tennis court',
    'Aggressive S2 leftover setting — tennis court (2 variants)',
    'quiet tennis-court lesson stage: fence + net at edges, wide empty court floor center, pale court color, no people no scoreboard numbers, not a basketball gym clone',
    'same court: bench at far edge, open floor band, not cinematic, no text',
  ),
  'clothing-store': setting(
    'clothing-store',
    'clothing store',
    'Aggressive S2 leftover setting — clothing store (2 variants)',
    'quiet clothing-store lesson stage: racks along walls, wide empty aisle/floor center, blank hangers, no people no logos or price numbers',
    'same store: fitting-room curtain at far edge, open floor band, not busy illustration, no text',
  ),
  'bike-shop': setting(
    'bike-shop',
    'bike shop',
    'Aggressive S2 leftover setting — bike shop (2 variants)',
    'quiet bike-shop lesson stage: bike silhouettes along walls, wide empty floor center, workbench at edge, no people no brand logos, not a garage clone',
    'same shop: window + plant at far edge, open floor band, not cinematic, no text',
  ),
  'pet-shop': setting(
    'pet-shop',
    'pet shop',
    'Aggressive S2 leftover setting — pet shop (2 variants)',
    'quiet pet-shop lesson stage: empty cages + shelves along walls, wide empty aisle/floor center, no animals no people no letters logos, not a vet-clinic clone',
    'same shop: counter at far edge, open floor band, empty aquariums as edge silhouettes only (no fish), no text',
  ),
  stadium: setting(
    'stadium',
    'stadium',
    'Aggressive S2 leftover setting — stadium (2 variants)',
    'quiet stadium lesson stage: bleacher stands along back/side edges, wide empty field/floor center for props, pale turf or track, no people no scoreboard numbers, not cinematic crowd wallpaper',
    'same stadium: tunnel/arch at far edge, open floor band, empty stands only, no logos no text',
  ),
  'shoe-store': setting(
    'shoe-store',
    'shoe store',
    'Aggressive S2 leftover setting — shoe store (2 variants)',
    'quiet shoe-store lesson stage: shelves along walls, wide empty aisle/floor center, blank shoe silhouettes at edges, no people no logos or size numbers',
    'same store: bench at far edge, open floor band, not busy illustration, no text',
  ),
  newsstand: setting(
    'newsstand',
    'newsstand',
    'Aggressive S2 leftover setting — newsstand (2 variants)',
    'quiet street newsstand kiosk lesson stage: kiosk at edge, wide empty sidewalk/pavement center, blank racks no letters, no people no logos, not a post-office clone',
    'same newsstand: bench + lamp at far edge, open pavement band, not cinematic, no text',
  ),
  'photography-studio': setting(
    'photography-studio',
    'photography studio',
    'Aggressive S2 leftover setting — photography studio (2 variants)',
    'quiet photography studio lesson stage: paper backdrop roll at back edge, lights at far corners only, wide empty seamless floor center, no people no camera brands no letters, not a TV-studio clone, not an art easel room',
    'same studio: stool + reflector at far edge, open floor band, blank backdrop, not cinematic, no text',
  ),
  'tailor-shop': setting(
    'tailor-shop',
    'tailor shop',
    'Aggressive S2 leftover setting — tailor shop (2 variants)',
    'quiet tailor-shop lesson stage: sewing table + dress-form at edges, wide empty wood/tile floor center, fabric bolts along wall, no people no logos, not a clothing-store rack clone',
    'same shop: ironing board at far edge, open floor band, blank mannequin silhouette, no text',
  ),
  'jewelry-store': setting(
    'jewelry-store',
    'jewelry store',
    'Aggressive S2 leftover setting — jewelry store (2 variants)',
    'quiet jewelry-store lesson stage: glass cases along walls, wide empty aisle/floor center, blank displays no letters, no people no logos, not a supermarket',
    'same store: counter at far edge, open floor band, not busy illustration, no text',
  ),
  'recording-studio': setting(
    'recording-studio',
    'recording studio',
    'Aggressive S2 leftover setting — recording studio (2 variants)',
    'quiet recording-studio lesson stage: booth glass + console at edges, wide empty carpet floor center, blank screens no letters, no people no logos, not a school music-room clone',
    'same studio: mic stand at far edge only, open floor band, not cinematic, no text',
  ),
  'taxi-stand': setting(
    'taxi-stand',
    'taxi stand',
    'Aggressive S2 leftover setting — taxi stand (2 variants)',
    'quiet taxi-stand lesson stage: curb + shelter at edge, wide empty pavement center, blank taxi silhouette far edge, no people no numbers logos, not a bus-stop clone',
    'same stand: bench at far edge, open sidewalk band, not cinematic, no text',
  ),
};

export const WAVES = Object.fromEntries(
  Object.keys(SETTINGS).map((slug) => [
    slug,
    { id: `s2-set-${slug}`, setting: slug, title: SETTINGS[slug].title },
  ]),
);

export const WAVE_ORDER = Object.keys(WAVES);

export function resolveSetting(key) {
  const wave = WAVES[key];
  if (!wave) throw new Error(`Unknown S2 leftover setting wave: ${key}. Use ${WAVE_ORDER.join('|')}`);
  const settingRow = SETTINGS[wave.setting];
  if (!settingRow) throw new Error(`Missing SETTINGS for ${wave.setting}`);
  return { wave, setting: settingRow };
}

function addExactToken(into, value) {
  const v = String(value || '').toLowerCase().trim();
  if (v) into.add(v);
}

function collectJsonSlugs(dir, into) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const keysPath = path.join(dir, name, 'keys.json');
    if (!fs.existsSync(keysPath)) continue;
    try {
      const keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
      addExactToken(into, keys.setting);
      addExactToken(into, keys.slug);
      for (const sheet of keys.sheets || []) {
        for (const k of sheet.keys || []) {
          const s = String(k).toLowerCase();
          if (s.startsWith('aggressive-s3-set-')) addExactToken(into, s.slice('aggressive-s3-set-'.length));
          if (s.startsWith('aggressive-s1set-')) {
            const rest = s.slice('aggressive-s1set-'.length);
            const head = rest.split('-')[0];
            if (head) addExactToken(into, head);
          }
        }
      }
    } catch {
      /* ignore */
    }
  }
}

export function readDedupedSlugs(root = ROOT) {
  const slugs = new Set(DEDUPE_SKIP);
  collectJsonSlugs(path.join(root, 'harvested/manus-aggressive-stockpile/s1-settings'), slugs);
  collectJsonSlugs(path.join(root, 'harvested/manus-aggressive-stockpile/s3-story-settings'), slugs);
  return slugs;
}

export function writeTrackedDoc(inv) {
  const waves = inv.waves || {};
  const lines = [
    '# Aggressive stockpile S2 — EDB setting backgrounds',
    '',
    'Leftover **quiet lesson-stage** pack. Stockpile only. No picker/manifest wiring.',
    '',
    `- Prefix: \`${PREFIX}\``,
    `- Durable root: \`${STOCKPILE_REL}\``,
    `- Runner: \`scripts/manus/request-aggressive-s2-settings-leftover.mjs\``,
    `- Canvas: ${BOARD.width}×${BOARD.height}; groundY ${GROUND_Y_RANGE}`,
    `- Updated: ${inv.updated_at || new Date().toISOString()}`,
    '',
    '## Parked (do not remop)',
    '',
    'space, volcano, castle, concert-hall — cinematic/fantasy; tasks STOPPED.',
    '',
  ];
  for (const id of PARKED_WAVE_IDS) {
    const row = waves[id] || {};
    lines.push(`- \`${id}\` task ${row.task_id || '(n/a)'} status ${row.agent_status || 'stopped'}`);
  }
  lines.push('');
  lines.push('## Dedup');
  lines.push('');
  lines.push('Skip S1 settings, civic stages, VG modular stages, S3 story-settings, and parked S2.');
  lines.push(`Leftover queue: ${WAVE_ORDER.join(', ')}.`);
  lines.push('');
  lines.push('## Rate-limit lock');
  lines.push('');
  lines.push('- Max 1 in-flight S2 task. Poll ~30s. No continue-messages. 429 backoff.');
  lines.push('');
  lines.push('## Leftover waves');
  lines.push('');
  for (const k of WAVE_ORDER) {
    const w = WAVES[k];
    const row = waves[w.id] || {};
    lines.push(`### ${w.id}`);
    lines.push('');
    lines.push(`- Title: ${w.title}`);
    lines.push(`- Task: ${row.task_id || '(pending)'} ${row.task_url || ''}`);
    lines.push(`- Agent: ${row.agent_status || '(n/a)'}`);
    lines.push(`- QA: ${row.qa_status || 'pending'}`);
    lines.push('');
  }
  fs.mkdirSync(path.dirname(path.join(ROOT, TRACKED_DOC_REL)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, TRACKED_DOC_REL), `${lines.join('\n')}\n`);
}
