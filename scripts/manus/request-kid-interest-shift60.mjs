/**
 * Shift60 — kid-interest props + overview-worlds stockpile.
 * Stockpile only. No producer wiring. PNG under harvested/ — do NOT git-add.
 *
 *   node scripts/manus/request-kid-interest-shift60.mjs --audit-only
 *   node scripts/manus/request-kid-interest-shift60.mjs --wave=ki-pets-variation --fire
 *   node scripts/manus/request-kid-interest-shift60.mjs --wave=ki-pets-variation --poll-only
 *   node scripts/manus/request-kid-interest-shift60.mjs --next --fire
 *   node scripts/manus/request-kid-interest-shift60.mjs --doc-only
 *
 * Concurrency: prefer 3 in-flight across this stockpile (hard refuse at 5).
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

export const KI_REL = 'harvested/kid-interest';
export const OW_REL = 'harvested/overview-worlds';
export const TRACKED_DOC_REL = 'docs/kid-interest-shift60-log.md';
export const INV_REL = 'docs/kid-interest-shift60-inventory.json';
export const AUDIT_MD = 'docs/kid-interest-audit.md';
export const PORTFOLIO_JSON = 'docs/kid-interest-portfolio.json';
export const PREFIX = 'ki-';
export const OW_PREFIX = 'ow-';
export const BOARD = { width: 1280, height: 590 };
export const MAX_IN_FLIGHT = 5;
export const PREFER_IN_FLIGHT = 5;

const KI_ROOT = path.join(ROOT, KI_REL);
const OW_ROOT = path.join(ROOT, OW_REL);
const LOCK = path.join(KI_ROOT, '.inv-ki.lock');
const POLL_MS = 30_000;
const TIMEOUT_MS = 70 * 60 * 1000;
const RATE_WAIT_MS = 90_000;

const STYLE = `STYLE LOCK: ONE coherent child-friendly ClassIn ESL house style — clean sparse vector / soft-matte educational illustration. Same line weight, palette, padding. No photorealism, no glossy 3D, no sticker-pack chaos.
TEXT LOCK: BLANK / text-free. No English words, captions, labels, letters, numbers, logos, brands, UI chrome, fake readable screens, watermarks.
IP LOCK: NO brands, NO licensed characters, NO social logos, NO Pokémon-like creatures, NO branded consoles/controllers with logos.
AGE LOCK: Pre-A1→B2 age-respectful — modern hobbies OK; not preschool-only baby toys for teen-adjacent hobbies.
STOCKPILE LOCK: raw Manus sheets only. Do not wire into lessons/producer.
QUALITY: default only.
SCALE: BOARD-SCALE pieces for a ~${BOARD.width}×${BOARD.height} ClassIn board.`;

const CUTOUT = `BLACK-FIELD CUTOUT contact sheet — pure #000000 black edge-to-edge with clear gutters. One concept per cell. Nothing crosses cell boundaries. Empty unused cells stay pure black. Isolated still-life on black. Generous margin. BOARD-SCALE (not icons). No people/faces.`;

const OVERVIEW = `FULL-PAGE OVERVIEW WORLD — one landscape PNG (~16:9, board-readable). Multi-zone explorable place (3–7 clear zones) with paths and open negative space for drag play. NOT a technical map, NOT a dense micro-city, NOT a contact grid. No people as subjects. No text/labels/logos/map symbols. One visual identity. Soft children's-book illustration. Projected ClassIn readability.`;

function cell(family, slug, brief, extra = {}) {
  return {
    key: `${PREFIX}${family}-${slug}`,
    concept: `${family}-${slug}`,
    brief,
    ...extra,
  };
}

function owCell(slug, brief) {
  return {
    key: `${OW_PREFIX}${slug}`,
    concept: slug,
    brief,
  };
}

function sh(id, title, format, cells) {
  return { id, title, format, cells };
}

function wave(id, opts) {
  return {
    id,
    family_id: opts.family_id || id,
    title: opts.title,
    lane: opts.lane,
    stockpile: opts.stockpile || 'kid-interest',
    bucket: opts.bucket || opts.lane,
    in_prompt_named: Boolean(opts.in_prompt_named),
    novelty: opts.novelty || (opts.in_prompt_named ? 'prompt-direction' : 'discovered-new'),
    why: opts.why || '',
    sheets: opts.sheets,
  };
}

/** Prompt-named direction vs NEW discovery tracked per wave. */
export const WAVES = {
  'ki-pets-variation': wave('ki-pets-variation', {
    lane: 'pets',
    bucket: 'pets',
    in_prompt_named: true,
    title: 'KI pets body-types + pet-life (3×3 ×3)',
    why: 'PARTIAL pets — need distinguishable body types + gear, not breed trivia',
    sheets: [
      sh('S1', 'dog body types 3x3', 'black-contact-3x3', [
        cell('pets', 'dog-short-stocky', `${CUTOUT} Short stocky dog body type, friendly, readable silhouette.`),
        cell('pets', 'dog-tall-slim', `${CUTOUT} Tall slim dog body type.`),
        cell('pets', 'dog-fluffy-round', `${CUTOUT} Fluffy round dog body type.`),
        cell('pets', 'dog-long-low', `${CUTOUT} Long low dachshund-like body type (generic, not brand).`),
        cell('pets', 'dog-pointy-ear', `${CUTOUT} Pointy-ear alert dog body type.`),
        cell('pets', 'dog-floppy-ear', `${CUTOUT} Floppy-ear soft dog body type.`),
        cell('pets', 'puppy-small', `${CUTOUT} Small puppy still-life.`),
        cell('pets', 'dog-lying', `${CUTOUT} Dog lying relaxed pose still-life.`),
        cell('pets', 'dog-sitting', `${CUTOUT} Dog sitting still-life.`),
      ]),
      sh('S2', 'cat + other pets 3x3', 'black-contact-3x3', [
        cell('pets', 'cat-sleek', `${CUTOUT} Sleek short-hair cat.`),
        cell('pets', 'cat-fluffy', `${CUTOUT} Fluffy long-hair cat.`),
        cell('pets', 'kitten', `${CUTOUT} Kitten.`),
        cell('pets', 'hamster', `${CUTOUT} Hamster.`),
        cell('pets', 'rabbit', `${CUTOUT} Rabbit.`),
        cell('pets', 'guinea-pig', `${CUTOUT} Guinea pig.`),
        cell('pets', 'goldfish-bowl', `${CUTOUT} Goldfish in simple round bowl (no logos).`),
        cell('pets', 'turtle', `${CUTOUT} Pet turtle.`),
        cell('pets', 'budgie-perch', `${CUTOUT} Budgie/parakeet on perch.`),
      ]),
      sh('S3', 'pet-life gear 3x3', 'black-contact-3x3', [
        cell('pets', 'pet-carrier', `${CUTOUT} Soft pet carrier bag/crate, board-scale.`),
        cell('pets', 'food-bowl', `${CUTOUT} Pet food bowl.`),
        cell('pets', 'water-bowl', `${CUTOUT} Pet water bowl.`),
        cell('pets', 'leash-collar', `${CUTOUT} Leash + collar set.`),
        cell('pets', 'litter-box', `${CUTOUT} Litter box (clean, tasteful).`),
        cell('pets', 'scratching-post', `${CUTOUT} Cat scratching post.`),
        cell('pets', 'bird-cage', `${CUTOUT} Simple bird cage empty-ish with perch.`),
        cell('pets', 'aquarium-tank', `${CUTOUT} Small aquarium tank (blank glass, no logos).`),
        cell('pets', 'pet-bed', `${CUTOUT} Soft pet bed.`),
      ]),
    ],
  }),

  'ki-creator-digital': wave('ki-creator-digital', {
    lane: 'gaming-digital',
    bucket: 'gaming-digital',
    in_prompt_named: true,
    title: 'KI creator + unbranded gaming (3×3 ×3)',
    why: 'THIN gaming/creator — ring-light/green-screen missing; no brands/UI',
    sheets: [
      sh('S1', 'unbranded gaming 3x3', 'black-contact-3x3', [
        cell('game', 'controller-standard', `${CUTOUT} Unbranded game controller, blank face buttons as shapes only.`),
        cell('game', 'controller-alt', `${CUTOUT} Second unbranded controller shape (different silhouette).`),
        cell('game', 'handheld-console', `${CUTOUT} Unbranded handheld console, blank screen (NO logos/UI).`),
        cell('game', 'vr-headset', `${CUTOUT} Unbranded VR headset.`),
        cell('game', 'gaming-headset', `${CUTOUT} Over-ear gaming headset mic boom.`),
        cell('game', 'blank-monitor', `${CUTOUT} Computer monitor with BLANK soft glow screen — no UI, no text.`),
        cell('game', 'keyboard', `${CUTOUT} Keyboard (no readable legends).`),
        cell('game', 'mouse', `${CUTOUT} Computer mouse.`),
        cell('game', 'chair-gaming', `${CUTOUT} Simple gaming chair (no logos).`),
      ]),
      sh('S2', 'creator video kit 3x3', 'black-contact-3x3', [
        cell('creator', 'ring-light', `${CUTOUT} Ring light on stand.`),
        cell('creator', 'webcam', `${CUTOUT} Webcam on clip.`),
        cell('creator', 'boom-mic', `${CUTOUT} Boom microphone on arm.`),
        cell('creator', 'camera-on-tripod', `${CUTOUT} Camera on tripod.`),
        cell('creator', 'softbox-light', `${CUTOUT} Softbox light.`),
        cell('creator', 'laptop-blank', `${CUTOUT} Laptop open with BLANK screen.`),
        cell('creator', 'tablet-blank', `${CUTOUT} Tablet with BLANK screen.`),
        cell('creator', 'headphones-studio', `${CUTOUT} Studio headphones.`),
        cell('creator', 'pop-filter', `${CUTOUT} Mic pop filter.`),
      ]),
      sh('S3', 'creator NEW actions/gear 3x3', 'black-contact-3x3', [
        cell('creator', 'green-screen-stand', `${CUTOUT} Green screen cloth on stand (no logos). NEW.`),
        cell('creator', 'stop-motion-rig', `${CUTOUT} Simple stop-motion camera arm over table (no people). NEW.`),
        cell('creator', 'karaoke-mic', `${CUTOUT} Karaoke-style handheld mic.`),
        cell('creator', 'mic-stand', `${CUTOUT} Microphone stand empty clip.`),
        cell('creator', 'cable-coil', `${CUTOUT} Neat cable coil board-scale.`),
        cell('creator', 'clapperboard-blank', `${CUTOUT} Clapperboard with ZERO letters/numbers.`),
        cell('creator', 'reflector-disk', `${CUTOUT} Photo reflector disk.`),
        cell('creator', 'gimbal', `${CUTOUT} Handheld gimbal stabilizer.`),
        cell('creator', 'sd-card-holder', `${CUTOUT} Small memory-card case (no logos/text).`),
      ]),
    ],
  }),

  'ki-leisure-vehicles': wave('ki-leisure-vehicles', {
    lane: 'vehicles-leisure',
    bucket: 'vehicles-leisure',
    in_prompt_named: true,
    title: 'KI leisure vehicles (3×3 ×3)',
    why: 'MISSING go-kart / bumper / pedal boat depth',
    sheets: [
      sh('S1', 'kart + fair vehicles 3x3', 'black-contact-3x3', [
        cell('veh', 'go-kart', `${CUTOUT} Unbranded go-kart, readable, board-scale.`),
        cell('veh', 'bumper-car', `${CUTOUT} Bumper car (no logos).`),
        cell('veh', 'pedal-boat', `${CUTOUT} Pedal boat / swan-boat generic.`),
        cell('veh', 'mini-train-car', `${CUTOUT} Mini amusement train car.`),
        cell('veh', 'snow-tube', `${CUTOUT} Inflatable snow tube.`),
        cell('veh', 'sled', `${CUTOUT} Classic sled.`),
        cell('veh', 'gondola-cabin', `${CUTOUT} Gondola cabin.`),
        cell('veh', 'carousel-horse', `${CUTOUT} Single carousel horse (no logos).`),
        cell('veh', 'water-ride-boat', `${CUTOUT} Simple water-ride boat.`),
      ]),
      sh('S2', 'boards + wheels 3x3', 'black-contact-3x3', [
        cell('veh', 'skateboard', `${CUTOUT} Skateboard (blank deck, no logos).`),
        cell('veh', 'longboard', `${CUTOUT} Longboard.`),
        cell('veh', 'scooter-kick', `${CUTOUT} Kick scooter.`),
        cell('veh', 'roller-skates', `${CUTOUT} Roller skates pair.`),
        cell('veh', 'inline-skates', `${CUTOUT} Inline skates.`),
        cell('veh', 'surfboard', `${CUTOUT} Surfboard.`),
        cell('veh', 'bodyboard', `${CUTOUT} Bodyboard.`),
        cell('veh', 'paddleboard', `${CUTOUT} Stand-up paddleboard + paddle.`),
        cell('veh', 'bmx-bike', `${CUTOUT} BMX-style bike unbranded. NEW.`),
      ]),
      sh('S3', 'ramps + ride gear 3x3', 'black-contact-3x3', [
        cell('veh', 'skate-ramp-quarter', `${CUTOUT} Quarter-pipe skate ramp piece.`),
        cell('veh', 'skate-rail', `${CUTOUT} Skate grind rail.`),
        cell('veh', 'helmet', `${CUTOUT} Safety helmet.`),
        cell('veh', 'knee-pads', `${CUTOUT} Knee pads.`),
        cell('veh', 'life-jacket', `${CUTOUT} Life jacket.`),
        cell('veh', 'unicycle', `${CUTOUT} Unicycle. NEW.`),
        cell('veh', 'pogo-stick', `${CUTOUT} Pogo stick. NEW.`),
        cell('veh', 'stilts', `${CUTOUT} Pair of stilts. NEW.`),
        cell('veh', 'balance-bike', `${CUTOUT} Balance bike. NEW.`),
      ]),
    ],
  }),

  'ki-crafts-sensory': wave('ki-crafts-sensory', {
    lane: 'crafts-maker',
    bucket: 'crafts-maker',
    in_prompt_named: true,
    title: 'KI crafts sensory + actions (3×3 ×3)',
    why: 'THIN crafts — slime/origami missing; need action still-lifes',
    sheets: [
      sh('S1', 'slime clay sensory 3x3', 'black-contact-3x3', [
        cell('craft', 'slime-tub', `${CUTOUT} Open slime tub with slime blob.`),
        cell('craft', 'slime-stretch', `${CUTOUT} Stretching slime strand (still-life, no hands).`),
        cell('craft', 'clay-block', `${CUTOUT} Modeling clay block.`),
        cell('craft', 'clay-tools', `${CUTOUT} Clay tool set.`),
        cell('craft', 'pottery-wheel', `${CUTOUT} Pottery wheel with clay mound.`),
        cell('craft', 'bead-tray', `${CUTOUT} Bead tray.`),
        cell('craft', 'yarn-ball', `${CUTOUT} Yarn ball + needles.`),
        cell('craft', 'origami-stack', `${CUTOUT} Stack of colorful origami paper. NEW.`),
        cell('craft', 'glue-scissors', `${CUTOUT} Glue bottle + scissors pair.`),
      ]),
      sh('S2', 'maker build 3x3', 'black-contact-3x3', [
        cell('craft', 'cardboard-fort', `${CUTOUT} Cardboard fort/box structure. NEW.`),
        cell('craft', 'paint-set', `${CUTOUT} Paint set + brush.`),
        cell('craft', 'embroidery-hoop', `${CUTOUT} Embroidery hoop. NEW.`),
        cell('craft', 'friendship-loom', `${CUTOUT} Friendship-bracelet loom. NEW.`),
        cell('craft', 'sand-art-bottle', `${CUTOUT} Layered sand art bottle. NEW.`),
        cell('craft', 'face-paint-palette', `${CUTOUT} Face paint palette. NEW.`),
        cell('craft', 'rubber-stamp-set', `${CUTOUT} Rubber stamp set (blank stamps, no letters).`),
        cell('craft', 'model-glider', `${CUTOUT} Simple model glider. NEW.`),
        cell('craft', 'tape-measure', `${CUTOUT} Tape measure (no readable numbers).`),
      ]),
      sh('S3', 'craft ACTIONS still-life 3x3', 'black-contact-3x3', [
        cell('craft', 'action-pour', `${CUTOUT} Still-life of pouring slime/liquid mid-pour (no hands).`),
        cell('craft', 'action-mix', `${CUTOUT} Mixing bowl mid-stir (spoon in bowl, no hands).`),
        cell('craft', 'action-roll', `${CUTOUT} Rolling pin on clay slab.`),
        cell('craft', 'action-cut', `${CUTOUT} Scissors mid-cut on paper strip.`),
        cell('craft', 'action-fold', `${CUTOUT} Paper mid-fold origami.`),
        cell('craft', 'action-glue', `${CUTOUT} Glue being applied as a bead line on paper.`),
        cell('craft', 'action-paint', `${CUTOUT} Paintbrush mid-stroke on paper.`),
        cell('craft', 'action-thread', `${CUTOUT} Bead being threaded on string.`),
        cell('craft', 'action-build', `${CUTOUT} Cardboard pieces being stacked mid-build.`),
      ]),
    ],
  }),

  'ki-sports-active': wave('ki-sports-active', {
    lane: 'sports',
    bucket: 'sports',
    in_prompt_named: true,
    title: 'KI active sports gear beyond balls (3×3 ×3)',
    why: 'THIN badminton/kayak/gym/martial — skip endless balls',
    sheets: [
      sh('S1', 'racket court water 3x3', 'black-contact-3x3', [
        cell('sport', 'badminton-racket', `${CUTOUT} Badminton racket.`),
        cell('sport', 'shuttlecock', `${CUTOUT} Shuttlecock.`),
        cell('sport', 'tennis-racket', `${CUTOUT} Tennis racket.`),
        cell('sport', 'kayak', `${CUTOUT} Kayak.`),
        cell('sport', 'paddle', `${CUTOUT} Kayak paddle.`),
        cell('sport', 'frisbee', `${CUTOUT} Frisbee disk.`),
        cell('sport', 'kite', `${CUTOUT} Colorful kite.`),
        cell('sport', 'fishing-rod', `${CUTOUT} Fishing rod + reel.`),
        cell('sport', 'climbing-holds', `${CUTOUT} Cluster of climbing holds (board-scale).`),
      ]),
      sh('S2', 'gym martial winter 3x3', 'black-contact-3x3', [
        cell('sport', 'gym-rings', `${CUTOUT} Gymnastics rings hanging.`),
        cell('sport', 'balance-beam', `${CUTOUT} Short balance beam.`),
        cell('sport', 'martial-belt', `${CUTOUT} Martial arts belt rolled (no rank text).`),
        cell('sport', 'martial-pads', `${CUTOUT} Focus pads / sparring pads.`),
        cell('sport', 'snowboard', `${CUTOUT} Snowboard.`),
        cell('sport', 'skis-poles', `${CUTOUT} Pair of skis + poles.`),
        cell('sport', 'ice-skates', `${CUTOUT} Ice skates.`),
        cell('sport', 'trampoline-mat', `${CUTOUT} Mini trampoline.`),
        cell('sport', 'chalk-bag', `${CUTOUT} Climbing chalk bag.`),
      ]),
      sh('S3', 'discovered sports 3x3', 'black-contact-3x3', [
        cell('sport', 'archery-bow', `${CUTOUT} Archery bow. NEW.`),
        cell('sport', 'archery-target', `${CUTOUT} Archery target (rings as shapes, no numbers). NEW.`),
        cell('sport', 'fencing-mask', `${CUTOUT} Fencing mask. NEW.`),
        cell('sport', 'fencing-foil', `${CUTOUT} Fencing foil. NEW.`),
        cell('sport', 'lacrosse-stick', `${CUTOUT} Lacrosse stick. NEW.`),
        cell('sport', 'hockey-stick', `${CUTOUT} Ice hockey stick. NEW.`),
        cell('sport', 'hockey-puck', `${CUTOUT} Hockey puck.`),
        cell('sport', 'parkour-box', `${CUTOUT} Parkour vault box. NEW.`),
        cell('sport', 'cheer-poms', `${CUTOUT} Cheer pom-poms pair. NEW.`),
      ]),
    ],
  }),

  'ki-discovered-clubs': wave('ki-discovered-clubs', {
    lane: 'other-discovered',
    bucket: 'other-discovered',
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'KI discovered kid clubs / mid-obscure (3×3 ×3)',
    why: '≥40% novelty — magic, marble-run, DJ, science kits NOT named in prompt',
    sheets: [
      sh('S1', 'play clubs 3x3', 'black-contact-3x3', [
        cell('disc', 'marble-run-tower', `${CUTOUT} Marble run tower section. NEW.`),
        cell('disc', 'marbles-set', `${CUTOUT} Set of marbles.`),
        cell('disc', 'magic-hat', `${CUTOUT} Magician hat.`),
        cell('disc', 'magic-wand', `${CUTOUT} Magic wand.`),
        cell('disc', 'magic-cards-blank', `${CUTOUT} Stack of blank-faced cards (no suits/letters).`),
        cell('disc', 'juggling-clubs', `${CUTOUT} Juggling clubs.`),
        cell('disc', 'yo-yo', `${CUTOUT} Yo-yo.`),
        cell('disc', 'bubble-machine', `${CUTOUT} Bubble machine.`),
        cell('disc', 'pinata', `${CUTOUT} Piñata shape blank (no logos/text).`),
      ]),
      sh('S2', 'tech clubs 3x3', 'black-contact-3x3', [
        cell('disc', 'dj-deck', `${CUTOUT} Unbranded DJ deck with blank pads (no logos/UI text). NEW.`),
        cell('disc', 'synth-keyboard', `${CUTOUT} Small synth keyboard (no readable labels). NEW.`),
        cell('disc', 'drum-pad', `${CUTOUT} Electronic drum pad. NEW.`),
        cell('disc', 'walkie-pair', `${CUTOUT} Pair of walkie-talkies. NEW.`),
        cell('disc', 'rc-car', `${CUTOUT} Unbranded RC car. NEW.`),
        cell('disc', 'robot-kit-large', `${CUTOUT} Large simple robot kit body.`),
        cell('disc', 'telescope-tripod', `${CUTOUT} Telescope on tripod.`),
        cell('disc', 'binoculars', `${CUTOUT} Binoculars.`),
        cell('disc', 'weather-station', `${CUTOUT} Kid weather station (blank dials, no numbers readable). NEW.`),
      ]),
      sh('S3', 'science collect 3x3', 'black-contact-3x3', [
        cell('disc', 'fossil-dig-tray', `${CUTOUT} Fossil dig tray with brush. NEW.`),
        cell('disc', 'fossil-bone', `${CUTOUT} Fossil bone specimen.`),
        cell('disc', 'terrarium-jar', `${CUTOUT} Closed terrarium jar. NEW.`),
        cell('disc', 'ant-farm', `${CUTOUT} Ant farm side-view panel. NEW.`),
        cell('disc', 'crystal-jar', `${CUTOUT} Crystal growing jar. NEW.`),
        cell('disc', 'volcano-model', `${CUTOUT} Volcano science model. NEW.`),
        cell('disc', 'rock-tumbler', `${CUTOUT} Rock tumbler (no logos). NEW.`),
        cell('disc', 'gem-pouch', `${CUTOUT} Small gem pouch with stones.`),
        cell('disc', 'stamp-album', `${CUTOUT} Stamp album closed (blank cover, no text). NEW.`),
      ]),
    ],
  }),

  'ki-music-life': wave('ki-music-life', {
    lane: 'music',
    bucket: 'music',
    in_prompt_named: true,
    title: 'KI music-life kit (not more identical guitars)',
    why: 'PARTIAL music-life — stands/headphones/amp as a kit',
    sheets: [
      sh('S1', 'music life 3x3', 'black-contact-3x3', [
        cell('music', 'mic-on-stand', `${CUTOUT} Microphone on stand.`),
        cell('music', 'amp-blank', `${CUTOUT} Guitar amp blank grille (no logos/text).`),
        cell('music', 'headphones', `${CUTOUT} Over-ear headphones.`),
        cell('music', 'music-stand', `${CUTOUT} Sheet music stand EMPTY (no paper text).`),
        cell('music', 'instrument-case', `${CUTOUT} Hard instrument case closed.`),
        cell('music', 'guitar-strap', `${CUTOUT} Guitar strap.`),
        cell('music', 'drumsticks', `${CUTOUT} Pair of drumsticks.`),
        cell('music', 'capo', `${CUTOUT} Guitar capo board-scale.`),
        cell('music', 'tuner-clip', `${CUTOUT} Clip tuner (blank face, no numbers).`),
      ]),
      sh('S2', 'readable instruments top-up 3x3', 'black-contact-3x3', [
        cell('music', 'sax', `${CUTOUT} Saxophone.`),
        cell('music', 'trumpet', `${CUTOUT} Trumpet.`),
        cell('music', 'flute', `${CUTOUT} Flute.`),
        cell('music', 'ukulele', `${CUTOUT} Ukulele.`),
        cell('music', 'violin', `${CUTOUT} Violin + bow.`),
        cell('music', 'drum-kit-compact', `${CUTOUT} Compact drum kit.`),
        cell('music', 'xylophone', `${CUTOUT} Xylophone (no letter labels).`),
        cell('music', 'tambourine', `${CUTOUT} Tambourine.`),
        cell('music', 'harmonica', `${CUTOUT} Harmonica.`),
      ]),
    ],
  }),

  'ki-hobby-social': wave('ki-hobby-social', {
    lane: 'hobbies',
    bucket: 'hobbies',
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'KI social hobby kits (sleepover/fort/stand) NEW-heavy',
    why: 'Kid social life depth — pillow fort, lemonade stand, projector',
    sheets: [
      sh('S1', 'sleepover fort 3x3', 'black-contact-3x3', [
        cell('hobby', 'sleeping-bag', `${CUTOUT} Sleeping bag.`),
        cell('hobby', 'pillow-fort', `${CUTOUT} Pillow fort structure. NEW.`),
        cell('hobby', 'blanket-fort', `${CUTOUT} Blanket draped fort.`),
        cell('hobby', 'flashlight', `${CUTOUT} Flashlight.`),
        cell('hobby', 'board-game-box', `${CUTOUT} Board game box blank (no title text).`),
        cell('hobby', 'dice-set', `${CUTOUT} Dice set (pips OK as dots, no numbers as digits).`),
        cell('hobby', 'playing-cards-blank', `${CUTOUT} Playing cards blank backs stack.`),
        cell('hobby', 'popcorn-bowl', `${CUTOUT} Popcorn bowl.`),
        cell('hobby', 'projector-sheet', `${CUTOUT} Backyard projector + blank sheet. NEW.`),
      ]),
      sh('S2', 'club life 3x3', 'black-contact-3x3', [
        cell('hobby', 'lemonade-stand', `${CUTOUT} Lemonade stand cart (blank signs — ZERO letters). NEW.`),
        cell('hobby', 'bike-repair-stand', `${CUTOUT} Bike on repair stand. NEW.`),
        cell('hobby', 'hammock', `${CUTOUT} Hammock.`),
        cell('hobby', 'treasure-chest', `${CUTOUT} Treasure chest.`),
        cell('hobby', 'compass', `${CUTOUT} Compass (blank dial).`),
        cell('hobby', 'medal-blank', `${CUTOUT} Medal blank (no text).`),
        cell('hobby', 'trophy-blank', `${CUTOUT} Trophy blank (no text).`),
        cell('hobby', 'science-fair-board', `${CUTOUT} Science fair tri-fold board BLANK. NEW.`),
        cell('hobby', 'badge-sash', `${CUTOUT} Club sash with blank badge shapes.`),
      ]),
    ],
  }),

  'ow-wave1-three-worlds': wave('ow-wave1-three-worlds', {
    stockpile: 'overview-worlds',
    lane: 'overview',
    bucket: 'leisure',
    family_id: `${OW_PREFIX}wave1`,
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'OW wave1 — skate plaza + lakeside marina + maker fair (FULL-PAGE ×3)',
    why: 'MISSING overview-worlds portfolio; full-page never contact-grid',
    sheets: [
      sh('S1', 'skate plaza overview', 'full-page-overview', [
        owCell(
          'skate-plaza',
          `${OVERVIEW} Skate plaza complex: bowl, street pad with rail, quarter-pipe, bench shade zone, open path. 5 zones. Generous empty pads for drag play. No graffiti letters. No people.`,
        ),
      ]),
      sh('S2', 'lakeside marina overview', 'full-page-overview', [
        owCell(
          'lakeside-marina',
          `${OVERVIEW} Lakeside marina village: wooden docks, small boat yard, shore path, blank cafe terrace, open plaza. 5 zones. Clear destinations. No text/flags. No people.`,
        ),
      ]),
      sh('S3', 'maker fair overview', 'full-page-overview', [
        owCell(
          'maker-fair',
          `${OVERVIEW} Outdoor maker fair campus: booth row, demo stage, tool tent, picnic lawn, connecting path. 5 zones. Blank banners (no letters). No people. Kid-club energy.`,
        ),
      ]),
    ],
  }),

  'ow-wave2-adventure': wave('ow-wave2-adventure', {
    stockpile: 'overview-worlds',
    lane: 'overview',
    bucket: 'nature-adventure',
    family_id: `${OW_PREFIX}wave2`,
    in_prompt_named: false,
    novelty: 'mixed',
    title: 'OW wave2 — island cove + observatory + treehouse forest (FULL-PAGE ×3)',
    why: 'Breadth of adventure/fantasy overviews; 2/3 discovered-new',
    sheets: [
      sh('S1', 'island cove overview', 'full-page-overview', [
        owCell(
          'island-cove',
          `${OVERVIEW} Island adventure cove: sandy beach, rocky cove, trail inland, lookout rock, tide-pool shelf. 5 zones. Open sand for play. No people/text.`,
        ),
      ]),
      sh('S2', 'observatory ridge overview', 'full-page-overview', [
        owCell(
          'observatory-ridge',
          `${OVERVIEW} Observatory ridge: dome building, winding path, lookout deck, picnic clearing, forest trail edge. 5 zones. Night-friendly soft dusk OK. No people/text. NEW.`,
        ),
      ]),
      sh('S3', 'treehouse forest overview', 'full-page-overview', [
        owCell(
          'treehouse-forest',
          `${OVERVIEW} Treehouse forest village: multiple treehouses, rope bridges, ground clearing, stream crossing, trail. 5 zones. Fantasy-light not scary. No people/text. NEW.`,
        ),
      ]),
    ],
  }),

  'ow-wave3-town-event': wave('ow-wave3-town-event', {
    stockpile: 'overview-worlds',
    lane: 'overview',
    bucket: 'town-community',
    family_id: `${OW_PREFIX}wave3`,
    in_prompt_named: true,
    title: 'OW wave3 — winter festival + community campus + harbor market (FULL-PAGE ×3)',
    why: 'Event + town community overviews',
    sheets: [
      sh('S1', 'winter festival overview', 'full-page-overview', [
        owCell(
          'winter-festival',
          `${OVERVIEW} Winter festival village: square, blank stall row, ice rink oval, glowing tree (no ornaments with logos), connecting path. 5 zones. No people/text.`,
        ),
      ]),
      sh('S2', 'community center campus', 'full-page-overview', [
        owCell(
          'community-center',
          `${OVERVIEW} Community center campus: gym block, outdoor pool edge, courtyard, club-room wing, path network. 5 zones. Blank signage shapes only. No people/text.`,
        ),
      ]),
      sh('S3', 'harbor night market', 'full-page-overview', [
        owCell(
          'harbor-night-market',
          `${OVERVIEW} Harbor night market: pier, stall lights, moored small boats, square, path. 5 zones. Warm evening light. Blank signs. No people/text. NEW.`,
        ),
      ]),
    ],
  }),

  /** ——— AGGRO WAVE2+ (breadth; ≥40% discovered-new) ——— */

  'ki-dance-stage': wave('ki-dance-stage', {
    lane: 'hobbies',
    bucket: 'hobbies',
    in_prompt_named: true,
    title: 'KI dance + performance props (3×3 ×3)',
    why: 'THIN dance/performance — mic/karaoke adjacent, stage props',
    sheets: [
      sh('S1', 'dance gear 3x3', 'black-contact-3x3', [
        cell('dance', 'ballet-slippers', `${CUTOUT} Ballet slippers pair.`),
        cell('dance', 'tap-shoes', `${CUTOUT} Tap shoes.`),
        cell('dance', 'dance-leotard', `${CUTOUT} Simple dance leotard on hanger (no logos).`),
        cell('dance', 'tutu', `${CUTOUT} Tutu skirt.`),
        cell('dance', 'ribbon-wand', `${CUTOUT} Ribbon wand.`),
        cell('dance', 'maracas', `${CUTOUT} Maracas pair.`),
        cell('dance', 'tambourine-dance', `${CUTOUT} Tambourine.`),
        cell('dance', 'spot-light', `${CUTOUT} Stage spotlight.`),
        cell('dance', 'stage-curtains', `${CUTOUT} Stage curtain pair swag.`),
      ]),
      sh('S2', 'karaoke theater 3x3', 'black-contact-3x3', [
        cell('dance', 'karaoke-mic', `${CUTOUT} Karaoke handheld mic.`),
        cell('dance', 'mic-stand-boom', `${CUTOUT} Boom mic stand.`),
        cell('dance', 'speaker-blank', `${CUTOUT} PA speaker blank (no logos/text).`),
        cell('dance', 'mask-comedy', `${CUTOUT} Theater comedy mask.`),
        cell('dance', 'mask-tragedy', `${CUTOUT} Theater tragedy mask.`),
        cell('dance', 'prop-sword-safe', `${CUTOUT} Soft prop sword (toy, not weapon-scary).`),
        cell('dance', 'script-blank', `${CUTOUT} Script booklet BLANK pages (no letters).`),
        cell('dance', 'spotlight-floor', `${CUTOUT} Floor spotlight pool shape.`),
        cell('dance', 'costume-trunk', `${CUTOUT} Open costume trunk.`),
      ]),
      sh('S3', 'cheer baton NEW 3x3', 'black-contact-3x3', [
        cell('dance', 'baton-twirl', `${CUTOUT} Twirling baton. NEW.`),
        cell('dance', 'cheer-megaphone', `${CUTOUT} Cheer megaphone blank (no letters). NEW.`),
        cell('dance', 'pompom-pair', `${CUTOUT} Cheer pom-poms.`),
        cell('dance', 'marching-drum', `${CUTOUT} Marching snare drum.`),
        cell('dance', 'color-guard-flag', `${CUTOUT} Color-guard flag blank (no emblems). NEW.`),
        cell('dance', 'dance-floor-tile', `${CUTOUT} Dance floor tile panel.`),
        cell('dance', 'ballet-barre', `${CUTOUT} Ballet barre segment.`),
        cell('dance', 'mirror-panel', `${CUTOUT} Studio mirror panel blank.`),
        cell('dance', 'score-board-blank', `${CUTOUT} Scoreboard shape ZERO numerals/letters.`),
      ]),
    ],
  }),

  'ki-waterpark-splash': wave('ki-waterpark-splash', {
    lane: 'vehicles-leisure',
    bucket: 'vehicles-leisure',
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'KI waterpark splash gear NEW (3×3 ×3)',
    why: 'NEW mid-obscure leisure — not named in prompt',
    sheets: [
      sh('S1', 'splash gear 3x3', 'black-contact-3x3', [
        cell('splash', 'inner-tube', `${CUTOUT} Swim inner tube.`),
        cell('splash', 'water-slide-raft', `${CUTOUT} Double water-slide raft.`),
        cell('splash', 'noodles', `${CUTOUT} Pool noodles pair.`),
        cell('splash', 'kickboard', `${CUTOUT} Swim kickboard.`),
        cell('splash', 'goggles', `${CUTOUT} Swim goggles.`),
        cell('splash', 'snorkel-mask', `${CUTOUT} Snorkel + mask.`),
        cell('splash', 'beach-ball', `${CUTOUT} Beach ball.`),
        cell('splash', 'water-gun-toy', `${CUTOUT} Toy water blaster (friendly, unbranded).`),
        cell('splash', 'bucket-scoop', `${CUTOUT} Beach bucket + scoop.`),
      ]),
      sh('S2', 'park modules 3x3', 'black-contact-3x3', [
        cell('splash', 'slide-curve', `${CUTOUT} Curved water-slide segment (board-scale module).`),
        cell('splash', 'splash-pad', `${CUTOUT} Splash pad with fountain jets.`),
        cell('splash', 'lazy-river-curve', `${CUTOUT} Lazy-river curve channel piece.`),
        cell('splash', 'lifeguard-chair', `${CUTOUT} Lifeguard chair.`),
        cell('splash', 'pool-ladder', `${CUTOUT} Pool ladder.`),
        cell('splash', 'diving-board', `${CUTOUT} Diving board.`),
        cell('splash', 'umbrella-table', `${CUTOUT} Pool umbrella + table.`),
        cell('splash', 'locker-blank', `${CUTOUT} Pool locker blank (no numbers).`),
        cell('splash', 'towel-stack', `${CUTOUT} Towel stack.`),
      ]),
      sh('S3', 'float animals 3x3', 'black-contact-3x3', [
        cell('splash', 'float-flamingo', `${CUTOUT} Flamingo pool float.`),
        cell('splash', 'float-unicorn', `${CUTOUT} Unicorn pool float (generic).`),
        cell('splash', 'float-donut', `${CUTOUT} Donut pool float.`),
        cell('splash', 'float-alligator', `${CUTOUT} Alligator pool float.`),
        cell('splash', 'arm-floaties', `${CUTOUT} Arm floaties pair.`),
        cell('splash', 'swim-vest', `${CUTOUT} Child swim vest.`),
        cell('splash', 'waterfall-prop', `${CUTOUT} Small decorative waterfall prop.`),
        cell('splash', 'misting-arch', `${CUTOUT} Misting arch.`),
        cell('splash', 'coin-locker-key', `${CUTOUT} Oversized locker key fob blank.`),
      ]),
    ],
  }),

  'ki-collect-curios': wave('ki-collect-curios', {
    lane: 'other-discovered',
    bucket: 'other-discovered',
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'KI collecting curios NEW (3×3 ×3)',
    why: 'Collections lane THIN — invent mid-obscure collector kits',
    sheets: [
      sh('S1', 'collector kits 3x3', 'black-contact-3x3', [
        cell('curio', 'coin-album', `${CUTOUT} Coin album closed blank cover.`),
        cell('curio', 'coin-magnifier', `${CUTOUT} Magnifying glass over coin.`),
        cell('curio', 'stamp-tweezers', `${CUTOUT} Stamp tweezers + blank stamp.`),
        cell('curio', 'display-case', `${CUTOUT} Small glass display case.`),
        cell('curio', 'trading-binder', `${CUTOUT} Trading-card binder blank (no logos/art IP).`),
        cell('curio', 'pin-board', `${CUTOUT} Cork pin board with blank enamel pins.`),
        cell('curio', 'sticker-sheet-blank', `${CUTOUT} Sticker sheet with abstract shapes only (no letters/logos).`),
        cell('curio', 'shadow-box', `${CUTOUT} Shadow box frame.`),
        cell('curio', 'label-maker-blank', `${CUTOUT} Label maker device blank screen (no text).`),
      ]),
      sh('S2', 'nature collect 3x3', 'black-contact-3x3', [
        cell('curio', 'seashell-set', `${CUTOUT} Seashell collection set.`),
        cell('curio', 'feather-jar', `${CUTOUT} Jar of feathers.`),
        cell('curio', 'pressed-flower-book', `${CUTOUT} Pressed-flower book blank.`),
        cell('curio', 'leaf-press', `${CUTOUT} Leaf press.`),
        cell('curio', 'bug-jar', `${CUTOUT} Bug observation jar.`),
        cell('curio', 'rock-tray', `${CUTOUT} Rock specimen tray.`),
        cell('curio', 'geode-half', `${CUTOUT} Geode half.`),
        cell('curio', 'fossil-print', `${CUTOUT} Fossil imprint stone.`),
        cell('curio', 'seed-packet-blank', `${CUTOUT} Seed packet blank (no letters).`),
      ]),
      sh('S3', 'kid museum 3x3', 'black-contact-3x3', [
        cell('curio', 'mini-museum-shelf', `${CUTOUT} Mini museum shelf with blank placards.`),
        cell('curio', 'ticket-stub-blank', `${CUTOUT} Ticket stub blank (no text).`),
        cell('curio', 'lanyard-badge', `${CUTOUT} Lanyard + blank badge.`),
        cell('curio', 'camera-instant', `${CUTOUT} Instant camera blank (no logos), blank photo.`),
        cell('curio', 'scrapbook', `${CUTOUT} Scrapbook closed blank.`),
        cell('curio', 'wasabi-tape-rolls', `${CUTOUT} Washi tape rolls (pattern only, no letters).`),
        cell('curio', 'enamel-pin-set', `${CUTOUT} Enamel pin set abstract shapes.`),
        cell('curio', 'keychain-charms', `${CUTOUT} Keychain charm cluster.`),
        cell('curio', 'memory-box', `${CUTOUT} Memory keepsake box.`),
      ]),
    ],
  }),

  'ki-circus-skills': wave('ki-circus-skills', {
    lane: 'other-discovered',
    bucket: 'other-discovered',
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'KI circus skills NEW (3×3 ×3)',
    why: 'Unusual kid clubs — circus arts not in prompt',
    sheets: [
      sh('S1', 'circus props 3x3', 'black-contact-3x3', [
        cell('circus', 'diabolo', `${CUTOUT} Diabolo + handsticks.`),
        cell('circus', 'spinning-plate', `${CUTOUT} Spinning plate on stick.`),
        cell('circus', 'flower-stick', `${CUTOUT} Flower stick set.`),
        cell('circus', 'juggling-balls', `${CUTOUT} Three juggling balls.`),
        cell('circus', 'juggling-rings', `${CUTOUT} Juggling rings.`),
        cell('circus', 'hula-hoop', `${CUTOUT} Hula hoop.`),
        cell('circus', 'tightrope-stand', `${CUTOUT} Low practice tightrope + stands.`),
        cell('circus', 'mini-trampoline', `${CUTOUT} Mini trampoline.`),
        cell('circus', 'clown-nose', `${CUTOUT} Red clown nose (friendly).`),
      ]),
      sh('S2', 'balance roll 3x3', 'black-contact-3x3', [
        cell('circus', 'balance-board', `${CUTOUT} Balance board.`),
        cell('circus', 'rolla-bolla', `${CUTOUT} Rolla-bolla board + cylinder.`),
        cell('circus', 'slackline', `${CUTOUT} Slackline strap + tree anchors.`),
        cell('circus', 'gym-ball', `${CUTOUT} Large exercise ball.`),
        cell('circus', 'handstand-canes', `${CUTOUT} Handstand canes.`),
        cell('circus', 'crash-mat', `${CUTOUT} Crash mat.`),
        cell('circus', 'spotting-belt', `${CUTOUT} Spotting belt.`),
        cell('circus', 'ribbon-streamer', `${CUTOUT} Long ribbon streamer.`),
        cell('circus', 'circus-trunk', `${CUTOUT} Circus prop trunk.`),
      ]),
      sh('S3', 'show extras 3x3', 'black-contact-3x3', [
        cell('circus', 'spotlight-follow', `${CUTOUT} Follow-spot light.`),
        cell('circus', 'ticket-booth', `${CUTOUT} Tiny ticket booth blank signs.`),
        cell('circus', 'big-top-peak', `${CUTOUT} Circus tent peak module.`),
        cell('circus', 'bleacher-section', `${CUTOUT} Short bleacher section.`),
        cell('circus', 'cotton-candy-cart', `${CUTOUT} Cotton candy cart blank.`),
        cell('circus', 'balloon-animals', `${CUTOUT} Balloon animal cluster.`),
        cell('circus', 'unicycle-circus', `${CUTOUT} Circus unicycle.`),
        cell('circus', 'stilts-circus', `${CUTOUT} Tall stilts.`),
        cell('circus', 'safety-net', `${CUTOUT} Safety net panel.`),
      ]),
    ],
  }),

  'ki-makerspace-large': wave('ki-makerspace-large', {
    lane: 'crafts-maker',
    bucket: 'crafts-maker',
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'KI makerspace LARGE tools NEW (3×3 ×3)',
    why: 'Maker depth beyond slime — board-scale tools, not micro fasteners',
    sheets: [
      sh('S1', 'makerspace tools 3x3', 'black-contact-3x3', [
        cell('make', 'hot-glue-gun', `${CUTOUT} Hot glue gun.`),
        cell('make', 'craft-knife-safe', `${CUTOUT} Safety craft knife (rounded educational look).`),
        cell('make', 'cutting-mat', `${CUTOUT} Cutting mat blank grid (no numbers).`),
        cell('make', 'ruler-blank', `${CUTOUT} Ruler blank (no numerals).`),
        cell('make', 'clamp-large', `${CUTOUT} Large spring clamp (board-scale, not tiny).`),
        cell('make', 'workbench', `${CUTOUT} Small workbench.`),
        cell('make', 'pegboard', `${CUTOUT} Pegboard with blank hooks.`),
        cell('make', 'toolbox', `${CUTOUT} Toolbox open.`),
        cell('make', 'safety-goggles', `${CUTOUT} Safety goggles.`),
      ]),
      sh('S2', 'build materials 3x3', 'black-contact-3x3', [
        cell('make', 'cardboard-sheets', `${CUTOUT} Cardboard sheet stack.`),
        cell('make', 'foam-blocks', `${CUTOUT} Foam craft blocks.`),
        cell('make', 'wood-dowels', `${CUTOUT} Wood dowel bundle.`),
        cell('make', 'pipe-cleaners', `${CUTOUT} Pipe cleaner bundle.`),
        cell('make', 'duct-tape-rolls', `${CUTOUT} Duct tape rolls.`),
        cell('make', 'zip-ties-large', `${CUTOUT} Oversized zip-tie loop (board-scale).`),
        cell('make', 'wheel-set', `${CUTOUT} Craft wheel set.`),
        cell('make', 'servo-motor-large', `${CUTOUT} Large simple hobby motor (no logos).`),
        cell('make', 'battery-pack-blank', `${CUTOUT} Battery pack blank (no text).`),
      ]),
      sh('S3', 'robot fair 3x3', 'black-contact-3x3', [
        cell('make', 'robot-chassis', `${CUTOUT} Simple robot chassis.`),
        cell('make', 'robot-arm', `${CUTOUT} Simple robot arm.`),
        cell('make', 'sensor-eye', `${CUTOUT} Friendly robot sensor eye module.`),
        cell('make', 'led-strip', `${CUTOUT} LED strip coil.`),
        cell('make', 'breadboard-large', `${CUTOUT} Oversized breadboard (no tiny pins focus).`),
        cell('make', '3d-printer-small', `${CUTOUT} Small 3D printer blank screen (no UI text).`),
        cell('make', 'filament-spool', `${CUTOUT} Filament spool.`),
        cell('make', 'prototype-car', `${CUTOUT} Cardboard prototype car.`),
        cell('make', 'trophy-maker', `${CUTOUT} Maker-fair trophy blank.`),
      ]),
    ],
  }),

  'ki-outdoor-adventure-gear': wave('ki-outdoor-adventure-gear', {
    lane: 'sports',
    bucket: 'sports',
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'KI outdoor adventure gear NEW (3×3 ×3)',
    why: 'Skip camping clone — zipline/geocache/trail kits not in prompt',
    sheets: [
      sh('S1', 'trail kit 3x3', 'black-contact-3x3', [
        cell('out', 'zipline-trolley', `${CUTOUT} Zipline trolley on cable segment.`),
        cell('out', 'climbing-harness', `${CUTOUT} Climbing harness.`),
        cell('out', 'carabiner-large', `${CUTOUT} Oversized carabiner (board-scale).`),
        cell('out', 'helmet-climb', `${CUTOUT} Climbing helmet.`),
        cell('out', 'rope-coil', `${CUTOUT} Climbing rope coil.`),
        cell('out', 'trail-map-blank', `${CUTOUT} Folded map blank (no roads/text).`),
        cell('out', 'whistle', `${CUTOUT} Safety whistle.`),
        cell('out', 'headlamp', `${CUTOUT} Headlamp.`),
        cell('out', 'hydration-pack', `${CUTOUT} Hydration backpack.`),
      ]),
      sh('S2', 'geo nature 3x3', 'black-contact-3x3', [
        cell('out', 'geocache-box', `${CUTOUT} Geocache box.`),
        cell('out', 'gps-handheld-blank', `${CUTOUT} Handheld GPS blank screen (no UI).`),
        cell('out', 'compass-lid', `${CUTOUT} Compass with blank dial.`),
        cell('out', 'field-notebook', `${CUTOUT} Field notebook blank.`),
        cell('out', 'insect-net', `${CUTOUT} Insect net.`),
        cell('out', 'sample-vials', `${CUTOUT} Sample vials rack.`),
        cell('out', 'plant-id-cards', `${CUTOUT} Plant ID cards blank illustrations only.`),
        cell('out', 'sit-pad', `${CUTOUT} Foam sit pad.`),
        cell('out', 'trekking-poles', `${CUTOUT} Trekking poles pair.`),
      ]),
      sh('S3', 'snow play NEW 3x3', 'black-contact-3x3', [
        cell('out', 'snowball-maker', `${CUTOUT} Snowball maker mold.`),
        cell('out', 'snow-bricks', `${CUTOUT} Snow brick molds.`),
        cell('out', 'igloo-block', `${CUTOUT} Igloo block module.`),
        cell('out', 'snow-shovel-kid', `${CUTOUT} Kid snow shovel.`),
        cell('out', 'saucer-sled', `${CUTOUT} Saucer sled.`),
        cell('out', 'ski-goggles', `${CUTOUT} Ski goggles.`),
        cell('out', 'hand-warmers', `${CUTOUT} Hand warmer packs.`),
        cell('out', 'thermos', `${CUTOUT} Thermos bottle.`),
        cell('out', 'trail-marker-flag', `${CUTOUT} Trail marker flag blank.`),
      ]),
    ],
  }),

  'ki-pet-training': wave('ki-pet-training', {
    lane: 'pets',
    bucket: 'pets',
    in_prompt_named: true,
    title: 'KI pet training + care extras (3×3 ×2)',
    why: 'Pet-life depth — training gear beyond body types',
    sheets: [
      sh('S1', 'training gear 3x3', 'black-contact-3x3', [
        cell('ptrain', 'clicker', `${CUTOUT} Pet training clicker.`),
        cell('ptrain', 'treat-pouch', `${CUTOUT} Treat pouch.`),
        cell('ptrain', 'agility-hoop', `${CUTOUT} Dog agility hoop.`),
        cell('ptrain', 'agility-tunnel', `${CUTOUT} Dog agility tunnel.`),
        cell('ptrain', 'agility-weave', `${CUTOUT} Weave pole set.`),
        cell('ptrain', 'frisbee-dog', `${CUTOUT} Soft dog frisbee.`),
        cell('ptrain', 'rope-toy', `${CUTOUT} Rope chew toy.`),
        cell('ptrain', 'ball-launcher', `${CUTOUT} Ball throw launcher.`),
        cell('ptrain', 'grooming-brush', `${CUTOUT} Pet grooming brush.`),
      ]),
      sh('S2', 'care extras 3x3', 'black-contact-3x3', [
        cell('ptrain', 'nail-clippers', `${CUTOUT} Pet nail clippers board-scale.`),
        cell('ptrain', 'shampoo-bottle', `${CUTOUT} Pet shampoo bottle blank.`),
        cell('ptrain', 'towel-pet', `${CUTOUT} Pet drying towel.`),
        cell('ptrain', 'carrier-backpack', `${CUTOUT} Pet backpack carrier.`),
        cell('ptrain', 'harness', `${CUTOUT} Pet harness.`),
        cell('ptrain', 'id-tag-blank', `${CUTOUT} ID tag blank (no text).`),
        cell('ptrain', 'vet-kit', `${CUTOUT} Soft pet first-aid pouch.`),
        cell('ptrain', 'scale-pet', `${CUTOUT} Pet scale blank display.`),
        cell('ptrain', 'trophy-agility', `${CUTOUT} Agility trophy blank.`),
      ]),
    ],
  }),

  'ki-tabletop-party': wave('ki-tabletop-party', {
    lane: 'hobbies',
    bucket: 'hobbies',
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'KI tabletop + party games NEW (3×3 ×3)',
    why: 'Board/card THIN — invent party/tabletop without IP',
    sheets: [
      sh('S1', 'tabletop 3x3', 'black-contact-3x3', [
        cell('table', 'chess-set', `${CUTOUT} Chess set compact.`),
        cell('table', 'checkers', `${CUTOUT} Checkers board + pieces.`),
        cell('table', 'dominoes', `${CUTOUT} Dominoes set.`),
        cell('table', 'jenga-tower', `${CUTOUT} Block-stacking tower (generic, no logos).`),
        cell('table', 'spinner', `${CUTOUT} Game spinner blank.`),
        cell('table', 'timer-sand', `${CUTOUT} Sand timer.`),
        cell('table', 'pawn-set', `${CUTOUT} Colored pawn set.`),
        cell('table', 'tile-rack', `${CUTOUT} Tile rack blank tiles (no letters).`),
        cell('table', 'scorepad-blank', `${CUTOUT} Score pad blank (no writing).`),
      ]),
      sh('S2', 'party games 3x3', 'black-contact-3x3', [
        cell('table', 'charades-hat', `${CUTOUT} Charades slip hat.`),
        cell('table', 'blindfold', `${CUTOUT} Soft blindfold.`),
        cell('table', 'party-horn', `${CUTOUT} Party horn.`),
        cell('table', 'confetti-popper', `${CUTOUT} Confetti popper.`),
        cell('table', 'piñata-stick', `${CUTOUT} Piñata stick.`),
        cell('table', 'ring-toss', `${CUTOUT} Ring toss set.`),
        cell('table', 'bean-bags', `${CUTOUT} Bean bags.`),
        cell('table', 'cornhole-board', `${CUTOUT} Cornhole board.`),
        cell('table', 'balloon-dart-blank', `${CUTOUT} Balloon dart board blank (no scores).`),
      ]),
      sh('S3', 'sleepover extras 3x3', 'black-contact-3x3', [
        cell('table', 'truth-bottle', `${CUTOUT} Spin-the-bottle (friendly).`),
        cell('table', 'fortune-teller-paper', `${CUTOUT} Paper fortune teller blank flaps.`),
        cell('table', 'glow-sticks', `${CUTOUT} Glow sticks bundle.`),
        cell('table', 'fairy-lights', `${CUTOUT} Fairy light string.`),
        cell('table', 'polaroid-stack', `${CUTOUT} Blank photo stack.`),
        cell('table', 'snack-tray', `${CUTOUT} Snack tray.`),
        cell('table', 'movie-tickets-blank', `${CUTOUT} Movie tickets blank.`),
        cell('table', 'remote-blank', `${CUTOUT} TV remote blank (no logos/text).`),
        cell('table', 'beanbag-chair', `${CUTOUT} Beanbag chair.`),
      ]),
    ],
  }),

  'ow-wave4-play-districts': wave('ow-wave4-play-districts', {
    stockpile: 'overview-worlds',
    lane: 'overview',
    bucket: 'leisure',
    family_id: `${OW_PREFIX}wave4`,
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'OW wave4 — sports complex + waterpark + shopping district (FULL-PAGE ×3)',
    why: 'Breadth overviews — sports/waterpark/shop not yet stocked as OW',
    sheets: [
      sh('S1', 'sports complex overview', 'full-page-overview', [
        owCell(
          'sports-complex',
          `${OVERVIEW} Sports complex: soccer field, basketball court, track oval, bleachers, path between. 5 zones. Open field centers for drag play. No people/text/logos.`,
        ),
      ]),
      sh('S2', 'waterpark overview', 'full-page-overview', [
        owCell(
          'waterpark',
          `${OVERVIEW} Waterpark overview: lazy river loop, slide tower, splash pad, pool, snack terrace blank. 5 zones. Clear paths. No people/text. NEW.`,
        ),
      ]),
      sh('S3', 'shopping district overview', 'full-page-overview', [
        owCell(
          'shopping-district',
          `${OVERVIEW} Pedestrian shopping district: store fronts blank awnings, plaza fountain, side alley, rooftop terrace edge, main path. 5 zones. No logos/letters. NEW.`,
        ),
      ]),
    ],
  }),

  'ow-wave5-learn-play': wave('ow-wave5-learn-play', {
    stockpile: 'overview-worlds',
    lane: 'overview',
    bucket: 'town-community',
    family_id: `${OW_PREFIX}wave5`,
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'OW wave5 — aquarium + museum + makerspace campus (FULL-PAGE ×3)',
    why: 'Learn/play campuses — aquarium/museum/makerspace as overview worlds',
    sheets: [
      sh('S1', 'aquarium overview', 'full-page-overview', [
        owCell(
          'aquarium-campus',
          `${OVERVIEW} Aquarium campus: entrance plaza, big tank hall exterior glass, touch-pool wing, cafe terrace blank, path. 5 zones. No people/text/logos.`,
        ),
      ]),
      sh('S2', 'science museum overview', 'full-page-overview', [
        owCell(
          'science-museum',
          `${OVERVIEW} Science museum grounds: dome theater, exhibit hall, outdoor invention playground, picnic lawn, path. 5 zones. Blank banners. No people/text. NEW.`,
        ),
      ]),
      sh('S3', 'makerspace campus overview', 'full-page-overview', [
        owCell(
          'makerspace-campus',
          `${OVERVIEW} Makerspace campus: workshop shed, outdoor build yard, demo stage, material shed, path. 5 zones. No people/text. NEW.`,
        ),
      ]),
    ],
  }),

  'ow-wave6-transit-nature': wave('ow-wave6-transit-nature', {
    stockpile: 'overview-worlds',
    lane: 'overview',
    bucket: 'transport',
    family_id: `${OW_PREFIX}wave6`,
    in_prompt_named: true,
    title: 'OW wave6 — station district + airport edge + mountain resort (FULL-PAGE ×3)',
    why: 'Transport + mountain resort breadth from prompt seeds',
    sheets: [
      sh('S1', 'station district overview', 'full-page-overview', [
        owCell(
          'station-district',
          `${OVERVIEW} Station district: platform canopy, plaza, bus loop, cafe strip blank, path. 5 zones. Blank departure board shape (ZERO letters/numbers). No people.`,
        ),
      ]),
      sh('S2', 'airport edge overview', 'full-page-overview', [
        owCell(
          'airport-edge',
          `${OVERVIEW} Airport edge (kid-friendly): terminal plaza, observation deck, taxi lane, park strip, path. Soft distant plane silhouette OK. No logos/text/people.`,
        ),
      ]),
      sh('S3', 'mountain resort overview', 'full-page-overview', [
        owCell(
          'mountain-resort',
          `${OVERVIEW} Mountain resort: lodge, gondola base, beginner slope, trail fork, cafe deck blank. 5 zones. No people/text.`,
        ),
      ]),
    ],
  }),

  'ki-music-electronic': wave('ki-music-electronic', {
    lane: 'music',
    bucket: 'music',
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'KI electronic music desk NEW (3×3 ×2)',
    why: 'Music creation modern — DJ/synth depth beyond acoustic',
    sheets: [
      sh('S1', 'elec music 3x3', 'black-contact-3x3', [
        cell('emusc', 'midi-keyboard', `${CUTOUT} MIDI keyboard blank (no labels).`),
        cell('emusc', 'drum-machine', `${CUTOUT} Drum machine blank pads.`),
        cell('emusc', 'mixer-blank', `${CUTOUT} Audio mixer blank (no text).`),
        cell('emusc', 'loop-pedal', `${CUTOUT} Loop pedal.`),
        cell('emusc', 'sampler-pad', `${CUTOUT} Sampler pad.`),
        cell('emusc', 'vinyl-deck', `${CUTOUT} Vinyl turntable blank label.`),
        cell('emusc', 'cassette-deck', `${CUTOUT} Cassette deck.`),
        cell('emusc', 'mic-usb', `${CUTOUT} USB mic.`),
        cell('emusc', 'studio-monitors', `${CUTOUT} Pair of studio monitors blank.`),
      ]),
      sh('S2', 'band extras 3x3', 'black-contact-3x3', [
        cell('emusc', 'effects-pedal', `${CUTOUT} Guitar effects pedal.`),
        cell('emusc', 'cable-snake', `${CUTOUT} Cable snake bundle.`),
        cell('emusc', 'rack-case', `${CUTOUT} Rack equipment case.`),
        cell('emusc', 'metronome', `${CUTOUT} Metronome.`),
        cell('emusc', 'pitch-pipe', `${CUTOUT} Pitch pipe.`),
        cell('emusc', 'music-backpack', `${CUTOUT} Music backpack.`),
        cell('emusc', 'setlist-blank', `${CUTOUT} Setlist clipboard ZERO letters.`),
        cell('emusc', 'glow-wristbands', `${CUTOUT} Concert glow wristbands.`),
        cell('emusc', 'stage-box', `${CUTOUT} Stage box.`),
      ]),
    ],
  }),

  'ki-gaming-desk-depth': wave('ki-gaming-desk-depth', {
    lane: 'gaming-digital',
    bucket: 'gaming-digital',
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'KI gaming desk depth NEW (3×3 ×2)',
    why: 'Gaming THIN still — desk ecosystem without brands/UI',
    sheets: [
      sh('S1', 'desk ecosystem 3x3', 'black-contact-3x3', [
        cell('gdesk', 'desk-pad', `${CUTOUT} Desk mouse pad oversized.`),
        cell('gdesk', 'rgb-lamp', `${CUTOUT} RGB desk lamp (no logos).`),
        cell('gdesk', 'cubecase-pc', `${CUTOUT} Small PC case blank.`),
        cell('gdesk', 'capture-card', `${CUTOUT} Capture card box blank.`),
        cell('gdesk', 'stream-deck-blank', `${CUTOUT} Stream deck blank keys (no icons/text).`),
        cell('gdesk', 'mic-arm-clamp', `${CUTOUT} Mic arm clamp.`),
        cell('gdesk', 'webcam-cover', `${CUTOUT} Webcam privacy cover.`),
        cell('gdesk', 'controller-stand', `${CUTOUT} Controller stand.`),
        cell('gdesk', 'headset-stand', `${CUTOUT} Headset stand.`),
      ]),
      sh('S2', 'play accessories 3x3', 'black-contact-3x3', [
        cell('gdesk', 'racing-wheel', `${CUTOUT} Racing wheel unbranded.`),
        cell('gdesk', 'flight-stick', `${CUTOUT} Flight stick unbranded.`),
        cell('gdesk', 'dance-pad', `${CUTOUT} Dance pad.`),
        cell('gdesk', 'arcade-stick', `${CUTOUT} Arcade stick blank.`),
        cell('gdesk', 'portable-battery', `${CUTOUT} Portable battery blank.`),
        cell('gdesk', 'cartridge-blank', `${CUTOUT} Game cartridge blank (no art/logos).`),
        cell('gdesk', 'disc-case', `${CUTOUT} Disc case blank.`),
        cell('gdesk', 'amiibo-like-figure', `${CUTOUT} Generic blank figure on stand (NOT any licensed character).`),
        cell('gdesk', 'snack-cup-holder', `${CUTOUT} Desk snack cup holder.`),
      ]),
    ],
  }),

  /** ——— AGGRO WAVE3 (flood mid-obscure; majority discovered-new) ——— */

  'ki-puppet-theatre': wave('ki-puppet-theatre', {
    lane: 'other-discovered',
    bucket: 'other-discovered',
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'KI puppet + shadow theatre NEW (3×3 ×3)',
    why: 'Discovered hobby — puppet/shadow theatre not in original prompt',
    sheets: [
      sh('S1', 'puppets 3x3', 'black-contact-3x3', [
        cell('pup', 'hand-puppet', `${CUTOUT} Friendly hand puppet (generic animal, not IP).`),
        cell('pup', 'sock-puppet', `${CUTOUT} Sock puppet.`),
        cell('pup', 'finger-puppets', `${CUTOUT} Finger puppet set.`),
        cell('pup', 'marionette', `${CUTOUT} Simple marionette on crossbar.`),
        cell('pup', 'rod-puppet', `${CUTOUT} Rod puppet.`),
        cell('pup', 'puppet-stage', `${CUTOUT} Tabletop puppet stage booth.`),
        cell('pup', 'curtain-rail', `${CUTOUT} Mini curtain rail for stage.`),
        cell('pup', 'prop-tiny-table', `${CUTOUT} Tiny stage prop table.`),
        cell('pup', 'prop-tiny-tree', `${CUTOUT} Tiny stage prop tree.`),
      ]),
      sh('S2', 'shadow theatre 3x3', 'black-contact-3x3', [
        cell('pup', 'shadow-screen', `${CUTOUT} Shadow theatre translucent screen on frame.`),
        cell('pup', 'shadow-figures', `${CUTOUT} Shadow figure cutout set on sticks.`),
        cell('pup', 'overhead-lamp', `${CUTOUT} Overhead lamp for shadows.`),
        cell('pup', 'paper-lantern', `${CUTOUT} Paper lantern.`),
        cell('pup', 'story-scroll', `${CUTOUT} Blank illustrated story scroll (no letters).`),
        cell('pup', 'felt-board', `${CUTOUT} Felt story board.`),
        cell('pup', 'felt-shapes', `${CUTOUT} Felt shape set abstract.`),
        cell('pup', 'voice-changer-toy', `${CUTOUT} Toy voice-changer mic blank (no logos).`),
        cell('pup', 'theatre-trunk', `${CUTOUT} Theatre prop trunk.`),
      ]),
      sh('S3', 'costume craft 3x3', 'black-contact-3x3', [
        cell('pup', 'cape', `${CUTOUT} Simple cape.`),
        cell('pup', 'mask-blank', `${CUTOUT} Blank craft mask (no face print).`),
        cell('pup', 'wig-simple', `${CUTOUT} Simple costume wig.`),
        cell('pup', 'fairy-wings', `${CUTOUT} Fairy wings.`),
        cell('pup', 'wizard-hat', `${CUTOUT} Wizard hat (no logos/text).`),
        cell('pup', 'pirate-hat', `${CUTOUT} Pirate hat generic.`),
        cell('pup', 'superhero-mask', `${CUTOUT} Simple eye-mask (generic, not IP).`),
        cell('pup', 'prop-wand-star', `${CUTOUT} Star wand.`),
        cell('pup', 'dress-up-rack', `${CUTOUT} Dress-up clothing rack.`),
      ]),
    ],
  }),

  'ki-garden-grow': wave('ki-garden-grow', {
    lane: 'other-discovered',
    bucket: 'other-discovered',
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'KI garden grow + greenhouse kid NEW (3×3 ×3)',
    why: 'Discovered hobby — kid gardening / greenhouse not named in prompt',
    sheets: [
      sh('S1', 'grow gear 3x3', 'black-contact-3x3', [
        cell('grow', 'watering-can', `${CUTOUT} Watering can.`),
        cell('grow', 'garden-trowel', `${CUTOUT} Garden trowel.`),
        cell('grow', 'hand-rake', `${CUTOUT} Hand rake.`),
        cell('grow', 'seedling-tray', `${CUTOUT} Seedling tray with sprouts.`),
        cell('grow', 'plant-pots', `${CUTOUT} Stack of plant pots.`),
        cell('grow', 'grow-light', `${CUTOUT} Desk grow light.`),
        cell('grow', 'mister-bottle', `${CUTOUT} Plant mister bottle.`),
        cell('grow', 'soil-bag', `${CUTOUT} Soil bag blank (no text).`),
        cell('grow', 'garden-gloves', `${CUTOUT} Kid garden gloves.`),
      ]),
      sh('S2', 'plants harvest 3x3', 'black-contact-3x3', [
        cell('grow', 'tomato-plant', `${CUTOUT} Tomato plant in pot.`),
        cell('grow', 'herb-pots', `${CUTOUT} Herb pot trio.`),
        cell('grow', 'sunflower', `${CUTOUT} Sunflower in pot.`),
        cell('grow', 'strawberry-planter', `${CUTOUT} Strawberry planter.`),
        cell('grow', 'pumpkin', `${CUTOUT} Pumpkin.`),
        cell('grow', 'carrot-bunch', `${CUTOUT} Carrot bunch with greens.`),
        cell('grow', 'wheelbarrow-kid', `${CUTOUT} Kid wheelbarrow.`),
        cell('grow', 'compost-bin', `${CUTOUT} Small compost bin.`),
        cell('grow', 'rain-barrel', `${CUTOUT} Rain barrel.`),
      ]),
      sh('S3', 'greenhouse kit 3x3', 'black-contact-3x3', [
        cell('grow', 'mini-greenhouse', `${CUTOUT} Mini greenhouse box.`),
        cell('grow', 'cold-frame', `${CUTOUT} Cold frame.`),
        cell('grow', 'trellis', `${CUTOUT} Garden trellis.`),
        cell('grow', 'birdhouse', `${CUTOUT} Birdhouse.`),
        cell('grow', 'bee-hotel', `${CUTOUT} Bee hotel.`),
        cell('grow', 'garden-sign-blank', `${CUTOUT} Garden row marker blank (no letters).`),
        cell('grow', 'hose-reel', `${CUTOUT} Hose reel.`),
        cell('grow', 'kneeler-pad', `${CUTOUT} Garden kneeler pad.`),
        cell('grow', 'harvest-basket', `${CUTOUT} Harvest basket.`),
      ]),
    ],
  }),

  'ki-sports-street-deep': wave('ki-sports-street-deep', {
    lane: 'sports',
    bucket: 'sports',
    in_prompt_named: true,
    title: 'KI street + court sports depth (3×3 ×3)',
    why: 'Sports beyond balls — street/court mid-obscure gear still thin',
    sheets: [
      sh('S1', 'street sports 3x3', 'black-contact-3x3', [
        cell('sst', 'jump-rope', `${CUTOUT} Jump rope.`),
        cell('sst', 'hula-sport', `${CUTOUT} Sport hula hoop.`),
        cell('sst', 'hacky-sack', `${CUTOUT} Hacky sack.`),
        cell('sst', 'diabolo-sport', `${CUTOUT} Sport diabolo.`),
        cell('sst', 'scooter-pro', `${CUTOUT} Pro kick scooter unbranded.`),
        cell('sst', 'fingerboard', `${CUTOUT} Fingerboard skateboard toy.`),
        cell('sst', 'basketball-hoop-mini', `${CUTOUT} Mini basketball hoop.`),
        cell('sst', 'netball-hoop', `${CUTOUT} Netball hoop.`),
        cell('sst', 'cricket-bat', `${CUTOUT} Cricket bat.`),
      ]),
      sh('S2', 'court field 3x3', 'black-contact-3x3', [
        cell('sst', 'volleyball', `${CUTOUT} Volleyball.`),
        cell('sst', 'volleyball-net-post', `${CUTOUT} Volleyball net + post segment.`),
        cell('sst', 'badminton-net', `${CUTOUT} Badminton net segment.`),
        cell('sst', 'table-tennis-paddle', `${CUTOUT} Table tennis paddle pair.`),
        cell('sst', 'table-tennis-table', `${CUTOUT} Compact table tennis table.`),
        cell('sst', 'bowling-pin-set', `${CUTOUT} Bowling pin set.`),
        cell('sst', 'bowling-ball', `${CUTOUT} Bowling ball.`),
        cell('sst', 'croquet-mallet', `${CUTOUT} Croquet mallet + ball.`),
        cell('sst', 'bocce-set', `${CUTOUT} Bocce ball set.`),
      ]),
      sh('S3', 'track swim 3x3', 'black-contact-3x3', [
        cell('sst', 'starting-block', `${CUTOUT} Track starting block.`),
        cell('sst', 'relay-baton', `${CUTOUT} Relay baton.`),
        cell('sst', 'hurdle', `${CUTOUT} Track hurdle.`),
        cell('sst', 'vaulting-pole', `${CUTOUT} Vaulting pole.`),
        cell('sst', 'discus', `${CUTOUT} Discus.`),
        cell('sst', 'javelin-soft', `${CUTOUT} Soft practice javelin.`),
        cell('sst', 'swim-cap', `${CUTOUT} Swim cap.`),
        cell('sst', 'kickboard-race', `${CUTOUT} Race kickboard.`),
        cell('sst', 'lane-rope', `${CUTOUT} Pool lane rope segment.`),
      ]),
    ],
  }),

  'ki-origami-paper-craft': wave('ki-origami-paper-craft', {
    lane: 'crafts-maker',
    bucket: 'crafts-maker',
    in_prompt_named: true,
    title: 'KI origami + paper craft depth (3×3 ×3)',
    why: 'Crafts still thin on finished origami forms + paper actions',
    sheets: [
      sh('S1', 'origami forms 3x3', 'black-contact-3x3', [
        cell('ori', 'crane', `${CUTOUT} Origami crane.`),
        cell('ori', 'boat', `${CUTOUT} Origami boat.`),
        cell('ori', 'frog', `${CUTOUT} Origami frog.`),
        cell('ori', 'flower', `${CUTOUT} Origami flower.`),
        cell('ori', 'butterfly', `${CUTOUT} Origami butterfly.`),
        cell('ori', 'star', `${CUTOUT} Origami star.`),
        cell('ori', 'heart', `${CUTOUT} Origami heart.`),
        cell('ori', 'fox', `${CUTOUT} Origami fox.`),
        cell('ori', 'cat', `${CUTOUT} Origami cat.`),
      ]),
      sh('S2', 'paper craft tools 3x3', 'black-contact-3x3', [
        cell('ori', 'paper-stack', `${CUTOUT} Colored paper stack.`),
        cell('ori', 'bone-folder', `${CUTOUT} Bone folder.`),
        cell('ori', 'craft-punch', `${CUTOUT} Shape craft punch.`),
        cell('ori', 'corner-rounder', `${CUTOUT} Corner rounder.`),
        cell('ori', 'washi-set', `${CUTOUT} Washi tape set (patterns, no letters).`),
        cell('ori', 'paper-quilling', `${CUTOUT} Paper quilling strips + tool.`),
        cell('ori', 'pop-up-card', `${CUTOUT} Blank pop-up card open.`),
        cell('ori', 'paper-chains', `${CUTOUT} Paper chain garland.`),
        cell('ori', 'snowflake-cut', `${CUTOUT} Paper snowflake.`),
      ]),
      sh('S3', 'kirigami mobiles 3x3', 'black-contact-3x3', [
        cell('ori', 'kirigami-panel', `${CUTOUT} Kirigami cut panel.`),
        cell('ori', 'paper-mobile', `${CUTOUT} Paper mobile hanging.`),
        cell('ori', 'wind-spinner', `${CUTOUT} Paper wind spinner.`),
        cell('ori', 'lantern-fold', `${CUTOUT} Folded paper lantern.`),
        cell('ori', 'fan-fold', `${CUTOUT} Folding paper fan.`),
        cell('ori', 'envelope-craft', `${CUTOUT} Craft envelope blank.`),
        cell('ori', 'gift-box', `${CUTOUT} Small gift box.`),
        cell('ori', 'bow-ribbon', `${CUTOUT} Ribbon bow.`),
        cell('ori', 'scrap-bin', `${CUTOUT} Paper scrap bin.`),
      ]),
    ],
  }),

  'ki-fair-rides-deep': wave('ki-fair-rides-deep', {
    lane: 'vehicles-leisure',
    bucket: 'vehicles-leisure',
    in_prompt_named: true,
    title: 'KI fair rides + carnival vehicles depth (3×3 ×3)',
    why: 'Fun vehicles still thin — fair/carnival ride modules',
    sheets: [
      sh('S1', 'ride vehicles 3x3', 'black-contact-3x3', [
        cell('fair', 'ferris-cabin', `${CUTOUT} Ferris wheel cabin.`),
        cell('fair', 'teacup-ride', `${CUTOUT} Teacup ride car.`),
        cell('fair', 'bumper-boat', `${CUTOUT} Bumper boat.`),
        cell('fair', 'chair-swing', `${CUTOUT} Swing-ride chair.`),
        cell('fair', 'roller-coaster-car', `${CUTOUT} Roller coaster car.`),
        cell('fair', 'log-flume-boat', `${CUTOUT} Log flume boat.`),
        cell('fair', 'haunted-cart', `${CUTOUT} Friendly haunted-house cart.`),
        cell('fair', 'train-engine-mini', `${CUTOUT} Mini fair train engine.`),
        cell('fair', 'pony-carousel', `${CUTOUT} Carousel pony (generic).`),
      ]),
      sh('S2', 'carnival games 3x3', 'black-contact-3x3', [
        cell('fair', 'strength-hammer', `${CUTOUT} High-striker hammer.`),
        cell('fair', 'strength-tower', `${CUTOUT} High-striker tower blank (no text).`),
        cell('fair', 'duck-pond', `${CUTOUT} Rubber duck pond set.`),
        cell('fair', 'balloon-dart-booth', `${CUTOUT} Balloon dart booth module.`),
        cell('fair', 'milk-bottle-stack', `${CUTOUT} Milk bottle knock-down stack.`),
        cell('fair', 'ring-toss-booth', `${CUTOUT} Ring toss booth.`),
        cell('fair', 'claw-machine', `${CUTOUT} Claw machine blank screen/glass (no logos/UI).`),
        cell('fair', 'prize-plush', `${CUTOUT} Generic prize plush (not IP character).`),
        cell('fair', 'ticket-roll', `${CUTOUT} Ticket roll blank.`),
      ]),
      sh('S3', 'fair food carts 3x3', 'black-contact-3x3', [
        cell('fair', 'popcorn-cart', `${CUTOUT} Popcorn cart blank.`),
        cell('fair', 'cotton-candy-machine', `${CUTOUT} Cotton candy machine.`),
        cell('fair', 'ice-cream-cart', `${CUTOUT} Ice cream cart.`),
        cell('fair', 'pretzel-stand', `${CUTOUT} Pretzel stand blank.`),
        cell('fair', 'lemonade-barrel', `${CUTOUT} Lemonade barrel + tap.`),
        cell('fair', 'corn-dog-tray', `${CUTOUT} Corn dog tray.`),
        cell('fair', 'funnel-cake-plate', `${CUTOUT} Funnel cake plate.`),
        cell('fair', 'candy-apple', `${CUTOUT} Candy apple.`),
        cell('fair', 'picnic-bench', `${CUTOUT} Fair picnic bench.`),
      ]),
    ],
  }),

  'ki-astronomy-club': wave('ki-astronomy-club', {
    lane: 'other-discovered',
    bucket: 'other-discovered',
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'KI astronomy club NEW (3×3 ×3)',
    why: 'Discovered club — stargazing kit beyond one telescope',
    sheets: [
      sh('S1', 'astro gear 3x3', 'black-contact-3x3', [
        cell('astro', 'telescope-long', `${CUTOUT} Long telescope on tripod.`),
        cell('astro', 'spotting-scope', `${CUTOUT} Spotting scope.`),
        cell('astro', 'star-finder', `${CUTOUT} Planisphere / star finder blank (no text).`),
        cell('astro', 'red-flashlight', `${CUTOUT} Red astronomy flashlight.`),
        cell('astro', 'star-chart-blank', `${CUTOUT} Star chart poster blank symbols only.`),
        cell('astro', 'meteorite-sample', `${CUTOUT} Meteorite sample on stand.`),
        cell('astro', 'globe-celestial', `${CUTOUT} Celestial globe.`),
        cell('astro', 'moon-model', `${CUTOUT} Moon model.`),
        cell('astro', 'planet-mobile', `${CUTOUT} Planet mobile (generic spheres).`),
      ]),
      sh('S2', 'observatory kit 3x3', 'black-contact-3x3', [
        cell('astro', 'observatory-dome-mini', `${CUTOUT} Mini observatory dome.`),
        cell('astro', 'camera-astro', `${CUTOUT} Astro camera on scope.`),
        cell('astro', 'filter-wheel', `${CUTOUT} Filter wheel.`),
        cell('astro', 'eyepiece-set', `${CUTOUT} Eyepiece set.`),
        cell('astro', 'dew-shield', `${CUTOUT} Dew shield.`),
        cell('astro', 'camping-chair', `${CUTOUT} Camping chair.`),
        cell('astro', 'thermos-astro', `${CUTOUT} Thermos.`),
        cell('astro', 'night-sky-blanket', `${CUTOUT} Night-sky patterned blanket (no text).`),
        cell('astro', 'binoculars-astro', `${CUTOUT} Large astronomy binoculars.`),
      ]),
      sh('S3', 'space play NEW 3x3', 'black-contact-3x3', [
        cell('astro', 'rocket-model', `${CUTOUT} Model rocket (generic, no agency logos).`),
        cell('astro', 'launch-pad-mini', `${CUTOUT} Mini launch pad.`),
        cell('astro', 'astronaut-helmet', `${CUTOUT} Toy astronaut helmet.`),
        cell('astro', 'space-glove', `${CUTOUT} Space glove.`),
        cell('astro', 'rover-toy', `${CUTOUT} Simple rover toy.`),
        cell('astro', 'satellite-model', `${CUTOUT} Satellite model.`),
        cell('astro', 'orbit-rings', `${CUTOUT} Orbit ring demo set.`),
        cell('astro', 'solar-system-kit', `${CUTOUT} Solar system kit box blank.`),
        cell('astro', 'trophy-astro', `${CUTOUT} Astronomy club trophy blank.`),
      ]),
    ],
  }),

  'ki-cooking-kid': wave('ki-cooking-kid', {
    lane: 'hobbies',
    bucket: 'hobbies',
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'KI kid cooking / baking club NEW (3×3 ×3)',
    why: 'Discovered hobby — kid kitchen club gear not in original prompt',
    sheets: [
      sh('S1', 'bake tools 3x3', 'black-contact-3x3', [
        cell('cook', 'mixing-bowl', `${CUTOUT} Mixing bowl.`),
        cell('cook', 'whisk', `${CUTOUT} Whisk.`),
        cell('cook', 'wooden-spoon', `${CUTOUT} Wooden spoon.`),
        cell('cook', 'measuring-cups', `${CUTOUT} Measuring cups (no numerals readable).`),
        cell('cook', 'rolling-pin', `${CUTOUT} Rolling pin.`),
        cell('cook', 'cookie-cutters', `${CUTOUT} Cookie cutter set.`),
        cell('cook', 'muffin-tin', `${CUTOUT} Muffin tin.`),
        cell('cook', 'oven-mitt', `${CUTOUT} Oven mitt.`),
        cell('cook', 'apron', `${CUTOUT} Kid apron blank.`),
      ]),
      sh('S2', 'treats still-life 3x3', 'black-contact-3x3', [
        cell('cook', 'cupcakes', `${CUTOUT} Cupcake trio.`),
        cell('cook', 'cookies', `${CUTOUT} Cookie stack.`),
        cell('cook', 'pizza-raw', `${CUTOUT} Uncooked pizza on peel.`),
        cell('cook', 'sandwich-stack', `${CUTOUT} Sandwich stack.`),
        cell('cook', 'smoothie', `${CUTOUT} Smoothie glass.`),
        cell('cook', 'fruit-skewers', `${CUTOUT} Fruit skewers.`),
        cell('cook', 'pancake-stack', `${CUTOUT} Pancake stack.`),
        cell('cook', 'bento-box', `${CUTOUT} Bento box blank dividers.`),
        cell('cook', 'picnic-basket', `${CUTOUT} Picnic basket.`),
      ]),
      sh('S3', 'kid kitchen 3x3', 'black-contact-3x3', [
        cell('cook', 'toy-oven', `${CUTOUT} Kid toy oven blank (no logos/UI).`),
        cell('cook', 'blender', `${CUTOUT} Blender blank.`),
        cell('cook', 'toaster', `${CUTOUT} Toaster.`),
        cell('cook', 'cutting-board', `${CUTOUT} Cutting board + safe kid knife.`),
        cell('cook', 'recipe-card-blank', `${CUTOUT} Recipe card ZERO letters.`),
        cell('cook', 'spice-jars', `${CUTOUT} Spice jar set blank.`),
        cell('cook', 'timer-kitchen', `${CUTOUT} Kitchen timer blank.`),
        cell('cook', 'cooling-rack', `${CUTOUT} Cooling rack.`),
        cell('cook', 'cake-stand', `${CUTOUT} Cake stand.`),
      ]),
    ],
  }),

  /** ——— AGGRO WAVE4 (keep flooding; discovered-heavy) ——— */

  'ki-photography-club': wave('ki-photography-club', {
    lane: 'other-discovered',
    bucket: 'other-discovered',
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'KI photography club NEW (3×3 ×3)',
    why: 'Discovered hobby — kid photo club beyond one instant camera',
    sheets: [
      sh('S1', 'cameras 3x3', 'black-contact-3x3', [
        cell('photo', 'dslr-blank', `${CUTOUT} Unbranded DSLR camera blank screen.`),
        cell('photo', 'mirrorless-blank', `${CUTOUT} Mirrorless camera blank screen.`),
        cell('photo', 'instant-camera', `${CUTOUT} Instant camera blank (no logos).`),
        cell('photo', 'action-cam', `${CUTOUT} Action camera on mount blank.`),
        cell('photo', 'film-camera', `${CUTOUT} Film camera.`),
        cell('photo', 'disposable-cam', `${CUTOUT} Disposable camera blank.`),
        cell('photo', 'camera-bag', `${CUTOUT} Camera bag.`),
        cell('photo', 'lens-prime', `${CUTOUT} Camera lens.`),
        cell('photo', 'lens-cap', `${CUTOUT} Lens cap.`),
      ]),
      sh('S2', 'studio kit 3x3', 'black-contact-3x3', [
        cell('photo', 'tripod-full', `${CUTOUT} Full tripod.`),
        cell('photo', 'monopod', `${CUTOUT} Monopod.`),
        cell('photo', 'light-stand', `${CUTOUT} Light stand.`),
        cell('photo', 'softbox-square', `${CUTOUT} Softbox light.`),
        cell('photo', 'backdrop-roll', `${CUTOUT} Backdrop paper roll on stand.`),
        cell('photo', 'reflector-5in1', `${CUTOUT} 5-in-1 reflector disk.`),
        cell('photo', 'light-meter', `${CUTOUT} Light meter blank dial.`),
        cell('photo', 'remote-shutter', `${CUTOUT} Remote shutter.`),
        cell('photo', 'memory-card-case', `${CUTOUT} Memory card case blank.`),
      ]),
      sh('S3', 'print darkroom 3x3', 'black-contact-3x3', [
        cell('photo', 'photo-printer', `${CUTOUT} Photo printer blank screen.`),
        cell('photo', 'photo-stack', `${CUTOUT} Printed photo stack blank images.`),
        cell('photo', 'album-photo', `${CUTOUT} Photo album blank.`),
        cell('photo', 'negatives-sleeve', `${CUTOUT} Film negatives sleeve.`),
        cell('photo', 'loupe', `${CUTOUT} Loupe magnifier.`),
        cell('photo', 'light-table', `${CUTOUT} Light table.`),
        cell('photo', 'clip-string', `${CUTOUT} Photo drying clips on string.`),
        cell('photo', 'developing-tray', `${CUTOUT} Developing tray.`),
        cell('photo', 'trophy-photo', `${CUTOUT} Photo-club trophy blank.`),
      ]),
    ],
  }),

  'ki-magic-show-deep': wave('ki-magic-show-deep', {
    lane: 'other-discovered',
    bucket: 'other-discovered',
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'KI magic show kit deep NEW (3×3 ×3)',
    why: 'Discovered — expand beyond hat/wand into stage magic props',
    sheets: [
      sh('S1', 'classic tricks 3x3', 'black-contact-3x3', [
        cell('magic', 'top-hat', `${CUTOUT} Magician top hat.`),
        cell('magic', 'wand-star', `${CUTOUT} Magic wand.`),
        cell('magic', 'rabbit-plush', `${CUTOUT} Friendly rabbit plush (generic).`),
        cell('magic', 'dove-cage', `${CUTOUT} Small bird cage prop.`),
        cell('magic', 'card-fan-blank', `${CUTOUT} Fan of blank-faced cards.`),
        cell('magic', 'coin-trick', `${CUTOUT} Oversized trick coin.`),
        cell('magic', 'silk-scarves', `${CUTOUT} Silk scarf bundle.`),
        cell('magic', 'foam-balls', `${CUTOUT} Foam magic balls.`),
        cell('magic', 'thumb-tip', `${CUTOUT} Oversized thumb tip prop (board-scale joke size OK).`),
      ]),
      sh('S2', 'stage boxes 3x3', 'black-contact-3x3', [
        cell('magic', 'mystery-box', `${CUTOUT} Mystery box prop.`),
        cell('magic', 'linking-rings', `${CUTOUT} Linking rings set.`),
        cell('magic', 'rope-cut', `${CUTOUT} Cut-and-restore rope prop.`),
        cell('magic', 'cups-balls', `${CUTOUT} Cups and balls set.`),
        cell('magic', 'changing-bag', `${CUTOUT} Change bag.`),
        cell('magic', 'flower-bouquet-appear', `${CUTOUT} Appearing flower bouquet.`),
        cell('magic', 'levitation-hoop', `${CUTOUT} Levitation hoop.`),
        cell('magic', 'sword-box-safe', `${CUTOUT} Soft sword-box illusion prop (toy, not scary).`),
        cell('magic', 'mirror-box', `${CUTOUT} Mirror box prop.`),
      ]),
      sh('S3', 'show kit 3x3', 'black-contact-3x3', [
        cell('magic', 'cape-magic', `${CUTOUT} Magician cape.`),
        cell('magic', 'gloves-white', `${CUTOUT} White gloves pair.`),
        cell('magic', 'table-drape', `${CUTOUT} Draped magic table.`),
        cell('magic', 'curtain-backdrop', `${CUTOUT} Stage curtain backdrop.`),
        cell('magic', 'spotlight-magic', `${CUTOUT} Spotlight.`),
        cell('magic', 'ticket-magic-blank', `${CUTOUT} Show ticket blank.`),
        cell('magic', 'poster-blank', `${CUTOUT} Magic show poster blank (no letters).`),
        cell('magic', 'wand-case', `${CUTOUT} Wand case.`),
        cell('magic', 'trophy-magic', `${CUTOUT} Magic-club trophy blank.`),
      ]),
    ],
  }),

  'ki-slime-lab-deep': wave('ki-slime-lab-deep', {
    lane: 'crafts-maker',
    bucket: 'crafts-maker',
    in_prompt_named: true,
    title: 'KI slime lab depth (3×3 ×3)',
    why: 'Crafts slime still thin — lab kit + textures + tools',
    sheets: [
      sh('S1', 'slime textures 3x3', 'black-contact-3x3', [
        cell('slime', 'butter-slime', `${CUTOUT} Butter slime tub.`),
        cell('slime', 'cloud-slime', `${CUTOUT} Cloud slime fluff pile.`),
        cell('slime', 'clear-slime', `${CUTOUT} Clear slime jar.`),
        cell('slime', 'glow-slime', `${CUTOUT} Glow slime jar.`),
        cell('slime', 'foam-beads', `${CUTOUT} Foam bead slime mix.`),
        cell('slime', 'glitter-slime', `${CUTOUT} Glitter slime.`),
        cell('slime', 'magnetic-slime', `${CUTOUT} Magnetic slime with magnet wand.`),
        cell('slime', 'color-change', `${CUTOUT} Color-change slime tub.`),
        cell('slime', 'slime-stretch-arc', `${CUTOUT} Slime stretched in arc (no hands).`),
      ]),
      sh('S2', 'lab tools 3x3', 'black-contact-3x3', [
        cell('slime', 'beaker', `${CUTOUT} Lab beaker.`),
        cell('slime', 'funnel', `${CUTOUT} Funnel.`),
        cell('slime', 'dropper', `${CUTOUT} Dropper bottle.`),
        cell('slime', 'mixing-stick', `${CUTOUT} Mixing stick.`),
        cell('slime', 'activator-bottle', `${CUTOUT} Activator bottle blank.`),
        cell('slime', 'glue-bottle-craft', `${CUTOUT} Craft glue bottle blank.`),
        cell('slime', 'scale-lab', `${CUTOUT} Lab scale blank.`),
        cell('slime', 'goggles-lab', `${CUTOUT} Lab goggles.`),
        cell('slime', 'lab-coat-kid', `${CUTOUT} Kid lab coat on hanger.`),
      ]),
      sh('S3', 'storage play 3x3', 'black-contact-3x3', [
        cell('slime', 'slime-caddy', `${CUTOUT} Slime caddy organizer.`),
        cell('slime', 'mini-tubs-set', `${CUTOUT} Mini slime tub set.`),
        cell('slime', 'charm-addins', `${CUTOUT} Slime charm add-ins abstract shapes.`),
        cell('slime', 'foam-clay', `${CUTOUT} Foam clay bricks.`),
        cell('slime', 'putty-tin', `${CUTOUT} Thinking-putty tin blank.`),
        cell('slime', 'kinetic-sand', `${CUTOUT} Kinetic sand tray.`),
        cell('slime', 'sand-molds', `${CUTOUT} Sand mold set.`),
        cell('slime', 'scented-oils', `${CUTOUT} Scent dropper set blank.`),
        cell('slime', 'trophy-slime', `${CUTOUT} Slime-lab trophy blank.`),
      ]),
    ],
  }),

  'ki-bike-park-gear': wave('ki-bike-park-gear', {
    lane: 'vehicles-leisure',
    bucket: 'vehicles-leisure',
    in_prompt_named: true,
    title: 'KI bike park + scooter park gear (3×3 ×3)',
    why: 'Fun vehicles depth — bike/scooter park modules beyond one BMX',
    sheets: [
      sh('S1', 'bikes scooters 3x3', 'black-contact-3x3', [
        cell('bike', 'mountain-bike', `${CUTOUT} Mountain bike unbranded.`),
        cell('bike', 'bmx-park', `${CUTOUT} BMX bike.`),
        cell('bike', 'dirt-jumper', `${CUTOUT} Dirt jumper bike.`),
        cell('bike', 'scooter-pro-park', `${CUTOUT} Pro scooter.`),
        cell('bike', 'razor-style', `${CUTOUT} Folding kick scooter unbranded.`),
        cell('bike', 'tricycle', `${CUTOUT} Tricycle.`),
        cell('bike', 'tandem-bike', `${CUTOUT} Tandem bike.`),
        cell('bike', 'recumbent', `${CUTOUT} Recumbent bike.`),
        cell('bike', 'cargo-bike', `${CUTOUT} Cargo bike.`),
      ]),
      sh('S2', 'park modules 3x3', 'black-contact-3x3', [
        cell('bike', 'quarter-pipe', `${CUTOUT} Quarter pipe.`),
        cell('bike', 'half-pipe', `${CUTOUT} Half pipe section.`),
        cell('bike', 'funbox', `${CUTOUT} Funbox ramp.`),
        cell('bike', 'spine-ramp', `${CUTOUT} Spine ramp.`),
        cell('bike', 'grind-rail-long', `${CUTOUT} Long grind rail.`),
        cell('bike', 'ledge-box', `${CUTOUT} Ledge box.`),
        cell('bike', 'bank-ramp', `${CUTOUT} Bank ramp.`),
        cell('bike', 'pump-track-bump', `${CUTOUT} Pump-track bump module.`),
        cell('bike', 'start-gate', `${CUTOUT} BMX start gate.`),
      ]),
      sh('S3', 'safety tools 3x3', 'black-contact-3x3', [
        cell('bike', 'full-face-helmet', `${CUTOUT} Full-face helmet.`),
        cell('bike', 'elbow-pads', `${CUTOUT} Elbow pads.`),
        cell('bike', 'wrist-guards', `${CUTOUT} Wrist guards.`),
        cell('bike', 'bike-pump', `${CUTOUT} Bike pump.`),
        cell('bike', 'multi-tool', `${CUTOUT} Bike multi-tool.`),
        cell('bike', 'water-bottle-cage', `${CUTOUT} Water bottle + cage.`),
        cell('bike', 'bike-lock', `${CUTOUT} Bike lock.`),
        cell('bike', 'bike-light', `${CUTOUT} Bike light.`),
        cell('bike', 'medal-race', `${CUTOUT} Race medal blank.`),
      ]),
    ],
  }),

  'ki-robotics-club': wave('ki-robotics-club', {
    lane: 'other-discovered',
    bucket: 'other-discovered',
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'KI robotics club NEW (3×3 ×3)',
    why: 'Discovered STEM club — robot competition kit not in prompt',
    sheets: [
      sh('S1', 'robots 3x3', 'black-contact-3x3', [
        cell('robo', 'bot-wheeled', `${CUTOUT} Friendly wheeled robot (generic, not IP).`),
        cell('robo', 'bot-legged', `${CUTOUT} Simple legged robot.`),
        cell('robo', 'bot-arm', `${CUTOUT} Desktop robot arm.`),
        cell('robo', 'drone-quad', `${CUTOUT} Small quadcopter drone blank (no logos).`),
        cell('robo', 'rover', `${CUTOUT} Rover robot.`),
        cell('robo', 'sumo-bot', `${CUTOUT} Sumo contest robot.`),
        cell('robo', 'line-follower', `${CUTOUT} Line-follower robot.`),
        cell('robo', 'claw-bot', `${CUTOUT} Claw robot.`),
        cell('robo', 'humanoid-simple', `${CUTOUT} Simple humanoid robot toy (generic).`),
      ]),
      sh('S2', 'parts field 3x3', 'black-contact-3x3', [
        cell('robo', 'controller-pad', `${CUTOUT} Robot controller pad blank.`),
        cell('robo', 'sensor-ultrasonic', `${CUTOUT} Ultrasonic sensor module.`),
        cell('robo', 'sensor-color', `${CUTOUT} Color sensor module.`),
        cell('robo', 'motor-gearbox', `${CUTOUT} Geared motor.`),
        cell('robo', 'wheel-omni', `${CUTOUT} Omni wheel.`),
        cell('robo', 'track-mat', `${CUTOUT} Competition mat blank patterns.`),
        cell('robo', 'field-wall', `${CUTOUT} Field wall segment.`),
        cell('robo', 'charging-dock', `${CUTOUT} Charging dock.`),
        cell('robo', 'toolbox-robo', `${CUTOUT} Robotics toolbox.`),
      ]),
      sh('S3', 'club day 3x3', 'black-contact-3x3', [
        cell('robo', 'laptop-code-blank', `${CUTOUT} Laptop blank screen.`),
        cell('robo', 'tablet-code-blank', `${CUTOUT} Tablet blank screen.`),
        cell('robo', 'usb-cable', `${CUTOUT} USB cable coil.`),
        cell('robo', 'battery-pack', `${CUTOUT} Battery pack blank.`),
        cell('robo', 'pit-table', `${CUTOUT} Pit table.`),
        cell('robo', 'team-flag-blank', `${CUTOUT} Team flag blank (no letters/emblems).`),
        cell('robo', 'stopwatch', `${CUTOUT} Stopwatch blank.`),
        cell('robo', 'cone-marker', `${CUTOUT} Marker cone.`),
        cell('robo', 'trophy-robo', `${CUTOUT} Robotics trophy blank.`),
      ]),
    ],
  }),

  /** ——— AGGRO WAVE5 (open-ended; majority discovered-new) ——— */

  'ki-scuba-snorkel': wave('ki-scuba-snorkel', {
    lane: 'sports',
    bucket: 'sports',
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'KI scuba + snorkel club NEW (3×3 ×3)',
    why: 'Discovered water hobby — not in original prompt',
    sheets: [
      sh('S1', 'dive gear 3x3', 'black-contact-3x3', [
        cell('dive', 'mask-snorkel', `${CUTOUT} Dive mask + snorkel.`),
        cell('dive', 'fins', `${CUTOUT} Swim fins pair.`),
        cell('dive', 'wetsuit', `${CUTOUT} Wetsuit on hanger.`),
        cell('dive', 'bcd-vest', `${CUTOUT} Buoyancy vest blank.`),
        cell('dive', 'tank', `${CUTOUT} Scuba tank.`),
        cell('dive', 'regulator', `${CUTOUT} Regulator.`),
        cell('dive', 'dive-computer-blank', `${CUTOUT} Dive computer blank screen.`),
        cell('dive', 'weight-belt', `${CUTOUT} Weight belt.`),
        cell('dive', 'dive-flag', `${CUTOUT} Dive flag shapes only (no letters).`),
      ]),
      sh('S2', 'reef toys 3x3', 'black-contact-3x3', [
        cell('dive', 'underwater-camera', `${CUTOUT} Underwater camera housing blank.`),
        cell('dive', 'dive-slate-blank', `${CUTOUT} Dive slate ZERO letters.`),
        cell('dive', 'torch-dive', `${CUTOUT} Dive torch.`),
        cell('dive', 'mesh-bag', `${CUTOUT} Mesh gear bag.`),
        cell('dive', 'booties', `${CUTOUT} Dive booties.`),
        cell('dive', 'gloves-dive', `${CUTOUT} Dive gloves.`),
        cell('dive', 'surface-float', `${CUTOUT} Surface marker float.`),
        cell('dive', 'coral-display', `${CUTOUT} Friendly coral display piece.`),
        cell('dive', 'shell-net', `${CUTOUT} Shell collecting net.`),
      ]),
      sh('S3', 'pool club 3x3', 'black-contact-3x3', [
        cell('dive', 'kickboard', `${CUTOUT} Kickboard.`),
        cell('dive', 'pull-buoy', `${CUTOUT} Pull buoy.`),
        cell('dive', 'pace-clock-blank', `${CUTOUT} Pace clock blank face.`),
        cell('dive', 'lane-line', `${CUTOUT} Lane line segment.`),
        cell('dive', 'starting-block', `${CUTOUT} Starting block.`),
        cell('dive', 'lifebuoy', `${CUTOUT} Lifebuoy.`),
        cell('dive', 'pool-noodle', `${CUTOUT} Pool noodle.`),
        cell('dive', 'goggles-race', `${CUTOUT} Racing goggles.`),
        cell('dive', 'trophy-dive', `${CUTOUT} Swim-club trophy blank.`),
      ]),
    ],
  }),

  'ki-horse-stable': wave('ki-horse-stable', {
    lane: 'other-discovered',
    bucket: 'other-discovered',
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'KI horse stable club NEW (3×3 ×3)',
    why: 'Discovered high-interest riding/stable life',
    sheets: [
      sh('S1', 'horse body 3x3', 'black-contact-3x3', [
        cell('horse', 'horse-standing', `${CUTOUT} Horse standing side view.`),
        cell('horse', 'pony', `${CUTOUT} Pony.`),
        cell('horse', 'foal', `${CUTOUT} Foal.`),
        cell('horse', 'horse-grazing', `${CUTOUT} Horse grazing.`),
        cell('horse', 'horse-jumping', `${CUTOUT} Horse mid-jump (no rider).`),
        cell('horse', 'donkey', `${CUTOUT} Donkey.`),
        cell('horse', 'horse-blanket', `${CUTOUT} Horse blanket.`),
        cell('horse', 'saddle', `${CUTOUT} Saddle.`),
        cell('horse', 'bridle', `${CUTOUT} Bridle.`),
      ]),
      sh('S2', 'stable gear 3x3', 'black-contact-3x3', [
        cell('horse', 'helmet-ride', `${CUTOUT} Riding helmet.`),
        cell('horse', 'boots-ride', `${CUTOUT} Riding boots.`),
        cell('horse', 'crop', `${CUTOUT} Riding crop.`),
        cell('horse', 'grooming-brush', `${CUTOUT} Horse brush.`),
        cell('horse', 'hoof-pick', `${CUTOUT} Hoof pick board-scale.`),
        cell('horse', 'hay-bale', `${CUTOUT} Hay bale.`),
        cell('horse', 'feed-bucket', `${CUTOUT} Feed bucket.`),
        cell('horse', 'water-trough', `${CUTOUT} Water trough.`),
        cell('horse', 'lead-rope', `${CUTOUT} Lead rope.`),
      ]),
      sh('S3', 'arena props 3x3', 'black-contact-3x3', [
        cell('horse', 'jump-rail', `${CUTOUT} Jump rail pair.`),
        cell('horse', 'jump-standard', `${CUTOUT} Jump standard.`),
        cell('horse', 'barrel', `${CUTOUT} Barrel for racing.`),
        cell('horse', 'cone-marker', `${CUTOUT} Arena cone.`),
        cell('horse', 'stable-door', `${CUTOUT} Stable half-door.`),
        cell('horse', 'tack-trunk', `${CUTOUT} Tack trunk.`),
        cell('horse', 'ribbon-prize', `${CUTOUT} Prize ribbon blank.`),
        cell('horse', 'horseshoe', `${CUTOUT} Horseshoe.`),
        cell('horse', 'trophy-ride', `${CUTOUT} Riding trophy blank.`),
      ]),
    ],
  }),

  'ki-arcade-pinball': wave('ki-arcade-pinball', {
    lane: 'hobbies',
    bucket: 'hobbies',
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'KI arcade + pinball NEW (3×3 ×3)',
    why: 'Discovered unbranded arcade leisure machines',
    sheets: [
      sh('S1', 'cabinets 3x3', 'black-contact-3x3', [
        cell('arc', 'pinball-machine', `${CUTOUT} Pinball machine blank art (no logos/IP).`),
        cell('arc', 'arcade-cabinet', `${CUTOUT} Arcade cabinet blank screen.`),
        cell('arc', 'claw-machine', `${CUTOUT} Claw machine blank.`),
        cell('arc', 'air-hockey', `${CUTOUT} Air hockey table.`),
        cell('arc', 'foosball', `${CUTOUT} Foosball table.`),
        cell('arc', 'skeeball', `${CUTOUT} Skee-ball lane.`),
        cell('arc', 'basketball-arcade', `${CUTOUT} Arcade basketball game.`),
        cell('arc', 'racing-cabinet', `${CUTOUT} Racing cabinet with wheel blank.`),
        cell('arc', 'dance-cabinet', `${CUTOUT} Dance-pad arcade blank.`),
      ]),
      sh('S2', 'tokens 3x3', 'black-contact-3x3', [
        cell('arc', 'token-coin', `${CUTOUT} Arcade token.`),
        cell('arc', 'ticket-strip', `${CUTOUT} Prize ticket strip blank.`),
        cell('arc', 'prize-plush', `${CUTOUT} Generic prize plush.`),
        cell('arc', 'joystick', `${CUTOUT} Arcade joystick.`),
        cell('arc', 'button-panel', `${CUTOUT} Button panel blank.`),
        cell('arc', 'hockey-puck', `${CUTOUT} Air hockey puck.`),
        cell('arc', 'hockey-mallet', `${CUTOUT} Air hockey mallet.`),
        cell('arc', 'pinball-ball', `${CUTOUT} Pinball steel ball.`),
        cell('arc', 'score-board-blank', `${CUTOUT} Scoreboard ZERO numerals.`),
      ]),
      sh('S3', 'pier extras 3x3', 'black-contact-3x3', [
        cell('arc', 'photo-booth', `${CUTOUT} Photo booth blank screen.`),
        cell('arc', 'karaoke-booth', `${CUTOUT} Karaoke booth blank.`),
        cell('arc', 'vr-pod', `${CUTOUT} VR pod chair blank.`),
        cell('arc', 'prize-counter', `${CUTOUT} Prize counter blank.`),
        cell('arc', 'neon-sign-blank', `${CUTOUT} Neon sign shape ZERO letters.`),
        cell('arc', 'stool-arcade', `${CUTOUT} Arcade stool.`),
        cell('arc', 'cupholder', `${CUTOUT} Cup holder.`),
        cell('arc', 'winner-button', `${CUTOUT} Big winner button blank.`),
        cell('arc', 'trophy-arcade', `${CUTOUT} Arcade trophy blank.`),
      ]),
    ],
  }),

  'ki-fashion-design': wave('ki-fashion-design', {
    lane: 'crafts-maker',
    bucket: 'crafts-maker',
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'KI fashion design studio NEW (3×3 ×3)',
    why: 'Discovered maker hobby — sewing/fashion not in prompt',
    sheets: [
      sh('S1', 'sew tools 3x3', 'black-contact-3x3', [
        cell('fash', 'sewing-machine', `${CUTOUT} Sewing machine blank.`),
        cell('fash', 'manequin', `${CUTOUT} Dress form mannequin.`),
        cell('fash', 'fabric-bolts', `${CUTOUT} Fabric bolt stack.`),
        cell('fash', 'scissors-fabric', `${CUTOUT} Fabric scissors.`),
        cell('fash', 'pin-cushion', `${CUTOUT} Pin cushion.`),
        cell('fash', 'measuring-tape', `${CUTOUT} Measuring tape (no numerals).`),
        cell('fash', 'thread-spools', `${CUTOUT} Thread spool set.`),
        cell('fash', 'pattern-blank', `${CUTOUT} Pattern paper blank.`),
        cell('fash', 'iron', `${CUTOUT} Iron.`),
      ]),
      sh('S2', 'design desk 3x3', 'black-contact-3x3', [
        cell('fash', 'sketchbook', `${CUTOUT} Fashion sketchbook blank.`),
        cell('fash', 'pencils-set', `${CUTOUT} Colored pencil set.`),
        cell('fash', 'mood-board-blank', `${CUTOUT} Mood board blank.`),
        cell('fash', 'swatch-book', `${CUTOUT} Fabric swatch book.`),
        cell('fash', 'button-jar', `${CUTOUT} Button jar.`),
        cell('fash', 'zipper-pack', `${CUTOUT} Zipper pack.`),
        cell('fash', 'ribbon-reels', `${CUTOUT} Ribbon reels.`),
        cell('fash', 'hat-blocks', `${CUTOUT} Hat block form.`),
        cell('fash', 'jewelry-pliers', `${CUTOUT} Jewelry pliers.`),
      ]),
      sh('S3', 'runway props 3x3', 'black-contact-3x3', [
        cell('fash', 'runway-lights', `${CUTOUT} Runway light strip.`),
        cell('fash', 'clothing-rack', `${CUTOUT} Clothing rack.`),
        cell('fash', 'garment-bag', `${CUTOUT} Garment bag.`),
        cell('fash', 'hanger-set', `${CUTOUT} Hanger set.`),
        cell('fash', 'mirror-standing', `${CUTOUT} Standing mirror.`),
        cell('fash', 'shoe-last', `${CUTOUT} Shoe last form.`),
        cell('fash', 'bead-loom-fash', `${CUTOUT} Bead loom.`),
        cell('fash', 'press-iron-board', `${CUTOUT} Ironing board.`),
        cell('fash', 'trophy-fashion', `${CUTOUT} Fashion trophy blank.`),
      ]),
    ],
  }),

  'ki-drone-racing': wave('ki-drone-racing', {
    lane: 'other-discovered',
    bucket: 'other-discovered',
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'KI drone racing club NEW (3×3 ×3)',
    why: 'Discovered modern hobby — unbranded drone racing',
    sheets: [
      sh('S1', 'drones 3x3', 'black-contact-3x3', [
        cell('drone', 'racing-drone', `${CUTOUT} Racing quadcopter unbranded.`),
        cell('drone', 'camera-drone', `${CUTOUT} Camera drone.`),
        cell('drone', 'mini-drone', `${CUTOUT} Mini drone.`),
        cell('drone', 'controller-drone', `${CUTOUT} Drone transmitter blank.`),
        cell('drone', 'fpv-goggles', `${CUTOUT} FPV goggles blank.`),
        cell('drone', 'prop-guards', `${CUTOUT} Propeller guards.`),
        cell('drone', 'battery-drone', `${CUTOUT} Drone battery blank.`),
        cell('drone', 'charger', `${CUTOUT} Battery charger blank.`),
        cell('drone', 'carry-case', `${CUTOUT} Drone carry case.`),
      ]),
      sh('S2', 'race course 3x3', 'black-contact-3x3', [
        cell('drone', 'race-gate', `${CUTOUT} Drone race gate.`),
        cell('drone', 'flag-gate', `${CUTOUT} Flag gate.`),
        cell('drone', 'obstacle-hoop', `${CUTOUT} Obstacle hoop.`),
        cell('drone', 'start-finish', `${CUTOUT} Start/finish arch blank.`),
        cell('drone', 'timing-tower', `${CUTOUT} Timing tower blank.`),
        cell('drone', 'pit-table', `${CUTOUT} Pit table.`),
        cell('drone', 'tool-kit', `${CUTOUT} Hex tool kit.`),
        cell('drone', 'spare-props', `${CUTOUT} Spare propellers.`),
        cell('drone', 'wind-sock', `${CUTOUT} Wind sock.`),
      ]),
      sh('S3', 'club extras 3x3', 'black-contact-3x3', [
        cell('drone', 'map-course-blank', `${CUTOUT} Course map blank.`),
        cell('drone', 'radio-headset', `${CUTOUT} Radio headset.`),
        cell('drone', 'safety-vest', `${CUTOUT} Safety vest.`),
        cell('drone', 'cone-set', `${CUTOUT} Cone set.`),
        cell('drone', 'launch-pad', `${CUTOUT} Launch pad.`),
        cell('drone', 'landing-pad', `${CUTOUT} Landing pad.`),
        cell('drone', 'medal-drone', `${CUTOUT} Drone medal blank.`),
        cell('drone', 'trophy-drone', `${CUTOUT} Drone trophy blank.`),
        cell('drone', 'banner-blank', `${CUTOUT} Event banner ZERO letters.`),
      ]),
    ],
  }),

  'ow-wave15-harbor-resort': wave('ow-wave15-harbor-resort', {
    stockpile: 'overview-worlds',
    lane: 'overview',
    bucket: 'leisure',
    family_id: `${OW_PREFIX}wave15`,
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'OW wave15 — dive cove + stables + arcade pier (FULL-PAGE ×3)',
    why: 'NEW overviews matching scuba/horse/arcade',
    sheets: [
      sh('S1', 'dive cove overview', 'full-page-overview', [
        owCell('dive-cove', `${OVERVIEW} Dive cove resort: beach entry, dive shop blank, boat dock, reef lookout, path. 5 zones. No people/text.`),
      ]),
      sh('S2', 'stables ranch overview', 'full-page-overview', [
        owCell('stables-ranch', `${OVERVIEW} Riding ranch: stable barn, paddock, outdoor arena, trail gate, path. 5 zones. No people/text. NEW.`),
      ]),
      sh('S3', 'arcade pier overview', 'full-page-overview', [
        owCell('arcade-pier', `${OVERVIEW} Seaside arcade pier: boardwalk, arcade hall blank, prize plaza, kiosk blank, pier end. 5 zones. No logos/text. NEW.`),
      ]),
    ],
  }),

  'ow-wave16-campus-clubs': wave('ow-wave16-campus-clubs', {
    stockpile: 'overview-worlds',
    lane: 'overview',
    bucket: 'town-community',
    family_id: `${OW_PREFIX}wave16`,
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'OW wave16 — fashion + bike park + slime lab campuses (FULL-PAGE ×3)',
    why: 'NEW club campuses',
    sheets: [
      sh('S1', 'fashion campus overview', 'full-page-overview', [
        owCell('fashion-campus', `${OVERVIEW} Fashion campus: studio wing, fabric courtyard, mini runway, cafe terrace blank, path. 5 zones. No people/text. NEW.`),
      ]),
      sh('S2', 'bike park overview', 'full-page-overview', [
        owCell('bike-park', `${OVERVIEW} Bike park: pump track, jump line, skills area, repair shed, path. 5 zones. No people/text. NEW.`),
      ]),
      sh('S3', 'slime lab campus overview', 'full-page-overview', [
        owCell('slime-lab-campus', `${OVERVIEW} Slime lab building: workshop exterior, sensory garden, supply shed, picnic lawn, path. 5 zones. No people/text. NEW.`),
      ]),
    ],
  }),

  'ki-chess-mind-sports': wave('ki-chess-mind-sports', {
    lane: 'gaming-digital',
    bucket: 'gaming-digital',
    in_prompt_named: false,
    novelty: 'discovered-new',
    title: 'KI chess + mind sports NEW (3×3 ×2)',
    why: 'Discovered mind sports depth',
    sheets: [
      sh('S1', 'mind sports 3x3', 'black-contact-3x3', [
        cell('mind', 'chess-clock', `${CUTOUT} Chess clock blank.`),
        cell('mind', 'chess-board-open', `${CUTOUT} Open chess board mid-game.`),
        cell('mind', 'go-board', `${CUTOUT} Go board with stones.`),
        cell('mind', 'checkers-set', `${CUTOUT} Checkers set.`),
        cell('mind', 'backgammon', `${CUTOUT} Backgammon board.`),
        cell('mind', 'puzzle-cube', `${CUTOUT} Puzzle cube generic colors.`),
        cell('mind', 'tangram', `${CUTOUT} Tangram set.`),
        cell('mind', 'sudoku-blank', `${CUTOUT} Sudoku grid blank (no digits).`),
        cell('mind', 'trophy-chess', `${CUTOUT} Chess trophy blank.`),
      ]),
      sh('S2', 'club desk 3x3', 'black-contact-3x3', [
        cell('mind', 'score-sheet-blank', `${CUTOUT} Score sheet ZERO writing.`),
        cell('mind', 'demo-board', `${CUTOUT} Wall demo board blank.`),
        cell('mind', 'piece-bag', `${CUTOUT} Piece bag.`),
        cell('mind', 'timer-sand-mind', `${CUTOUT} Sand timer.`),
        cell('mind', 'thinking-cap', `${CUTOUT} Friendly thinking cap.`),
        cell('mind', 'medal-mind', `${CUTOUT} Mind-sports medal blank.`),
        cell('mind', 'club-banner-blank', `${CUTOUT} Club banner ZERO letters.`),
        cell('mind', 'table-lamp', `${CUTOUT} Desk lamp.`),
        cell('mind', 'notation-book-blank', `${CUTOUT} Notation book blank.`),
      ]),
    ],
  }),
};

