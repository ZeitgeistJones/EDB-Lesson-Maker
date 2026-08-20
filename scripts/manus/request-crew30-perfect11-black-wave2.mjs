/**
 * Crew30 Perfect-11 BLACK soft+densify — ONE Manus createTask, 11× black 4×8 packs.
 * Soft under-dock leftovers (gashapon/castle/aquarium/tree/space) + densifiers
 * (kitchen/sports/bathroom/school/farm/music). Manus does 5+5+1 inside this task.
 *
 *   node scripts/manus/request-crew30-perfect11-black-wave2.mjs
 *   node scripts/manus/request-crew30-perfect11-black-wave2.mjs --dry-run
 *
 * Pattern: scripts/manus/request-strike-11.mjs
 * Collect: node scripts/manus/fetch-task-assets.mjs --task=<id> --out=tmp/manus-crew30-perfect11-black-wave2
 * Import portrait packs with --grid=8x4 (rows×cols).
 *
 * NOTE: An earlier densify-only black task SaS9uiN3fhfinkTYgjZChC used different themes;
 * this script is the interrupt-aligned soft+densify list. Set MANUS_FORCE_RERUN=1 to
 * overwrite run.json when re-firing.
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT,
  createTask,
  MANUS_SKILLS,
  resolveAgentProfile,
  withEslAssetGeneratorBrief,
  apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-crew30-perfect11-black-wave2');
const OUT_JSON = path.join(OUT_DIR, 'run.json');
const PREV_JSON = path.join(OUT_DIR, 'run-densify-v1.json');

const SHEETS = [
  { id: '1', theme: 'soft-gashapon', grid: '4x8' },
  { id: '2', theme: 'castle-soft-props', grid: '4x8' },
  { id: '3', theme: 'aquarium-soft', grid: '4x8' },
  { id: '4', theme: 'tree-nature-soft', grid: '4x8' },
  { id: '5', theme: 'space-soft-leftovers', grid: '4x8' },
  { id: '6', theme: 'kitchen-objects-dense', grid: '4x8' },
  { id: '7', theme: 'sports-equipment-dense', grid: '4x8' },
  { id: '8', theme: 'bathroom-objects-dense', grid: '4x8' },
  { id: '9', theme: 'school-supplies-dense', grid: '4x8' },
  { id: '10', theme: 'farm-tools-dense', grid: '4x8' },
  { id: '11', theme: 'music-instruments-dense', grid: '4x8' },
];

const BRIEF = withEslAssetGeneratorBrief(`PERFECT-11 BLACK PROP — SOFT UNDER-DOCK + DENSIFIERS

Use esl-asset-generator to finish the WHOLE list in 3 batches (5+5+1). Do not stop after batch 1.

SOURCE OF TRUTH: Read /home/ubuntu/skills/esl-asset-generator/SKILL.md immediately. If this prompt conflicts with the skill, follow the skill.

EXECUTION: Mode 2 (4x8 grid) for the 11 themes below — black-field cutout packs for PropBank / docks. NOT white vocab icons.

THE 5+5+1 BATCH RULE (CRITICAL — ONE MANUS TASK):
Put the FULL 11-sheet list below in this task. Fire generate_image in three batches inside THIS single task:
  Batch 1 → sheets 1–5
  Batch 2 → sheets 6–10
  Batch 3 → sheet 11
The 5-image limit is per generate_image CALL, not per task. Do not stop after batch 1. Do not open a second Manus task. Finish all 11 PNGs here. Completion = count sheet PNGs against the list.

HARD RULES:
- quality: default only (never high)
- model: nano-banana-pro
- 100% text-free (no letters, numbers, logos, brand marks on any tile)
- No grid lines / graph paper / grey gutters painted on the sheet
- VOID BLACK (#000000) background edge-to-edge
- Flat educational / matte 2-tone vector (base + one shade). NOT glossy emoji, NOT photo, NOT grey cards behind objects
- OBJECTS only — NO people figures, NO face-icon sheets
- ONE THEME PER SHEET — do not mix topics across cells on the same PNG
- Grid: **4 columns × 8 rows = 32** distinct props when you can fill them cleanly; else **4×4 = 16**. Never pad with duplicates or off-theme fillers
- Portrait pack preferred (import uses --grid=8x4 for 8 rows × 4 cols)
- Soft sheets (1–5): make each prop LARGE and sharp for dock cutouts (≥120px readable silhouette) — replace mushy soft-blob leftovers with clear matte shapes

THEMES (32 atomic objects each when fillable):
SHEET 1: SOFT GASHAPON — capsule toys / prize-machine leftovers as sharp dock props: capsule, gashapon-machine, toy-robot, toy-car, toy-dino, toy-bear, keychain-charm, sticker-sheet-blank, marble, spinning-top, yo-yo, rubber-duck, mini-figure-blank, prize-ticket-blank, claw-crane-arm, coin-slot, prize-box, plastic-egg, collector-case, toy-sword, toy-wand, toy-crown, puzzle-piece, building-block, dice, card-deck-blank, stamp-blank, badge-blank, whistle-toy, balloon-animal-shape, glitter-jar, stickers-roll
SHEET 2: CASTLE SOFT PROPS — crown, shield, sword, key, door, torch, tower-roof, flag, drawbridge, portcullis, throne, goblet, banquet-plate, scroll-blank, quill, ink-pot, helmet, breastplate, gauntlet, banner-blank, stone-brick, spiral-stair, dungeon-chain, treasure-chest, gem, coin-stack, map-blank, spyglass, rope-ladder, catapult, battering-ram, castle-wall-section
SHEET 3: AQUARIUM SOFT — fish-bowl, aquarium-tank, coral, seaweed, seashell, starfish, seahorse, clownfish, goldfish, turtle, crab, jellyfish, octopus, bubble-wand, net, gravel, air-pump, filter, thermometer, fish-food-flakes (blank tin), castle-ornament, treasure-chest-ornament, diving-mask, snorkel, flippers, life-ring, anchor, lighthouse-model, pier-post, water-bucket, scoop-net, plant-ornament
SHEET 4: TREE NATURE SOFT — tree, pine, oak-leaf, maple-leaf, acorn, pinecone, nest, birdhouse, branch, stump, log, mushroom, flower, sunflower, daisy, tulip, watering-can, garden-rake, trowel, seed-packet-blank, bird, butterfly, bee, squirrel, hedgehog, moss-rock, woodpecker-hole-log, swing-rope, hammock, picnic-blanket, basket, apple
SHEET 5: SPACE SOFT LEFTOVERS — rocket, spaceship, satellite, astronaut-helmet (helmet only), spacesuit (empty hung), planet, moon, star, comet, asteroid, UFO, alien-plush, telescope, observatory-dome, constellation-card-blank, orbit-ring, solar-panel, space-station-module, rover, flag-on-moon-blank, meteor, crater-model, galaxy-swirl, nebula-cloud, rocket-fuel-tank, control-panel-blank, joystick, headset, boot-print, oxygen-tank, antenna, star-map-blank
SHEET 6: KITCHEN OBJECTS DENSE — oven, fridge, sink, kettle, toaster, blender, microwave, mixer, pan, pot, colander, ladle, spatula, tongs, peeler, grater, can-opener, bottle-opener, rolling-pin, measuring-cups, cutting-board, kitchen-knife, whisk, timer, dish-rack, sponge, dish-soap-bottle-blank, trash-bin, apron, oven-mitt, mixing-bowl, spoon
SHEET 7: SPORTS EQUIPMENT DENSE — whistle, soccer-ball, basketball, tennis-ball, baseball, bat, racket, cone, goal-net, jump-rope, dumbbell, kettlebell, yoga-mat, stopwatch, medal, trophy, jersey-blank, scoreboard-blank, helmet, knee-pad, shin-guard, water-bottle, towel, gym-bag, resistance-band, foam-roller, bike-helmet, skateboard, frisbee, hula-hoop, finish-line-banner-blank, starting-block
SHEET 8: BATHROOM OBJECTS DENSE — toothbrush, toothpaste-tube-blank, floss, soap, soap-dispenser, shampoo-bottle-blank, conditioner-bottle-blank, towel, washcloth, bath-sponge, loofah, comb, hairbrush, razor, mouthwash-bottle-blank, mirror, sink, faucet, bathtub, shower-head, toilet, toilet-paper, scale, bath-mat, robe-hook, cup-holder, laundry-hamper, plunger, toilet-brush, bath-duck, nail-clippers, cotton-swabs-jar
SHEET 9: SCHOOL SUPPLIES DENSE — backpack, pencil-case, pencil, pen, eraser, sharpener, ruler, protractor, compass-tool, glue-stick, scissors, stapler, hole-puncher, binder, notebook, textbook-blank, clipboard, highlighter, sticky-notes, paper-clips, whiteboard-marker, chalk, chalkboard-eraser, globe, abacus, calculator-blank, flashcards-blank, desk-organizer, lunchbox, water-bottle, desk-bell, name-tag-blank
SHEET 10: FARM TOOLS DENSE — tractor, pitchfork, shovel, rake, hoe, watering-can, wheelbarrow, barn, hay-bale, scarecrow, hen-egg, corn, milk-pail, feed-bag-blank, chicken-coop, fence-post, horseshoe, saddle, bridle, shears, axe, wood-saw, rope-coil, lantern, barn-door, silo, pumpkin, carrot, apple-crate, boot, straw-hat, work-glove
SHEET 11: MUSIC INSTRUMENTS DENSE — guitar, violin, cello, flute, clarinet, saxophone, trumpet, trombone, drum, drumsticks, cymbal, piano-keys, keyboard, harmonica, xylophone, recorder, tambourine, maracas, triangle, bell, metronome, music-stand, bow, guitar-pick, capo, tuner, amp, microphone-stand, headphones, sheet-music-blank, instrument-case, microphone

Generate all 11 sheets before delivering. Deliver as 11 separate PNGs with a text legend (cell names in chat only — not painted on art). Execute now.`);

fs.mkdirSync(OUT_DIR, { recursive: true });

const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = {
  started_at: new Date().toISOString(),
  agent_profile: profile,
  force_skills: force,
  quality: 'default',
  batch: '5+5+1 inside one createTask',
  bg: '#000000',
  grid: '4x8',
  kind: 'soft-under-dock-plus-densifiers',
  sheets: SHEETS,
  brief_starts_with: BRIEF.slice(0, 240),
  import_hint:
    'After download: npm run assets:prop (or import-prop) with --grid=8x4 for portrait 8×4 packs',
};

if (DRY) {
  fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, dry_run: true, brief: BRIEF }, null, 2));
  console.log(JSON.stringify({ phase: 'dry-run', out_dir: OUT_DIR, sheet_count: SHEETS.length }, null, 2));
  process.exit(0);
}

if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) {
    // Same soft theme list already fired → refuse. Different densify-v1 → archive + continue.
    const prevThemes = (prev.sheets || []).map((s) => s.theme).join('|');
    const nextThemes = SHEETS.map((s) => s.theme).join('|');
    if (prevThemes === nextThemes) {
      console.error(`REFUSING duplicate black Perfect-11 — already have task ${prev.task_id}`);
      console.log(JSON.stringify({ phase: 'refused_duplicate', ...prev }, null, 2));
      process.exit(2);
    }
    fs.writeFileSync(PREV_JSON, JSON.stringify(prev, null, 2));
    console.error(
      `Archived prior black run ${prev.task_id} → run-densify-v1.json (different theme list; re-firing soft+densify)`,
    );
  }
}

apiKey();
console.error(`Creating black Perfect-11 soft+densify (ONE task, 5+5+1 inside)… profile=${profile}`);

const created = await createTask({
  title: 'ESL Perfect-11 BLACK soft+densify: gashapon→music (5+5+1 one task)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});

const taskId = created.task_id || created.id || null;
const dump = {
  ...dumpBase,
  task_id: taskId,
  task_url: created.task_url || (taskId ? `https://manus.im/app/${taskId}` : null),
  task_url_alt: taskId ? `https://manus.im/app?taskId=${taskId}` : null,
  prior_densify_v1_task_id: 'SaS9uiN3fhfinkTYgjZChC',
  created,
  errors: [],
};
fs.writeFileSync(OUT_JSON, JSON.stringify(dump, null, 2));

console.log(
  JSON.stringify(
    {
      phase: 'created',
      task_id: taskId,
      task_url: dump.task_url,
      sheet_count: SHEETS.length,
      themes: SHEETS.map((s) => s.theme),
      out_dir: OUT_DIR,
    },
    null,
    2,
  ),
);
