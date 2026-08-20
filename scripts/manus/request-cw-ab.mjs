/**
 * Content worlds STREAMS A+B — science process + habitats.
 * Stockpile only. No producer, recipes, PropBank, or renderer wiring.
 *
 *   node scripts/manus/request-cw-ab.mjs --wave=spa1 --fire
 *   node scripts/manus/request-cw-ab.mjs --wave=spa1 --poll-only
 *   node scripts/manus/request-cw-ab.mjs --loop
 *
 * Partition: harvested/content-worlds/{science-process,habitats}/
 * Rate lock: max 1 in-flight. Poll ~30s. 429 → wait 90s, one retry, then double.
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import {
  ROOT,
  createTask,
  listMessages,
  latestAgentStatus,
  sendMessage,
  MANUS_SKILLS,
  resolveAgentProfile,
  withEslAssetGeneratorBrief,
  apiKey,
} from './client.mjs';

export const STOCKPILE_REL = 'harvested/content-worlds';
export const TRACKED_DOC_REL = 'docs/content-worlds-ab.md';
export const PREFIX = 'cw-';

const STOCKPILE = path.join(ROOT, STOCKPILE_REL);
const LOCK = path.join(STOCKPILE, '.ab.lock');
const INV_PATH = path.join(STOCKPILE, 'ab-inventory.json');
const POLL_MS = 30_000;
const TIMEOUT_MS = 65 * 60 * 1000;
const RATE_WAIT_MS = 90_000;
const LARGE_BYTES = 80_000;

const STYLE_WORLD = `CONTENT-WORLD / PRESET-STAGE — full-page landscape play world for ClassIn ESL (not a vocab icon, not a quiet flat, not a worksheet).

BOARD FEEL: panoramic 16:9 landscape. Soft children's-book illustration, readable, same house style as other ESL stockpile art.
PLAY ZONE: ~35–50% open center/lower band (roughly horizontal 20–80%) so kids can drag tokens and stand characters. Landforms and furniture stay at EDGES or as EMPTY stations.
L2 = empty modular world (stations/pads exist, nothing living fused in). L3 = adaptable composed world (a bit more furniture, still empty of animals/people, tokens stay separate).
NO L4 sealed textbook poster. NO infographic: no baked labels, legends, arrows-with-words, captions, sun-with-Evaporation, numbered steps.
NO people, faces, Mia, Leo, teachers, mascots fused into the world. Optional empty standing pads only.
NO maps, flags, logos, watermarks, worksheets, UI chrome, readable letters or numbers.
quality: default ONLY (never high).`;

const STYLE_CONTACT = `BLACK-FIELD CONTACT — #000000 edge-to-edge, clear gutters, one concept per cell, nothing crossing cells.
NEVER white, grey, or cream cell plates — the field around every token is pure black.
PLAY SCALE: each token fills most of its cell with generous black margin (board-drag size, not a postage-stamp icon).
Still-life / overlay atom. No full backgrounds in companion cells.
NO text, letters, numbers, logos, captions, key names printed on the PNG.
quality: default ONLY.`;

const DEDUPE = `DO NOT CLONE (already harvested — skip):
SETTINGS: forest-path/clearing, desert-dune/oasis, zoo, river-bank, cave, island, beach, aquarium room, science-lab benches, snow/igloo, mountain/lake, greenhouse, waterfall, canyon, pasture/grass-field.
VG GRAMMAR: habitat-land-water, sort-habitat-mat, aff-drop-habitat, seq-track-3/4, process-trail, before-after-stage, atmo-rain-light/heavy, atmo-snow-light/heavy, atmo-mist-fog, atmo-wind-gust, atmo-drifting-cloud.
LONG-TAIL / VOCAB TOKENS: tadpole, spawn, chrysalis, frog-pond, duckling, water-lily, cattail, pond-snail, polar-bear, penguin, clownfish, coral-brain, anemone, seahorse, starfish, succulent, lichen, anthill, wormery.
MIA/LEO poses, classroom nouns, fruit, tiny fasteners, songs, sacred/worship interiors.
NOT water-treatment plants: no funnels, silos, pipe farms, industrial tanks (those are a different stream). Natural cycle/habitat only.
NOT gas stations / factories / chimneys / pump canopies on science-process worlds (spa5 HOLD lesson).
Matter stations: trays/basins/kettles at edges — NOT outdoor igloo habitats, NOT lab-room clones.
NO fused rain/snow/steam filling the play zone on empty stages — tokens come on separate black-field sheets.`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function is429(err) {
  return /failed \(429\)|rate.?limit|too many requests|resource_exhausted/i.test(String(err && err.message));
}

async function withRateBackoff(fn) {
  try {
    return await fn();
  } catch (err) {
    if (!is429(err)) throw err;
    console.log(JSON.stringify({ phase: 'rate-limit', wait_ms: RATE_WAIT_MS, retry: 1 }, null, 2));
    await sleep(RATE_WAIT_MS);
    try {
      return await fn();
    } catch (err2) {
      if (!is429(err2)) throw err2;
      const wait2 = RATE_WAIT_MS * 2;
      console.log(JSON.stringify({ phase: 'rate-limit', wait_ms: wait2, retry: 'backoff-stop' }, null, 2));
      await sleep(wait2);
      throw err2;
    }
  }
}

async function listMessagesBackoff(taskId, opts = {}) {
  return withRateBackoff(() => listMessages(taskId, opts));
}

async function pollGently(taskId) {
  const started = Date.now();
  let lastStatus = null;
  await sleep(2500);
  while (Date.now() - started < TIMEOUT_MS) {
    const page = await listMessagesBackoff(taskId, {
      order: 'desc',
      limit: 80,
      allowMissing: Date.now() - started < 90_000,
    });
    const messages = (page && page.messages) || [];
    const st = latestAgentStatus(messages);
    lastStatus = (st && st.agent_status) || lastStatus;
    console.log(JSON.stringify({ phase: 'tick', task_id: taskId, agent_status: lastStatus || 'unknown' }, null, 2));
    if (lastStatus === 'stopped' || lastStatus === 'error') {
      const asc = await listMessagesBackoff(taskId, { order: 'asc', limit: 120, allowMissing: true });
      return { agent_status: lastStatus, messages: (asc && asc.messages) || messages };
    }
    await sleep(POLL_MS);
  }
  const asc = await listMessagesBackoff(taskId, { order: 'asc', limit: 120, allowMissing: true });
  return { agent_status: lastStatus || 'timeout', messages: (asc && asc.messages) || [] };
}

function cell(opts) {
  const { slug, world, layer, archetypes, kind, brief } = opts;
  return {
    key: `${PREFIX}${slug}`,
    asset_id: `cw-${slug}`,
    concept: slug,
    content_world: world,
    layer,
    archetypes,
    kind,
    brief,
  };
}

function fp(id, title, cells) {
  return { id, title, format: 'fullpage-landscape', cells };
}

function ct(id, title, format, cells) {
  return { id, title, format, cells };
}

const SPA1_SHEETS = [
  fp('spa1-s1', 'water cycle ocean evaporation L2 fullpage', [
    cell({
      slug: 'water-ocean-evap',
      world: 'water-cycle',
      layer: 'L2',
      archetypes: ['cycle', 'sequence', 'character-participation'],
      kind: 'stage',
      brief:
        'empty ocean/lake evaporation station world: wide open water play band 35-50%, sun space at upper edge only, no sun-label, no people, no boats as subjects, shoreline at far edge, kids can place droplet tokens',
    }),
  ]),
  fp('spa1-s2', 'water cycle cloud condensation L2 fullpage', [
    cell({
      slug: 'water-cloud-condense',
      world: 'water-cycle',
      layer: 'L2',
      archetypes: ['cycle', 'sequence'],
      kind: 'stage',
      brief:
        'empty sky condensation station: open sky play zone 35-50%, soft empty cloud pads at edges, no letters, no rain yet, no people, mountain silhouette far below only',
    }),
  ]),
  fp('spa1-s3', 'water cycle mountain rain L2 fullpage', [
    cell({
      slug: 'water-mountain-rain',
      world: 'water-cycle',
      layer: 'L2',
      archetypes: ['cycle', 'sequence', 'prediction'],
      kind: 'stage',
      brief:
        'empty mountain precipitation station: open slope/valley play band 35-50%, peaks at edges, empty cloud shelf above, no rain streaks filling frame, no labels, no people or animals',
    }),
  ]),
  fp('spa1-s4', 'water cycle collection return L2 fullpage', [
    cell({
      slug: 'water-collection-return',
      world: 'water-cycle',
      layer: 'L2',
      archetypes: ['cycle', 'route', 'build-world'],
      kind: 'stage',
      brief:
        'empty collection/return station: open ground+stream play band 35-50%, river returning to lake at edge, empty puddle pads, no arrows, no text, no people',
    }),
  ]),
];

const SPA2_SHEETS = [
  ct('spa2-c1', 'water cycle play tokens 3x3', 'black-contact-3x3', [
    cell({ slug: 'tok-water-droplet', world: 'water-cycle', layer: 'L2', archetypes: ['cycle'], kind: 'companion', brief: 'PLAY SCALE water droplet token, still-life, no face, no text' }),
    cell({ slug: 'tok-vapor-puff', world: 'water-cycle', layer: 'L2', archetypes: ['cycle'], kind: 'companion', brief: 'PLAY SCALE vapor/steam puff token, not a weather field overlay, no text' }),
    cell({ slug: 'tok-rain-cluster', world: 'water-cycle', layer: 'L2', archetypes: ['cycle'], kind: 'companion', brief: 'PLAY SCALE small rain-drop cluster as ONE token, not a full-screen rain overlay, no text' }),
    cell({ slug: 'tok-collection-puddle', world: 'water-cycle', layer: 'L2', archetypes: ['cycle'], kind: 'companion', brief: 'PLAY SCALE puddle token, still-life, no reflections of people, no text' }),
    cell({ slug: 'tok-stream-ribbon', world: 'water-cycle', layer: 'L2', archetypes: ['route'], kind: 'companion', brief: 'PLAY SCALE short stream-water ribbon token, isolated, no map, no text' }),
    cell({ slug: 'tok-sun-disc', world: 'water-cycle', layer: 'L2', archetypes: ['cycle'], kind: 'companion', brief: 'PLAY SCALE simple sun disc token, flat house style, no letters, no sunglasses face' }),
    cell({ slug: 'tok-snowcap-bit', world: 'water-cycle', layer: 'L2', archetypes: ['cycle'], kind: 'companion', brief: 'PLAY SCALE small mountain-snowcap landform token, not a full setting, no text' }),
    cell({ slug: 'tok-groundwater-seep', world: 'water-cycle', layer: 'L2', archetypes: ['reveal', 'cutaway'], kind: 'companion', brief: 'PLAY SCALE groundwater seep / underground water lens token, simple cutaway blob, no labels' }),
    cell({ slug: 'tok-ice-crystal', world: 'water-cycle', layer: 'L2', archetypes: ['cycle'], kind: 'companion', brief: 'PLAY SCALE ice crystal / snow-crystal token, one object, no text' }),
  ]),
  ct('spa2-o1', 'water cycle process overlays 3x2', 'black-contact-3x2', [
    cell({ slug: 'ov-evap-shimmer', world: 'water-cycle', layer: 'L2', archetypes: ['overlay', 'cycle'], kind: 'overlay', brief: 'compact evaporation shimmer overlay atom, keyable, generous margin, not a full background, no arrows with words' }),
    cell({ slug: 'ov-condense-beads', world: 'water-cycle', layer: 'L2', archetypes: ['overlay', 'cycle'], kind: 'overlay', brief: 'compact condensation bead cluster overlay, keyable, no text' }),
    cell({ slug: 'ov-runoff-sheet', world: 'water-cycle', layer: 'L2', archetypes: ['overlay', 'route'], kind: 'overlay', brief: 'compact runoff water-sheet overlay atom, not a river setting, no text' }),
    cell({ slug: 'ov-cloud-fill-soft', world: 'water-cycle', layer: 'L2', archetypes: ['overlay'], kind: 'overlay', brief: 'soft cloud-fill overlay piece for a station pad, not VG drifting-cloud clone, no text' }),
    cell({ slug: 'ov-return-ripple', world: 'water-cycle', layer: 'L2', archetypes: ['overlay', 'cycle'], kind: 'overlay', brief: 'compact lake-return ripple overlay atom, keyable, no text' }),
    cell({ slug: 'ov-sun-warm-wash', world: 'water-cycle', layer: 'L2', archetypes: ['overlay'], kind: 'overlay', brief: 'compact warm sun-wash overlay, restrained, not a full sunset background, no text' }),
  ]),
];

const SPA3_SHEETS = [
  fp('spa3-s1', 'butterfly cycle empty pads L2', [
    cell({
      slug: 'life-butterfly-pads',
      world: 'butterfly-cycle',
      layer: 'L2',
      archetypes: ['cycle', 'sequence', 'build-world'],
      kind: 'stage',
      brief:
        'empty garden 4-pad butterfly life-cycle world: four EMPTY leaf/twig station pads around an open play band 35-50%, no caterpillar, no chrysalis, no butterfly fused, no numbers, no people',
    }),
  ]),
  fp('spa3-s2', 'frog cycle empty pads L2', [
    cell({
      slug: 'life-frog-pads',
      world: 'frog-cycle',
      layer: 'L2',
      archetypes: ['cycle', 'sequence'],
      kind: 'stage',
      brief:
        'empty pond-edge 4-pad frog life-cycle world: open water+bank play band 35-50%, four EMPTY pads (shalllows to bank), no tadpoles, no frogs, no spawn fused, no labels',
    }),
  ]),
  fp('spa3-s3', 'plant cycle empty pads L2', [
    cell({
      slug: 'life-plant-pads',
      world: 'plant-cycle',
      layer: 'L2',
      archetypes: ['cycle', 'sequence', 'before-after'],
      kind: 'stage',
      brief:
        'empty soil-and-sun 4-pad plant life-cycle world: open dirt play band 35-50%, four EMPTY soil mounds/pots as pads, sun space at edge, no seedlings fused, no people, no text',
    }),
  ]),
  fp('spa3-s4', 'chicken cycle empty pads L2', [
    cell({
      slug: 'life-chicken-pads',
      world: 'chicken-cycle',
      layer: 'L2',
      archetypes: ['cycle', 'sequence'],
      kind: 'stage',
      brief:
        'empty coop-yard 4-pad chicken life-cycle world: open straw/yard play band 35-50%, EMPTY nest box + EMPTY coop silhouette at edges, no hens, no chicks, no eggs fused, no text',
    }),
  ]),
];

const SPA4_SHEETS = [
  ct('spa4-c1', 'life cycle play tokens 3x3 skip HAVE', 'black-contact-3x3', [
    cell({ slug: 'tok-butterfly-eggs', world: 'butterfly-cycle', layer: 'L2', archetypes: ['sequence'], kind: 'companion', brief: 'PLAY SCALE tiny butterfly eggs on a leaf, still-life, not a chicken egg, no text' }),
    cell({ slug: 'tok-caterpillar', world: 'butterfly-cycle', layer: 'L2', archetypes: ['sequence'], kind: 'companion', brief: 'PLAY SCALE caterpillar token, still-life, no face cartoon letters, no chrysalis (already harvested)' }),
    cell({ slug: 'tok-butterfly-adult', world: 'butterfly-cycle', layer: 'L2', archetypes: ['sequence'], kind: 'companion', brief: 'PLAY SCALE adult butterfly token, wings closed or open still-life, no text' }),
    cell({ slug: 'tok-froglet', world: 'frog-cycle', layer: 'L2', archetypes: ['sequence'], kind: 'companion', brief: 'PLAY SCALE froglet with tiny legs (between tadpole and frog), still-life, skip tadpole/spawn (harvested)' }),
    cell({ slug: 'tok-seed', world: 'plant-cycle', layer: 'L2', archetypes: ['sequence'], kind: 'companion', brief: 'PLAY SCALE single seed token, not fruit, still-life, no text' }),
    cell({ slug: 'tok-sprout', world: 'plant-cycle', layer: 'L2', archetypes: ['sequence', 'before-after'], kind: 'companion', brief: 'PLAY SCALE sprout with hook stem, still-life, no pot label' }),
    cell({ slug: 'tok-seedling', world: 'plant-cycle', layer: 'L2', archetypes: ['sequence'], kind: 'companion', brief: 'PLAY SCALE seedling with two leaves, still-life, no text' }),
    cell({ slug: 'tok-empty-nest', world: 'chicken-cycle', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE empty straw nest token, no eggs, no bird, no text' }),
    cell({ slug: 'tok-chick-fluff', world: 'chicken-cycle', layer: 'L2', archetypes: ['sequence'], kind: 'companion', brief: 'PLAY SCALE fluffy chick token, still-life, kid-safe, no text' }),
  ]),
];

const SPA5_SHEETS = [
  fp('spa5-s1', 'solid ice station L2', [
    cell({
      slug: 'matter-solid-ice',
      world: 'states-of-matter',
      layer: 'L2',
      archetypes: ['compare', 'sort', 'character-participation'],
      kind: 'stage',
      brief:
        'empty solid/ice station world: open table/tray play band 35-50%, icy tray furniture at edges only, no ice cubes fused in the play zone, not a science-lab room clone, no thermometers with numbers, no people',
    }),
  ]),
  fp('spa5-s2', 'liquid water station L2', [
    cell({
      slug: 'matter-liquid-water',
      world: 'states-of-matter',
      layer: 'L2',
      archetypes: ['compare', 'sort'],
      kind: 'stage',
      brief:
        'empty liquid station world: open spill-safe tray play band 35-50%, empty shallow basin at edge, no pouring people, no beaker tick marks, no labels, not lab-benches clone',
    }),
  ]),
  fp('spa5-s3', 'gas steam station L2', [
    cell({
      slug: 'matter-gas-steam',
      world: 'states-of-matter',
      layer: 'L2',
      archetypes: ['compare', 'sort'],
      kind: 'stage',
      brief:
        'empty gas/steam station world: open air play band 35-50%, kettle/pot silhouette at far edge with NO steam filling frame, no warning labels, no people',
    }),
  ]),
  fp('spa5-s4', 'three empty compare platforms L2', [
    cell({
      slug: 'matter-three-platforms',
      world: 'states-of-matter',
      layer: 'L2',
      archetypes: ['compare', 'sort', 'tableau'],
      kind: 'stage',
      brief:
        'empty three-platform compare world: three EMPTY trays/pads left-center-right, open floor 35-50% in front, no ice/water/steam fused, no Solid/Liquid/Gas words, not a Venn diagram, no people',
    }),
  ]),
];

const SPA6_SHEETS = [
  ct('spa6-c1', 'states of matter tokens 3x3', 'black-contact-3x3', [
    cell({ slug: 'tok-ice-block', world: 'states-of-matter', layer: 'L2', archetypes: ['compare'], kind: 'companion', brief: 'PLAY SCALE ice block token, still-life, no numbers, no text' }),
    cell({ slug: 'tok-water-blob', world: 'states-of-matter', layer: 'L2', archetypes: ['compare'], kind: 'companion', brief: 'PLAY SCALE liquid water blob token, still-life, no face, no text' }),
    cell({ slug: 'tok-steam-puff', world: 'states-of-matter', layer: 'L2', archetypes: ['compare'], kind: 'companion', brief: 'PLAY SCALE steam puff token, distinct from weather fog overlay, no text' }),
    cell({ slug: 'tok-empty-beaker', world: 'states-of-matter', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE empty glass beaker, NO tick marks, NO numbers, no liquid' }),
    cell({ slug: 'tok-ice-tray', world: 'states-of-matter', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE empty ice-cube tray, no brand, no text' }),
    cell({ slug: 'tok-closed-jar-swirl', world: 'states-of-matter', layer: 'L2', archetypes: ['reveal'], kind: 'companion', brief: 'PLAY SCALE closed jar with faint gas swirl inside, no labels' }),
    cell({ slug: 'tok-melt-drip', world: 'states-of-matter', layer: 'L2', archetypes: ['before-after'], kind: 'companion', brief: 'PLAY SCALE melting ice with one drip, still-life, no text' }),
    cell({ slug: 'tok-boil-bubbles', world: 'states-of-matter', layer: 'L2', archetypes: ['before-after'], kind: 'companion', brief: 'PLAY SCALE boil-bubble cluster token, not a pot setting, no text' }),
    cell({ slug: 'ov-freeze-crust', world: 'states-of-matter', layer: 'L2', archetypes: ['overlay', 'before-after'], kind: 'overlay', brief: 'compact frost-crust overlay atom, keyable, generous margin, no text' }),
  ]),
];

const SPA7_SHEETS = [
  fp('spa7-s1', 'fair weather cloud build L2', [
    cell({
      slug: 'weather-fair-build',
      world: 'weather-formation',
      layer: 'L2',
      archetypes: ['sequence', 'prediction'],
      kind: 'stage',
      brief:
        'empty fair-weather cloud-formation sky world: open sky play zone 35-50%, horizon/land lip at very bottom edge, EMPTY small cloud pads, no sun-face, no weather icons, no text, not VG rain overlay',
    }),
  ]),
  fp('spa7-s2', 'rain cloud building L2', [
    cell({
      slug: 'weather-rain-build',
      world: 'weather-formation',
      layer: 'L2',
      archetypes: ['sequence', 'prediction', 'cycle'],
      kind: 'stage',
      brief:
        'empty rain-cloud building sky: open play zone 35-50%, darker empty cloud shelf at top edge, ground lip bottom, NO rain streaks filling the frame (tokens go later), no lightning, no labels',
    }),
  ]),
  fp('spa7-s3', 'snow cloud building L2', [
    cell({
      slug: 'weather-snow-build',
      world: 'weather-formation',
      layer: 'L2',
      archetypes: ['sequence', 'prediction'],
      kind: 'stage',
      brief:
        'empty snow-cloud formation sky: open play zone 35-50%, pale empty cloud pads, winter ground lip, NO falling snow field (VG already has that overlay), no text, no people',
    }),
  ]),
  fp('spa7-s4', 'storm cell building L2', [
    cell({
      slug: 'weather-storm-build',
      world: 'weather-formation',
      layer: 'L2',
      archetypes: ['sequence', 'prediction', 'tableau'],
      kind: 'stage',
      brief:
        'empty storm-cell formation sky: open play zone 35-50%, towering empty cloud mass at edge, ground lip, NO lightning bolts fused, no warning text, kid-calm (not terrifying), no people',
    }),
  ]),
];

const SPA8_SHEETS = [
  ct('spa8-c1', 'weather formation tokens 3x3 skip VG overlays', 'black-contact-3x3', [
    cell({ slug: 'tok-cumulus-puff', world: 'weather-formation', layer: 'L2', archetypes: ['sequence'], kind: 'companion', brief: 'PLAY SCALE cumulus puff token, still-life, not a field overlay, no face' }),
    cell({ slug: 'tok-tower-cloud', world: 'weather-formation', layer: 'L2', archetypes: ['sequence'], kind: 'companion', brief: 'PLAY SCALE towering cloud token, one object, no text' }),
    cell({ slug: 'tok-anvil-cloud', world: 'weather-formation', layer: 'L2', archetypes: ['prediction'], kind: 'companion', brief: 'PLAY SCALE anvil-shaped storm cloud token, still-life, no lightning, no text' }),
    cell({ slug: 'tok-hail-cluster', world: 'weather-formation', layer: 'L2', archetypes: ['sequence'], kind: 'companion', brief: 'PLAY SCALE hail-pellet cluster as ONE token, no text' }),
    cell({ slug: 'tok-fog-bank', world: 'weather-formation', layer: 'L2', archetypes: ['overlay'], kind: 'companion', brief: 'PLAY SCALE compact fog-bank piece, not a full-board mist overlay, no text' }),
    cell({ slug: 'tok-warm-rise', world: 'weather-formation', layer: 'L2', archetypes: ['sequence'], kind: 'companion', brief: 'PLAY SCALE warm-air shimmer wisp token, NO letter arrows, no text' }),
    cell({ slug: 'tok-cold-sink', world: 'weather-formation', layer: 'L2', archetypes: ['sequence'], kind: 'companion', brief: 'PLAY SCALE cool-air shimmer wisp token, NO letter arrows, no text' }),
    cell({ slug: 'tok-calm-bolt', world: 'weather-formation', layer: 'L2', archetypes: ['prediction'], kind: 'companion', brief: 'PLAY SCALE small distant calm lightning bolt token, kid-safe, not scary, no text' }),
    cell({ slug: 'tok-rain-core', world: 'weather-formation', layer: 'L2', archetypes: ['sequence'], kind: 'companion', brief: 'PLAY SCALE rain-shaft core token (short curtain), not VG full-field rain, no text' }),
  ]),
];

const SPA9_SHEETS = [
  fp('spa9-s1', 'water cycle L3 adaptable composed', [
    cell({
      slug: 'water-cycle-composed',
      world: 'water-cycle',
      layer: 'L3',
      archetypes: ['cycle', 'sequence', 'build-world'],
      kind: 'preset-world',
      brief:
        'L3 adaptable water-cycle world: ocean + mountain + sky in ONE landscape with FOUR EMPTY station bowls/pads already placed at edges, huge open play band 35-50% in the middle, NO droplet/rain/sun fused, NO labels or arrows, not a textbook poster',
    }),
  ]),
  fp('spa9-s2', 'matter melt L3 before-after', [
    cell({
      slug: 'matter-melt-before-after',
      world: 'states-of-matter',
      layer: 'L3',
      archetypes: ['before-after', 'compare', 'prediction'],
      kind: 'preset-world',
      brief:
        'L3 adaptable before-after melt world: two EMPTY trays (left cool, right warm) in one landscape, open play band 35-50% in front, no ice fused, no words Before/After, not a lab room, no people',
    }),
  ]),
];

const HBA1_SHEETS = [
  fp('hba1-s1', 'empty pond biome L2', [
    cell({
      slug: 'bio-pond-empty',
      world: 'pond',
      layer: 'L2',
      archetypes: ['build-world', 'cutaway', 'character-participation'],
      kind: 'stage',
      brief:
        'empty pond ecosystem world: open water+bank play band 35-50%, reeds/rocks at EDGES only, NO frogs, fish, ducks, lily flowers fused, not a park-pond setting clone, no people, no text',
    }),
  ]),
  fp('hba1-s2', 'empty wetland biome L2', [
    cell({
      slug: 'bio-wetland-empty',
      world: 'wetland',
      layer: 'L2',
      archetypes: ['build-world', 'sort'],
      kind: 'stage',
      brief:
        'empty wetland/marsh world: open shallow-water play band 35-50%, grass clumps at edges, NO birds or frogs fused, no boardwalk signs, no people',
    }),
  ]),
  fp('hba1-s3', 'empty rainforest floor L2', [
    cell({
      slug: 'bio-rainforest-floor',
      world: 'rainforest',
      layer: 'L2',
      archetypes: ['build-world', 'seek'],
      kind: 'stage',
      brief:
        'empty rainforest understory world: open leaf-litter play band 35-50%, trunks/roots at edges, denser than a generic forest-path setting, NO animals fused, no people, no trail signs',
    }),
  ]),
  fp('hba1-s4', 'rainforest canopy cutaway L2', [
    cell({
      slug: 'bio-canopy-cutaway',
      world: 'rainforest',
      layer: 'L2',
      archetypes: ['cutaway', 'reveal', 'seek'],
      kind: 'stage',
      brief:
        'empty rainforest canopy CUTAWAY world: layered canopy with an open mid-air play gap 35-50%, cutaway showing empty branch platforms, NO monkeys/birds fused, no labels, not a treehouse setting clone',
    }),
  ]),
];

const HBA2_SHEETS = [
  fp('hba2-s1', 'empty coral reef L2', [
    cell({
      slug: 'bio-reef-empty',
      world: 'reef',
      layer: 'L2',
      archetypes: ['build-world', 'seek'],
      kind: 'stage',
      brief:
        'empty coral-reef ecosystem world: open sand/water play band 35-50%, coral heads as ARCHITECTURE at edges, NO fish fused, not an aquarium-room setting, no people, no text',
    }),
  ]),
  fp('hba2-s2', 'empty tide pool L2', [
    cell({
      slug: 'bio-tidepool-empty',
      world: 'tide-pool',
      layer: 'L2',
      archetypes: ['build-world', 'reveal', 'sort'],
      kind: 'stage',
      brief:
        'empty tide-pool world: open rock-basin play band 35-50%, empty pools as pads, NO starfish/crabs fused (those are vocab), shoreline at edge, no people, no text',
    }),
  ]),
  fp('hba2-s3', 'empty grassland L2', [
    cell({
      slug: 'bio-grassland-empty',
      world: 'grassland',
      layer: 'L2',
      archetypes: ['build-world', 'tableau'],
      kind: 'stage',
      brief:
        'empty grassland/savanna world: open grass play band 35-50%, distant tree/termite-mound silhouettes at far edge, NO animals fused, not a sports-field, not a pasture farm setting, no people',
    }),
  ]),
  fp('hba2-s4', 'empty mangrove L2', [
    cell({
      slug: 'bio-mangrove-empty',
      world: 'mangrove',
      layer: 'L2',
      archetypes: ['build-world', 'cutaway', 'route'],
      kind: 'stage',
      brief:
        'empty mangrove world: open tidal-water play band 35-50% weaving through EMPTY prop-root architecture at edges, NO crabs/birds fused, no maps, no people',
    }),
  ]),
];

const HBA3_SHEETS = [
  fp('hba3-s1', 'empty tundra L2', [
    cell({
      slug: 'bio-tundra-empty',
      world: 'tundra',
      layer: 'L2',
      archetypes: ['build-world', 'compare'],
      kind: 'stage',
      brief:
        'empty tundra ecosystem world: open low-ground play band 35-50%, polygon soil/frost texture, low scrub at edges, NOT a snow-igloo setting, NO polar animals fused, no people, no text',
    }),
  ]),
  fp('hba3-s2', 'empty rocky shore L2', [
    cell({
      slug: 'bio-rockyshore-empty',
      world: 'rocky-shore',
      layer: 'L2',
      archetypes: ['build-world', 'route'],
      kind: 'stage',
      brief:
        'empty rocky-shore world: open wet-rock play band 35-50%, cliffs at edge, NOT a beach-towel setting, NO animals fused, no people, no text',
    }),
  ]),
  fp('hba3-s3', 'pond L3 adaptable', [
    cell({
      slug: 'pond-composed',
      world: 'pond',
      layer: 'L3',
      archetypes: ['build-world', 'tableau', 'character-participation'],
      kind: 'preset-world',
      brief:
        'L3 adaptable pond world: empty lily-pad PLATFORMS and a snag perch already placed as furniture, huge open water play band 35-50%, NO frogs/ducks/fish fused, no labels',
    }),
  ]),
  fp('hba3-s4', 'reef L3 adaptable', [
    cell({
      slug: 'reef-composed',
      world: 'reef',
      layer: 'L3',
      archetypes: ['build-world', 'seek', 'cutaway'],
      kind: 'preset-world',
      brief:
        'L3 adaptable reef world: empty coral-arch tunnel + sand pockets as furniture, open swim play band 35-50%, NO fish fused, not a sealed poster, no text',
    }),
  ]),
];

const HBA4_SHEETS = [
  ct('hba4-c1', 'pond wetland companions 3x3 skip HAVE animals', 'black-contact-3x3', [
    cell({ slug: 'tok-lily-pad-platform', world: 'pond', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE empty lily-pad PLATFORM token (furniture), no frog, not a water-lily flower clone, no text' }),
    cell({ slug: 'tok-submerged-log', world: 'pond', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE submerged pond log token, no turtles, no text' }),
    cell({ slug: 'tok-pebble-shoal', world: 'pond', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE pebble shoal token, still-life, no text' }),
    cell({ slug: 'tok-duckweed-mat', world: 'pond', layer: 'L2', archetypes: ['overlay'], kind: 'companion', brief: 'PLAY SCALE duckweed mat token, still-life, no text' }),
    cell({ slug: 'tok-empty-reed-nest', world: 'wetland', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE empty reed nest token, no bird, no eggs, no text' }),
    cell({ slug: 'tok-muskrat-lodge', world: 'wetland', layer: 'L2', archetypes: ['cutaway'], kind: 'companion', brief: 'PLAY SCALE empty muskrat lodge mound, no animal, no text' }),
    cell({ slug: 'tok-pond-skater', world: 'pond', layer: 'L2', archetypes: ['seek'], kind: 'companion', brief: 'PLAY SCALE water-strider / pond-skater token, still-life, no text' }),
    cell({ slug: 'tok-heron-snag', world: 'wetland', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE empty heron-perch snag token, no bird, no text' }),
    cell({ slug: 'tok-algae-clump', world: 'pond', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE algae clump token, still-life, no text' }),
  ]),
  ct('hba4-c2', 'rainforest companions 3x3 skip animals', 'black-contact-3x3', [
    cell({ slug: 'tok-buttress-root', world: 'rainforest', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE tree buttress-root token, still-life, no animals, no text' }),
    cell({ slug: 'tok-liana-loop', world: 'rainforest', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE liana / vine loop token, isolated, no text' }),
    cell({ slug: 'tok-bromeliad-cup', world: 'rainforest', layer: 'L2', archetypes: ['reveal'], kind: 'companion', brief: 'PLAY SCALE bromeliad cup plant token, empty of frogs, no text' }),
    cell({ slug: 'tok-nurse-log', world: 'rainforest', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE fallen nurse-log token, no animals, no text' }),
    cell({ slug: 'tok-tree-hollow', world: 'rainforest', layer: 'L2', archetypes: ['reveal', 'seek'], kind: 'companion', brief: 'PLAY SCALE empty tree hollow token, no creature inside, no text' }),
    cell({ slug: 'tok-aerial-root', world: 'rainforest', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE dangling aerial-root token, still-life, no text' }),
    cell({ slug: 'tok-leaf-litter', world: 'rainforest', layer: 'L2', archetypes: ['seek'], kind: 'companion', brief: 'PLAY SCALE leaf-litter mound token, no insects required, no text' }),
    cell({ slug: 'ov-canopy-gap', world: 'rainforest', layer: 'L2', archetypes: ['overlay', 'reveal'], kind: 'overlay', brief: 'compact canopy-gap light shaft overlay atom, keyable, not a full background, no text' }),
    cell({ slug: 'tok-seed-pod', world: 'rainforest', layer: 'L2', archetypes: ['sequence'], kind: 'companion', brief: 'PLAY SCALE large tropical seed pod token, not fruit-as-food, no text' }),
  ]),
];

const HBA5_SHEETS = [
  ct('hba5-c1', 'reef tide companions 3x3 skip HAVE animals', 'black-contact-3x3', [
    cell({ slug: 'tok-table-coral', world: 'reef', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE table/plate coral furniture token, NO fish, not coral-brain vocab clone, no text' }),
    cell({ slug: 'tok-reef-arch', world: 'reef', layer: 'L2', archetypes: ['cutaway', 'route'], kind: 'companion', brief: 'PLAY SCALE empty reef-arch tunnel token, no fish inside, no text' }),
    cell({ slug: 'tok-sand-pocket', world: 'reef', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE sand pocket token, still-life, no text' }),
    cell({ slug: 'tok-fan-coral', world: 'reef', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE sea-fan coral wall token, no fish, no text' }),
    cell({ slug: 'tok-tide-basin', world: 'tide-pool', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE empty tide-pool basin rock token, no starfish (harvested), no text' }),
    cell({ slug: 'tok-barnacle-cluster', world: 'tide-pool', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE barnacle cluster token, still-life, no text' }),
    cell({ slug: 'tok-kelp-stipe', world: 'rocky-shore', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE kelp stipe token, still-life, no text' }),
    cell({ slug: 'tok-cleaning-rock', world: 'reef', layer: 'L2', archetypes: ['seek'], kind: 'companion', brief: 'PLAY SCALE empty cleaning-station rock token, no wrasse, no text' }),
    cell({ slug: 'tok-holdfast', world: 'rocky-shore', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE seaweed holdfast on rock token, no text' }),
  ]),
  ct('hba5-c2', 'grass tundra mangrove companions 3x3', 'black-contact-3x3', [
    cell({ slug: 'tok-termite-mound', world: 'grassland', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE large termite mound token, distinct from tiny anthill, no insects swarm, no text' }),
    cell({ slug: 'tok-grass-tuft', world: 'grassland', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE tall grass tuft token, still-life, no text' }),
    cell({ slug: 'tok-burrow-hole', world: 'grassland', layer: 'L2', archetypes: ['reveal'], kind: 'companion', brief: 'PLAY SCALE empty burrow-hole token, no animal, no text' }),
    cell({ slug: 'tok-watering-rim', world: 'grassland', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE watering-hole rim token, empty water, no animals, no text' }),
    cell({ slug: 'tok-tundra-mound', world: 'tundra', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE frost-heave tundra mound token, not an igloo, no text' }),
    cell({ slug: 'tok-lemming-burrow', world: 'tundra', layer: 'L2', archetypes: ['reveal'], kind: 'companion', brief: 'PLAY SCALE empty lemming burrow token, no animal, no text' }),
    cell({ slug: 'tok-willow-scrub', world: 'tundra', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE low arctic willow scrub token, still-life, no text' }),
    cell({ slug: 'tok-prop-roots', world: 'mangrove', layer: 'L2', archetypes: ['build-world', 'cutaway'], kind: 'companion', brief: 'PLAY SCALE mangrove prop-root cluster token, no crabs, no text' }),
    cell({ slug: 'tok-pneumatophores', world: 'mangrove', layer: 'L2', archetypes: ['build-world'], kind: 'companion', brief: 'PLAY SCALE pneumatophore peg roots token, still-life, no text' }),
  ]),
];

export const WAVES = {
  spa1: { id: 'spa1-water-l2', stream: 'A', family: 'science-process', partition: 'science-process', title: 'CW A — water cycle L2 stages (4 fullpage)', sheets: SPA1_SHEETS },
  spa2: { id: 'spa2-water-comp', stream: 'A', family: 'science-process', partition: 'science-process', title: 'CW A — water cycle tokens + overlays', sheets: SPA2_SHEETS },
  spa3: { id: 'spa3-life-l2', stream: 'A', family: 'science-process', partition: 'science-process', title: 'CW A — life-cycle L2 worlds (4 fullpage)', sheets: SPA3_SHEETS },
  spa4: { id: 'spa4-life-comp', stream: 'A', family: 'science-process', partition: 'science-process', title: 'CW A — life-cycle tokens (skip HAVE)', sheets: SPA4_SHEETS },
  spa5: { id: 'spa5-matter-l2', stream: 'A', family: 'science-process', partition: 'science-process', title: 'CW A — states of matter L2 worlds', sheets: SPA5_SHEETS },
  spa6: { id: 'spa6-matter-comp', stream: 'A', family: 'science-process', partition: 'science-process', title: 'CW A — states of matter tokens', sheets: SPA6_SHEETS },
  spa7: { id: 'spa7-weather-l2', stream: 'A', family: 'science-process', partition: 'science-process', title: 'CW A — weather formation L2 worlds', sheets: SPA7_SHEETS },
  spa8: { id: 'spa8-weather-comp', stream: 'A', family: 'science-process', partition: 'science-process', title: 'CW A — weather formation tokens', sheets: SPA8_SHEETS },
  spa9: { id: 'spa9-science-l3', stream: 'A', family: 'science-process', partition: 'science-process', title: 'CW A — science L3 adaptable worlds', sheets: SPA9_SHEETS },
  hba1: { id: 'hba1-biome-l2a', stream: 'B', family: 'habitats', partition: 'habitats', title: 'CW B — pond wetland rainforest L2', sheets: HBA1_SHEETS },
  hba2: { id: 'hba2-biome-l2b', stream: 'B', family: 'habitats', partition: 'habitats', title: 'CW B — reef tide grassland mangrove L2', sheets: HBA2_SHEETS },
  hba3: { id: 'hba3-biome-l3', stream: 'B', family: 'habitats', partition: 'habitats', title: 'CW B — tundra shore + L3 pond/reef', sheets: HBA3_SHEETS },
  hba4: { id: 'hba4-comp-a', stream: 'B', family: 'habitats', partition: 'habitats', title: 'CW B — pond rainforest companions', sheets: HBA4_SHEETS },
  hba5: { id: 'hba5-comp-b', stream: 'B', family: 'habitats', partition: 'habitats', title: 'CW B — reef grass tundra mangrove companions', sheets: HBA5_SHEETS },
};

export const WAVE_ORDER = ['spa1', 'spa2', 'spa3', 'spa4', 'spa5', 'spa6', 'spa7', 'spa8', 'spa9', 'hba1', 'hba2', 'hba3', 'hba4', 'hba5'];

const KIND_DIR = {
  stage: 'stages',
  'preset-world': 'preset-worlds',
  companion: 'companions',
  overlay: 'overlays',
};

function waveDir(wave) {
  return path.join(STOCKPILE, wave.partition, wave.id);
}

function familyDirs(partition) {
  const base = path.join(STOCKPILE, partition);
  return {
    base,
    stages: path.join(base, 'stages'),
    'preset-worlds': path.join(base, 'preset-worlds'),
    companions: path.join(base, 'companions'),
    overlays: path.join(base, 'overlays'),
    manifests: path.join(base, 'manifests'),
  };
}

function ensurePartition(partition) {
  const d = familyDirs(partition);
  for (const p of Object.values(d)) fs.mkdirSync(p, { recursive: true });
  return d;
}

function walkWaveDirs() {
  const out = [];
  for (const part of ['science-process', 'habitats']) {
    const base = path.join(STOCKPILE, part);
    if (!fs.existsSync(base)) continue;
    for (const ent of fs.readdirSync(base, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      if (['stages', 'preset-worlds', 'companions', 'overlays', 'manifests'].includes(ent.name)) continue;
      out.push(path.join(base, ent.name));
    }
  }
  return out;
}

function otherInFlight(thisWaveId) {
  for (const dir of walkWaveDirs()) {
    const runPath = path.join(dir, 'run.json');
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

function waveFinished(wave) {
  const runPath = path.join(waveDir(wave), 'run.json');
  if (!fs.existsSync(runPath)) return false;
  try {
    const prev = JSON.parse(fs.readFileSync(runPath, 'utf8'));
    const large = (prev.saved || []).filter((s) => s.bytes > LARGE_BYTES).length;
    return Boolean(prev.finished_at && large >= wave.sheets.length);
  } catch {
    return false;
  }
}

function openRun(wave) {
  const runPath = path.join(waveDir(wave), 'run.json');
  if (!fs.existsSync(runPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(runPath, 'utf8'));
  } catch {
    return null;
  }
}

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function sheetBlock(sheet, index) {
  const lines = sheet.cells.map((c, i) => `${i + 1}. ${c.key} [${c.layer}/${c.kind}] — ${c.brief}`);
  const layout =
    sheet.format === 'fullpage-landscape'
      ? 'ONE full-page 16:9 landscape PNG (not a grid, not a 2x2 contact of tiny stages)'
      : `${sheet.format} black-field contact, L→R T→B`;
  return `SHEET ${index} — ${sheet.title}\nLayout: ${layout}\n${lines.join('\n')}\nKeys: ${sheet.cells.map((c) => c.key).join(',')}`;
}

function buildBrief(wave) {
  const sheets = wave.sheets;
  const nFull = sheets.filter((s) => s.format === 'fullpage-landscape').length;
  const nContact = sheets.length - nFull;
  const kindLine = [
    nFull ? `${nFull} full-page world PNG(s)` : null,
    nContact ? `${nContact} black-field contact sheet(s)` : null,
  ]
    .filter(Boolean)
    .join(' + ');
  return withEslAssetGeneratorBrief(`TASK: Produce **${sheets.length} PNG(s)** (${kindLine}) for ClassIn ESL content-world stockpile STREAM ${wave.stream}.

${nFull ? STYLE_WORLD : ''}
${nContact ? STYLE_CONTACT : ''}

${DEDUPE}

STREAM ${wave.stream} — ${wave.family}. Prefix ${PREFIX} only.
HARD:
- Generate ONLY the listed cells. Do not research, broaden, add concepts, or write an essay.
- NO baked readable text. NO maps/flags/logos/worksheets. NO fused Mia/Leo/animals on worlds.
- Sequences/tokens, NOT textbook infographics.
- Keep generating inside THIS task until every listed PNG exists. 5-image cap is per generate_image call, not per task.

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

function emptyInv() {
  return {
    kind: 'content-worlds-ab',
    prefix: PREFIX,
    waves: {},
    running_total: {},
  };
}

function recomputeTotals(inv) {
  const waves = Object.values(inv.waves || {});
  const items = waves.flatMap((w) => w.items || []);
  inv.running_total = {
    tasks_used: waves.filter((w) => w.task_id).length,
    sheets_downloaded: waves.reduce((n, w) => n + (w.sheets || []).length, 0),
    l2: items.filter((it) => it.layer === 'L2').length,
    l3: items.filter((it) => it.layer === 'L3').length,
    pass: items.filter((it) => it.review_status === 'pass' || it.qa_status === 'PASS').length,
    raw: items.filter((it) => (it.review_status || 'raw') === 'raw').length,
    hold: items.filter((it) => it.review_status === 'hold' || it.qa_status === 'HOLD').length,
    assets: items.length,
  };
}

async function withInvLock(fn) {
  fs.mkdirSync(STOCKPILE, { recursive: true });
  for (let i = 0; i < 80; i += 1) {
    try {
      fs.writeFileSync(LOCK, String(process.pid), { flag: 'wx' });
      break;
    } catch {
      await sleep(80);
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
  if (!fs.existsSync(INV_PATH)) return emptyInv();
  try {
    return JSON.parse(fs.readFileSync(INV_PATH, 'utf8'));
  } catch {
    return emptyInv();
  }
}

function writeInv(inv) {
  inv.updated_at = new Date().toISOString();
  if (!inv.waves) inv.waves = {};
  recomputeTotals(inv);
  fs.mkdirSync(STOCKPILE, { recursive: true });
  fs.writeFileSync(INV_PATH, JSON.stringify(inv, null, 2));
  return INV_PATH;
}

function writeProvenance(wave, cell, dump, extra = {}) {
  const dirs = ensurePartition(wave.partition);
  const rec = {
    asset_id: cell.asset_id,
    content_world: cell.content_world,
    layer: cell.layer,
    archetypes: cell.archetypes,
    manus_task_id: dump.task_id || null,
    rights_status: 'original',
    review_status: extra.review_status || 'raw',
    kind: cell.kind,
    key: cell.key,
    wave: wave.id,
    sheet_id: extra.sheet_id || null,
    path: extra.path || null,
  };
  fs.writeFileSync(path.join(dirs.manifests, `${cell.asset_id}.json`), JSON.stringify(rec, null, 2));
  return rec;
}

function copyIntoLayer(wave, cell, srcPng) {
  if (!srcPng || !fs.existsSync(srcPng)) return null;
  const dirs = ensurePartition(wave.partition);
  const folder = KIND_DIR[cell.kind] || 'stages';
  const dest = path.join(dirs[folder], `${cell.asset_id}.png`);
  fs.copyFileSync(srcPng, dest);
  return dest;
}

function findSavedForCell(dump, cell, sheetIndex) {
  const saved = dump.saved || [];
  const needles = [cell.asset_id, cell.key, cell.concept].filter(Boolean).map((s) => String(s).toLowerCase());
  const hit = saved.find((s) => {
    const n = String(s.name || s.file || '').toLowerCase();
    return needles.some((nd) => n.includes(nd));
  });
  if (hit && hit.dest) return hit.dest;
  return saved[sheetIndex] && saved[sheetIndex].dest;
}

function upsertInventory(wave, dump) {
  const inv = loadInv();
  const haveLarge = (dump.saved || []).filter((s) => s.bytes > LARGE_BYTES).length >= wave.sheets.length;
  const items = [];
  wave.sheets.forEach((s, si) => {
    for (const c of s.cells) {
      const src = findSavedForCell(dump, c, si);
      let layerPath = null;
      if (s.format === 'fullpage-landscape' && src && haveLarge) {
        layerPath = copyIntoLayer(wave, c, src);
      }
      const rec = writeProvenance(wave, c, dump, {
        sheet_id: s.id,
        path: layerPath || dump.sheet_dir || null,
        review_status: haveLarge ? 'raw' : 'raw',
      });
      items.push({
        ...c,
        ...rec,
        status: haveLarge ? 'generated_raw' : dump.task_id ? 'fired' : 'pending',
        qa_status: null,
        sheet_id: s.id,
        manus_task_id: dump.task_id || null,
        path: layerPath || dump.sheet_dir || null,
      });
    }
  });
  inv.waves[wave.id] = {
    stream: wave.stream,
    family: wave.family,
    partition: wave.partition,
    title: wave.title,
    task_id: dump.task_id || null,
    task_url: dump.task_url || null,
    agent_status: dump.agent_status || null,
    sheet_dir: dump.sheet_dir || null,
    expected_sheets: wave.sheets.length,
    concept_count: items.length,
    sheets: (dump.saved || []).map((s) => ({ file: s.file || path.basename(s.dest || ''), bytes: s.bytes, name: s.name || null })),
    items,
    holds: dump.holds || [],
    finished_at: dump.finished_at || null,
  };
  const invPath = writeInv(inv);
  writeDocTotals(inv);
  return invPath;
}

function writeDocTotals(inv) {
  const docPath = path.join(ROOT, TRACKED_DOC_REL);
  let body = fs.existsSync(docPath) ? fs.readFileSync(docPath, 'utf8') : '';
  const tot = inv.running_total || {};
  const waveLines = Object.entries(inv.waves || {}).map(
    ([id, w]) => `- **${id}** stream ${w.stream || ''} — ${w.task_url || 'unfired'} — sheets ${w.expected_sheets || 0} — cells ${w.concept_count || 0}`,
  );
  const block = [
    '## Running totals',
    '',
    '| Metric | Count |',
    '|---|---:|',
    `| Tasks | ${tot.tasks_used || 0} |`,
    `| Sheets downloaded | ${tot.sheets_downloaded || 0} |`,
    `| L2 assets | ${tot.l2 || 0} |`,
    `| L3 assets | ${tot.l3 || 0} |`,
    `| PASS | ${tot.pass || 0} |`,
    `| RAW | ${tot.raw || 0} |`,
    `| HOLD | ${tot.hold || 0} |`,
    '',
    '## Waves',
    '',
    waveLines.length ? waveLines.join('\n') : '_none yet_',
    '',
  ].join('\n');
  if (body.includes('<!-- TOTALS:START -->') && body.includes('<!-- TOTALS:END -->')) {
    body = body.replace(/<!-- TOTALS:START -->[\s\S]*?<!-- TOTALS:END -->/, `<!-- TOTALS:START -->\n${block}\n<!-- TOTALS:END -->`);
  } else {
    body += `\n<!-- TOTALS:START -->\n${block}\n<!-- TOTALS:END -->\n`;
  }
  fs.writeFileSync(docPath, body);
}

export async function runWave(waveName, opts = {}) {
  const wave = WAVES[waveName];
  if (!wave) throw new Error(`Need --wave=${WAVE_ORDER.join('|')}`);

  ensurePartition(wave.partition);
  const OUT_DIR = waveDir(wave);
  const SHEET_DIR = path.join(OUT_DIR, 'sheets');
  const RUN_JSON = path.join(OUT_DIR, 'run.json');
  const fireOnly = process.argv.includes('--fire') || process.argv.includes('--create-only') || opts.fireOnly;
  const pollOnly = process.argv.includes('--poll-only') || opts.pollOnly;
  const sheets = wave.sheets;
  const NEED_SHEETS = sheets.length;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(SHEET_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, 'keys.json'),
    JSON.stringify(
      {
        wave: wave.id,
        stream: wave.stream,
        family: wave.family,
        partition: wave.partition,
        prefix: PREFIX,
        concept_count: sheets.reduce((n, s) => n + s.cells.length, 0),
        expected_sheets: NEED_SHEETS,
        sheets: sheets.map((s) => ({
          id: s.id,
          title: s.title,
          format: s.format,
          keys: s.cells.map((c) => c.key),
          layers: s.cells.map((c) => c.layer),
          archetypes: s.cells.map((c) => c.archetypes),
        })),
      },
      null,
      2,
    ),
  );

  const BRIEF = buildBrief(wave);
  let taskId = arg('task') || opts.taskId || '';
  const dump = {
    started_at: new Date().toISOString(),
    kind: 'content-worlds-ab',
    wave: wave.id,
    stream: wave.stream,
    family: wave.family,
    partition: wave.partition,
    sheet_dir: SHEET_DIR,
    concept_count: sheets.reduce((n, s) => n + s.cells.length, 0),
    expected_sheets: NEED_SHEETS,
  };

  if (!pollOnly) {
    if (fs.existsSync(RUN_JSON) && !process.env.MANUS_FORCE_RERUN) {
      const prev = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8'));
      if (prev.task_id) {
        console.error('REFUSING duplicate', prev.task_id);
        process.exitCode = 2;
        return prev;
      }
    }
    const busy = otherInFlight(wave.id);
    if (busy) {
      console.error(`REFUSING fire — max 1 in-flight. ${busy.wave} ${busy.task_id} still open`);
      process.exitCode = 3;
      return dump;
    }
    const created = await withRateBackoff(() =>
      createTask({
        title: wave.title,
        agent_profile: resolveAgentProfile(),
        force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
        interactive_mode: false,
        message: BRIEF,
      }),
    );
    taskId = created.task_id || created.id;
    dump.task_id = taskId;
    dump.task_url = created.task_url || `https://manus.im/app/${taskId}`;
    dump.created_at = new Date().toISOString();
    fs.writeFileSync(RUN_JSON, JSON.stringify({ ...dump, brief: BRIEF }, null, 2));
    await withInvLock(() => upsertInventory(wave, dump));
    console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: dump.task_url, wave: wave.id }, null, 2));
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

  let result = await pollGently(taskId);
  let msgs = await listMessagesBackoff(taskId, { order: 'asc', limit: 120, allowMissing: true });
  let saved = await downloadSheets(msgs.messages || result.messages || [], SHEET_DIR);
  let large = saved.filter((s) => s.bytes > LARGE_BYTES);

  if (large.length < NEED_SHEETS) {
    console.log(JSON.stringify({ phase: 'need-more-sheets', have: large.length, need: NEED_SHEETS }, null, 2));
    await withRateBackoff(() =>
      sendMessage(taskId, {
        force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
        message: withEslAssetGeneratorBrief(
          `Continue THIS task. You returned ${large.length} usable PNG(s); we need exactly ${NEED_SHEETS} PNG(s) listed in the original brief. Do not restart. Do not add text. Do not change the key list. Keep firing generate_image until every listed sheet exists.`,
        ),
      }),
    );
    result = await pollGently(taskId);
    msgs = await listMessagesBackoff(taskId, { order: 'asc', limit: 120, allowMissing: true });
    saved = await downloadSheets(msgs.messages || result.messages || [], SHEET_DIR);
    large = saved.filter((s) => s.bytes > LARGE_BYTES);
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
    dump.task_id = dump.task_id || prev.task_id;
  }
  fs.writeFileSync(RUN_JSON, JSON.stringify(dump, null, 2));
  const invPath = await withInvLock(() => upsertInventory(wave, dump));
  console.log(
    JSON.stringify(
      {
        phase: 'downloaded',
        wave: wave.id,
        stream: wave.stream,
        task_id: taskId,
        task_url: dump.task_url,
        count: saved.length,
        large: large.length,
        expected_sheets: NEED_SHEETS,
        sheet_dir: SHEET_DIR,
        inventory: invPath,
      },
      null,
      2,
    ),
  );
  if (large.length < NEED_SHEETS) process.exitCode = 2;
  return dump;
}

async function runLoop() {
  for (const name of WAVE_ORDER) {
    const wave = WAVES[name];
    if (waveFinished(wave)) {
      console.log(JSON.stringify({ phase: 'skip-done', wave: wave.id }, null, 2));
      continue;
    }
    const open = openRun(wave);
    if (open && open.task_id && !open.finished_at) {
      console.log(JSON.stringify({ phase: 'resume-poll', wave: wave.id, task_id: open.task_id }, null, 2));
      await runWave(name, { pollOnly: true, taskId: open.task_id });
      continue;
    }
    const busy = otherInFlight(wave.id);
    if (busy) {
      console.error(`REFUSING fire — max 1 in-flight. ${busy.wave} ${busy.task_id} still open`);
      process.exitCode = 3;
      return;
    }
    await runWave(name);
    await sleep(2000);
  }
}

const isMain = process.argv[1] && path.normalize(process.argv[1]).endsWith('request-cw-ab.mjs');
if (isMain) {
  apiKey();
  ensurePartition('science-process');
  ensurePartition('habitats');
  if (process.argv.includes('--loop')) {
    await runLoop();
  } else {
    const names = (arg('wave', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!names.length) throw new Error(`Need --wave=${WAVE_ORDER.join('|')} or --loop`);
    for (const n of names) await runWave(n);
  }
}