export const WAVE_ORDER = [
  'ki-pets-variation',
  'ki-creator-digital',
  'ow-wave1-three-worlds',
  'ki-leisure-vehicles',
  'ki-crafts-sensory',
  'ki-discovered-clubs',
  'ki-sports-active',
  'ow-wave2-adventure',
  'ki-music-life',
  'ki-hobby-social',
  'ow-wave3-town-event',
  'ki-waterpark-splash',
  'ki-collect-curios',
  'ki-circus-skills',
  'ow-wave4-play-districts',
  'ki-makerspace-large',
  'ki-outdoor-adventure-gear',
  'ki-dance-stage',
  'ow-wave5-learn-play',
  'ki-tabletop-party',
  'ki-pet-training',
  'ki-music-electronic',
  'ki-gaming-desk-depth',
  'ow-wave6-transit-nature',
  'ki-puppet-theatre',
  'ki-garden-grow',
  'ki-astronomy-club',
  'ki-cooking-kid',
  'ki-sports-street-deep',
  'ki-origami-paper-craft',
  'ki-fair-rides-deep',
  'ki-photography-club',
  'ki-magic-show-deep',
  'ki-robotics-club',
  'ki-slime-lab-deep',
  'ki-bike-park-gear',
  // aggro wave5
  'ki-scuba-snorkel',
  'ki-horse-stable',
  'ki-arcade-pinball',
  'ow-wave15-harbor-resort',
  'ki-fashion-design',
  'ow-wave16-campus-clubs',
  'ki-drone-racing',
  'ki-chess-mind-sports',
];

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function stockpileRoot(wave) {
  return wave.stockpile === 'overview-worlds' ? OW_ROOT : KI_ROOT;
}

