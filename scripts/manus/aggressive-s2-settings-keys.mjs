/**
 * Aggressive S2 — EDB setting-drop backgrounds (second pack).
 * Stockpile only. No PropBank / picker / manifest wiring.
 *
 * Partition: harvested/manus-aggressive-stockpile/s2-settings/
 * Deduped vs: edb-settings classroom→pool, s1-settings (when present),
 * 08 quiet-flat banks (style only — we still want interaction floors),
 * long-tail civic stages (bakery/barbershop/pharmacy/marina/laundromat/
 * hardware/marketplace/ferry/florist/recycling/orchard/pottery/rink/bowling/
 * skate/climb/boardwalk/music-shop/food-court/parking/observatory/cafeteria/pier).
 *
 * S1 leftover: S1 had no s1-settings/keys.json at mint. This pack takes
 * place leftovers S1 is unlikely to start with (wired civic first-half
 * fire/police/post/garage/museum/theater/aquarium stays for S1).
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

/** Places already harvested as EDB or civic stages — do not clone. */
export const DEDUPE_SKIP = [
  'classroom', 'bedroom', 'kitchen', 'bathroom', 'living-room', 'playground', 'park',
  'street-town', 'shop', 'restaurant', 'clinic', 'library', 'farm', 'zoo', 'beach',
  'forest', 'airport', 'bus-stop', 'train-platform', 'train-interior', 'bus-interior',
  'sports-field', 'basketball-court', 'swimming-pool',
  'laundromat', 'hardware-store', 'marketplace', 'ferry-deck', 'florist', 'recycling-center',
  'bakery', 'barbershop', 'pharmacy', 'marina', 'orchard', 'pottery-studio', 'ice-rink',
  'bowling-alley', 'skate-park', 'climbing-gym', 'boardwalk', 'music-shop', 'food-court',
  'parking-garage', 'observatory', 'cafeteria', 'pier',
  'fire-station', 'police-station', 'post-office', 'garage', 'museum', 'theater', 'aquarium',
  'cafe', 'hotel-lobby', 'workshop', 'station', 'gymnasium',
  'hotel-lobby', 'gymnasium',
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
  space: setting(
    'space',
    'space / planetarium',
    'Aggressive S2 setting — space (2 variants)',
    'quiet planetarium hall: dome + seats along edges, wide empty floor center for props, star-haze on dome only, no people no letters no numbers',
    'same space lesson stage: ringed-planet mural on far wall edge, open floor band, sparse stars at corners only, not cinematic, no rockets mid-frame, no text',
  ),
  volcano: setting(
    'volcano',
    'volcano',
    'Aggressive S2 setting — volcano (2 variants)',
    'quiet volcano overlook: crater rim + ash haze at edges, wide empty stone path center, ember glow fringe only, no people no lava filling mid-frame',
    'same volcano stage: distant plume at far edge, open rocky floor band, not a cinematic eruption poster, no text',
  ),
  castle: setting(
    'castle',
    'castle',
    'Aggressive S2 setting — castle (2 variants)',
    'quiet castle courtyard: stone walls + arch at edges, wide empty cobble floor center, banner silhouettes blank, no people no heraldry letters',
    'same castle: stair + window at far edge, open courtyard band, not a movie still, no text',
  ),
  'concert-hall': setting(
    'concert-hall',
    'concert hall',
    'Aggressive S2 setting — concert hall (2 variants)',
    'quiet concert hall: seats + stage proscenium at edges, wide empty aisle/floor center, no people no music notation or titles',
    'same hall: curtain + piano silhouette at far edge, open floor band, not cinematic, no text',
  ),
  campsite: setting(
    'campsite',
    'camp',
    'Aggressive S2 setting — campsite (2 variants)',
    'quiet campsite: tent + lantern at edges, wide empty dirt/grass floor center, trees as fringe only, no people no camp-sign letters',
    'same camp: fire-ring at far edge (no flames filling frame), open floor band, not a habitat photo, no text',
  ),
  greenhouse: setting(
    'greenhouse',
    'greenhouse',
    'Aggressive S2 setting — greenhouse (2 variants)',
    'quiet greenhouse: plant benches along walls, wide empty tile/path center, glass roof haze, no people no plant labels',
    'same greenhouse: potting table at edge, open floor band, not a jungle collage, no text',
  ),
  office: setting(
    'office',
    'office',
    'Aggressive S2 setting — office (2 variants)',
    'quiet office: desks + cabinets along walls, wide empty carpet floor center, blank screens, no people no UI text or logos',
    'same office: window + plant at far edge, open floor band, not a furnished room close-up, no text',
  ),
  'science-lab': setting(
    'science-lab',
    'science lab',
    'Aggressive S2 setting — science lab (2 variants)',
    'quiet school science lab: benches + sink along walls, wide empty floor center, blank glassware at edges, no people no formulas or labels',
    'same lab: fume-hood silhouette at far edge, open floor band, no hazard letters, no text',
  ),
  'hotel-lobby': setting(
    'hotel-lobby',
    'hotel lobby',
    'Aggressive S2 setting — hotel lobby (2 variants)',
    'quiet hotel lobby: desk + plants at edges, wide empty tile floor center, blank signage, no people no logos or room numbers',
    'same lobby: sofa grouping at far edge, open floor band, not cinematic, no text',
  ),
  'construction-site': setting(
    'construction-site',
    'construction site',
    'Aggressive S2 setting — construction site (2 variants)',
    'quiet construction yard: fence + cones at edges, wide empty dirt/pavement center, distant crane silhouette, no people no site-sign letters',
    'same yard: stacked beams at far edge, open floor band, kid-safe, no text',
  ),
  lighthouse: setting(
    'lighthouse',
    'lighthouse',
    'Aggressive S2 setting — lighthouse (2 variants)',
    'quiet lighthouse terrace: tower + rail at edges, wide empty stone floor center, sea/horizon fringe, no people no light-numbers',
    'same terrace: lantern-room at far edge, open floor band, not cinematic, no text',
  ),
  'vet-clinic': setting(
    'vet-clinic',
    'vet clinic',
    'Aggressive S2 setting — vet clinic (2 variants)',
    'quiet vet waiting room: counter + chairs at edges, wide empty floor center, blank posters, no people no animals no clinic letters',
    'same vet: exam-table at far edge, open floor band, no pet names or logos, no text',
  ),
  'gas-station': setting(
    'gas-station',
    'gas station',
    'Aggressive S2 setting — gas station (2 variants)',
    'quiet gas station: pumps + canopy at edges, wide empty pavement center, blank pump faces, no people no prices or brand logos',
    'same station: shop kiosk at far edge, open forecourt band, no text',
  ),
  desert: setting(
    'desert',
    'desert',
    'Aggressive S2 setting — desert (2 variants)',
    'quiet desert path: dunes + cactus at edges, wide empty sand floor center, pale sky haze, no people no oasis-sign letters',
    'same desert: rock outcrop at far edge, open sand band, not cinematic, no text',
  ),
  cave: setting(
    'cave',
    'cave',
    'Aggressive S2 setting — cave (2 variants)',
    'quiet cave floor: rock walls + stalagmites at edges, wide empty stone floor center, soft cool light, no people no carved letters',
    'same cave: opening to sky at far edge, open floor band, not a horror scene, no text',
  ),
  gymnasium: setting(
    'gymnasium',
    'gymnasium',
    'Aggressive S2 setting — gymnasium (2 variants)',
    'quiet school gym: bleachers + wall-pads at edges, wide empty wood floor center, rolled mats at fringe, no people no scoreboard numbers',
    'same gym: hoop at far edge only, open court band, not basketball-court clone from EDB wave6, no text',
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
  if (!wave) throw new Error(`Unknown S2 setting wave: ${key}. Use ${WAVE_ORDER.join('|')}`);
  const settingRow = SETTINGS[wave.setting];
  if (!settingRow) throw new Error(`Missing SETTINGS for ${wave.setting}`);
  return { wave, setting: settingRow };
}

export function readS1FiringSlugs(root = ROOT) {
  const dir = path.join(root, 'harvested/manus-aggressive-stockpile/s1-settings');
  const slugs = new Set();
  if (!fs.existsSync(dir)) return slugs;
  for (const name of fs.readdirSync(dir)) {
    const keysPath = path.join(dir, name, 'keys.json');
    if (!fs.existsSync(keysPath)) continue;
    try {
      const keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
      if (keys.setting) slugs.add(String(keys.setting));
      if (keys.slug) slugs.add(String(keys.slug));
      const hay = JSON.stringify(keys).toLowerCase();
      for (const k of Object.keys(SETTINGS)) {
        if (hay.includes(k)) slugs.add(k);
      }
    } catch {
      /* ignore */
    }
  }
  return slugs;
}

export function writeTrackedDoc(inv) {
  const waves = inv.waves || {};
  const lines = [
    '# Aggressive stockpile S2 — EDB setting backgrounds',
    '',
    'Second settings pack. Stockpile only. No picker/manifest wiring.',
    '',
    `- Prefix: \`${PREFIX}\``,
    `- Durable root: \`${STOCKPILE_REL}\``,
    `- Runner: \`scripts/manus/request-aggressive-s2-settings.mjs\``,
    `- Canvas: ${BOARD.width}×${BOARD.height}; groundY ${GROUND_Y_RANGE}`,
    `- Updated: ${inv.updated_at || new Date().toISOString()}`,
    '',
    '## Dedup',
    '',
    'Skip EDB classroom→pool, long-tail civic stages, and S1 settings keys when present.',
    'This pack leftover: space, volcano, castle, concert-hall, campsite, greenhouse, office,',
    'science-lab, hotel-lobby, construction-site, lighthouse, vet-clinic, gas-station, desert, cave, gymnasium.',
    '',
    '## Rate-limit lock',
    '',
    '- Max 1 in-flight S2 settings task. Poll ~30s. No continue-messages.',
    '',
    '## Waves',
    '',
  ];
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
