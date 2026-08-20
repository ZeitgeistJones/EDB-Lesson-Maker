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
export const PREFER_IN_FLIGHT = 3;

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
  if (!fs.existsSync(p)) {
    fs.writeFileSync(
      p,
      `# Kid-interest + overview-worlds manufacture log\n\nStockpile only. Art → \`${KI_REL}/\` + \`${OW_REL}/\` (do not git-add PNG).\n\n## Events\n\n${block}`,
    );
  } else {
    fs.appendFileSync(p, block);
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