function waveOutDir(wave) {
  if (wave.stockpile === 'overview-worlds') {
    const bucket = wave.bucket || 'other-discovered';
    return path.join(OW_ROOT, bucket, wave.id);
  }
  const bucket = wave.bucket || 'other-discovered';
  return path.join(KI_ROOT, bucket, wave.id);
}

function expectedSheets(wave) {
  return wave.sheets.length;
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

function allStockpileRunJsons() {
  return [...walkRunJsons(KI_ROOT), ...walkRunJsons(OW_ROOT)];
}

function listInFlight(excludeWaveId = '') {
  const hits = [];
  for (const runPath of allStockpileRunJsons()) {
    let prev;
    try {
      prev = JSON.parse(fs.readFileSync(runPath, 'utf8'));
    } catch {
      continue;
    }
    if (prev.task_id && !prev.finished_at && prev.wave !== excludeWaveId) {
      hits.push({ wave: prev.wave, task_id: prev.task_id, runPath });
    }
  }
  return hits;
}

function sheetBlock(sheet) {
  const lines = sheet.cells.map((c, i) => `${i + 1}. ${c.key} — ${c.brief}`);
  if (sheet.format === 'full-page-overview' || sheet.format === 'full-page-base') {
    return `SHEET ${sheet.id} — ${sheet.title}
Format: ONE full-page landscape PNG overview world (NOT a contact grid). ~16:9.
${lines.join('\n')}`;
  }
  return `SHEET ${sheet.id} — ${sheet.title}
Format: ONE landscape PNG black-field contact sheet, 3×3 grid, LARGE BOARD-SCALE cells.
Keys: ${sheet.cells.map((c) => c.key).join(',')}
${lines.join('\n')}`;
}

function buildBrief(wave) {
  const sheets = wave.sheets.map(sheetBlock).join('\n\n');
  const kind =
    wave.stockpile === 'overview-worlds'
      ? 'FULL-PAGE overview worlds (never cram into 3×3 cells).'
      : 'BLACK-FIELD 3×3 contact sheets for prop families.';
  return withEslAssetGeneratorBrief(`${STYLE}

TASK: Manufacture stockpile art for ClassIn ESL. ${kind}
Wave: ${wave.id} — ${wave.title}
Why: ${wave.why}
Novelty tag: ${wave.novelty}

Deliver exactly ${expectedSheets(wave)} PNG sheet(s). Keep working inside THIS task (5+5+1 if needed) until every sheet exists.
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
  fs.mkdirSync(KI_ROOT, { recursive: true });
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
    const msg = String(err && err.message || err);
    if (!/429|rate/i.test(msg)) throw err;
    console.error(JSON.stringify({ phase: 'rate-wait', ms: RATE_WAIT_MS, err: msg }));
    await new Promise((r) => setTimeout(r, RATE_WAIT_MS));
    return fn();
  }
}

function emptyInv() {
  return {
    kind: 'kid-interest-shift60',
    prefix: PREFIX,
    ow_prefix: OW_PREFIX,
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

function recomputeTotals(inv) {
  const waves = Object.values(inv.waves || {});
  const fams = Object.values(inv.families || {});
  const newFams = fams.filter((f) => f.novelty === 'discovered-new').length;
  const named = fams.filter((f) => f.in_prompt_named).length;
  inv.running_total = {
    tasks: waves.filter((w) => w.task_id).length,
    sheets_downloaded: waves.reduce((n, w) => n + (w.sheets || []).length, 0),
    waves_planned: WAVE_ORDER.length,
    waves_done: waves.filter((w) => w.finished_at && (w.sheets || []).length >= (w.expected_sheets || 1)).length,
    asset_cells: waves.reduce((n, w) => n + (w.cell_count || 0), 0),
    families: fams.length,
    novelty_discovered_families: newFams,
    prompt_named_families: named,
    novelty_pct: fams.length ? Math.round((newFams / fams.length) * 100) : 0,
  };
}

function writeInv(inv) {
  inv.updated_at = new Date().toISOString();
  if (!inv.waves) inv.waves = {};
  if (!inv.families) inv.families = {};
  recomputeTotals(inv);
  fs.mkdirSync(KI_ROOT, { recursive: true });
  fs.mkdirSync(OW_ROOT, { recursive: true });
  fs.mkdirSync(path.dirname(path.join(ROOT, INV_REL)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, INV_REL), JSON.stringify(inv, null, 2));
  return path.join(ROOT, INV_REL);
}

function upsertInventory(wave, dump) {
  const inv = loadInv();
  const siblings = wave.sheets.flatMap((sh) => sh.cells.map((c) => c.key));
  const haveLarge = (dump.saved || []).filter((x) => x.bytes > 80_000).length >= expectedSheets(wave);
  inv.waves[wave.id] = {
    family_id: wave.family_id,
    title: wave.title,
    lane: wave.lane,
    stockpile: wave.stockpile,
    novelty: wave.novelty,
    in_prompt_named: wave.in_prompt_named,
    task_id: dump.task_id || null,
    task_url: dump.task_url || null,
    agent_status: dump.agent_status || null,
    sheet_dir: dump.sheet_dir || null,
    expected_sheets: expectedSheets(wave),
    cell_count: siblings.length,
    sheets: (dump.saved || []).map((x) => ({ file: x.file || path.basename(x.dest || ''), bytes: x.bytes, name: x.name || null })),
    finished_at: dump.finished_at || null,
    holds: dump.holds || [],
    qa: dump.qa || '',
  };
  const prev = inv.families[wave.family_id] || {};
  inv.families[wave.family_id] = {
    family_id: wave.family_id,
    wave: wave.id,
    lane: wave.lane,
    stockpile: wave.stockpile,
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
  try {
    if (!fs.existsSync(p)) {
      fs.writeFileSync(
        p,
        `# Kid-interest + overview-worlds manufacture log\n\nStockpile only. Art → \`${KI_REL}/\` + \`${OW_REL}/\` (do not git-add PNG).\n\n## Events\n\n${block}`,
      );
    } else {
      fs.appendFileSync(p, block);
    }
  } catch (err) {
    console.error(JSON.stringify({ phase: 'append-log-skip', err: String(err.message || err), line }));
  }
}

function writeDocStub(inv) {
  const tot = inv.running_total || {};
  const lines = [
    '# Kid-interest + overview-worlds manufacture log',
    '',
    'Stockpile only. No producer wiring.',
    `Art: \`${KI_REL}/\` + \`${OW_REL}/\` (PNG — **do not git-add**).`,
    'Tracked: `scripts/manus/request-kid-interest-shift60.mjs`, audit/portfolio docs, inventory JSON, this log.',
    '',
    '## Running totals',
    '',
    '| Metric | Count |',
    '|---|---:|',
    `| Waves planned | ${tot.waves_planned || WAVE_ORDER.length} |`,
    `| Tasks | ${tot.tasks || 0} |`,
    `| Sheets downloaded | ${tot.sheets_downloaded || 0} |`,
    `| Waves done | ${tot.waves_done || 0} |`,
    `| Asset cells | ${tot.asset_cells || 0} |`,
    `| Novelty (discovered families %) | ${tot.novelty_pct || 0}% |`,
    '',
    '## Waves',
    '',
  ];
  for (const id of WAVE_ORDER) {
    const meta = WAVES[id];
    const fam = (inv.families || {})[meta.family_id];
    const w = (inv.waves || {})[id];
    const status = (fam && fam.status) || 'unfired';
    const url = (w && w.task_url) || (fam && fam.task_url) || 'unfired';
    const cells = meta.sheets.reduce((n, sh) => n + sh.cells.length, 0);
    const sheets = expectedSheets(meta);
    lines.push(
      `- **${id}** \`${meta.family_id}\` — ${status} — novelty=${meta.novelty} — ${url} — ${sheets} sheets / ${cells} cells — ${meta.why}`,
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
    const alt = path.join(ROOT, 'docs', 'kid-interest-shift60-log.write.tmp.md');
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

  fs.mkdirSync(stockpileRoot(wave), { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(SHEET_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, 'keys.json'),
    JSON.stringify(
      {
        wave: wave.id,
        family_id: wave.family_id,
        lane: wave.lane,
        stockpile: wave.stockpile,
        novelty: wave.novelty,
        in_prompt_named: wave.in_prompt_named,
        siblings: wave.sheets.flatMap((sh) => sh.cells.map((c) => c.key)),
        expected_sheets: NEED_SHEETS,
        sheets: wave.sheets.map((sh) => ({
          id: sh.id,
          title: sh.title,
          format: sh.format,
          keys: sh.cells.map((c) => c.key),
        })),
      },
      null,
      2,
    ),
  );

  const dump = {
    started_at: new Date().toISOString(),
    kind: 'kid-interest-shift60',
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
    if (inflight.length >= MAX_IN_FLIGHT) {
      console.error(
        `REFUSING fire — ${inflight.length} in-flight (max ${MAX_IN_FLIGHT}). Busy: ${inflight.map((x) => x.wave).join(', ')}`,
      );
      process.exit(3);
    }
    if (inflight.length >= PREFER_IN_FLIGHT) {
      console.error(
        JSON.stringify({
          phase: 'warn-prefer-cap',
          inflight: inflight.length,
          prefer: PREFER_IN_FLIGHT,
          busy: inflight.map((x) => x.wave),
        }),
      );
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
          `Continue THIS task. You returned ${large.length} usable PNG sheet(s); we need exactly ${NEED_SHEETS} sheet(s) listed in the original brief. Do not restart. Do not add text/logos/brands. Keep firing generate_image until every listed sheet exists.`,
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
    appendLog(`DOWNLOADED ${wave.id} qa=${dump.qa} sheets=${saved.length} large=${large.length}/${NEED_SHEETS} → ${SHEET_DIR}`);
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
  const auditPath = path.join(ROOT, AUDIT_MD);
  const portPath = path.join(ROOT, PORTFOLIO_JSON);
  console.log(
    JSON.stringify(
      {
        phase: 'audit',
        audit_md: fs.existsSync(auditPath) ? AUDIT_MD : 'MISSING',
        portfolio_json: fs.existsSync(portPath) ? PORTFOLIO_JSON : 'MISSING',
        waves: WAVE_ORDER.map((id) => {
          const w = WAVES[id];
          return {
            id,
            novelty: w.novelty,
            in_prompt_named: w.in_prompt_named,
            sheets: expectedSheets(w),
            cells: w.sheets.reduce((n, s) => n + s.cells.length, 0),
            stockpile: w.stockpile,
          };
        }),
        inflight: listInFlight(),
      },
      null,
      2,
    ),
  );
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
    String(process.argv[1]).endsWith('request-kid-interest-shift60.mjs'));
if (isDirect) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
