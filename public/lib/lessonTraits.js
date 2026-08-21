/* lessonTraits.js — per-lesson / per-topic trait registry (producer seam).
 * Classic script → window.LessonTraits
 *
 * WHY THIS EXISTS
 * The board producer used to branch inline on topic strings (if music / if
 * feelings / if dental …) in several places. That made adding a new topic mean
 * more inline `if` branches. This module expresses those decisions as DATA:
 * ordered topic matchers + a hint table + a resolver. Routing the inline
 * conditionals through here is behavior-preserving — the regexes and strings
 * below are byte-identical to the ones they replace — so adding a new topic
 * becomes "add a matcher + a hint row", not "add another if".
 *
 * THEME LOCK (resolveTheme)
 * Pick ONE lesson theme up front from title + vocab + activity title
 * (never sampleAnswer). PropBank.assessKit / findHeroProp / title charm must
 * stay inside that theme's packs — or fall to sortBins / no charm / generic
 * outline when id is 'none'. Stops pack-tag Whac-A-Mole (cat→space, ball→slide).
 */
(function () {
  // Topic matchers — kept byte-identical to the inline regexes they replace.
  // Callers pass their own cue string; we never change what gets tested, only
  // where the pattern lives.
  const RE = {
    feelingsCore: /\b(feeling|feelings|emotion|emotions|mood)\b/,
    feelingsWords: /\b(worried|scared|shy|confused|proud|surprised|happy|sad|angry|bored|sleepy|excited|tired)\b/,
    faceGuard: /\b(hair|eyes|nose|ear|ears|make.?a.?face)\b/,
    faceCue: /face|hair|eyes|make.?a.?face/,
    // "patient" is general clinic/hospital — do not steal doctor lessons onto
    // the dental open-mouth stage (hospital quality loop).
    dental: /\b(dentist|dental|tooth|teeth|cavity|floss)\b/,
    hospital: /\b(doctor|clinic|hospital|nurse|medical|checkup|diagnosis|symptoms?|prescription|appointment|fever|sick)\b/,
    castle: /\b(castle|knight|dragon|royal|fortress|portcullis)\b/,
    trampoline: /\b(trampoline|bounce|backflip)\b/,
    // Performance music only — bare "music" as a school-club vocab word must not
    // unlock the orchestra king (clubs regen → piano + musicians on a gym).
    music: /\b(compose|composer|orchestra|symphony|concert|classical|melody|harmony|piano|violin)\b/,
    clubs: /\b(club|clubs|hobby|hobbies|booth|fair)\b/,
    beach: /\b(beach|shore|seaside|sandcastle|ocean|seashell)\b/,
    // Theme-lock extras (blob cues — not pack-tag scoring).
    space: /\b(space|spaceships?|spacecraft|rockets?|astronauts?|aliens?|planets?|nasa|orbit|galaxy|nebula|satellites?|mars|lunar)\b/,
    cafe: /\b(cafes?|caf[eé]s?|coffee\s*shops?|bakerys?|bake\s*shops?|restaurants?|diners?|barista)\b/,
    farm: /\b(farms?|barns?|tractors?|scarecrows?|hay\s*bales?)\b/,
    playground: /\b(playgrounds?|play\s*structures?|seesaws?|swing\s*sets?)\b/,
    sports: /\b(sports?|sporty|basketball|soccer|football|tennis|baseball|volleyball|gym|athletic|athletics|coach|whistle|goalkeeper|kickoff|pitch)\b/,
    circus: /\b(circus|clowns?|acrobats?|trapeze|carnival)\b/,
    fruit: /\b(fruit|fruits|market|produce|veggie|veggies|vegetable|vegetables)\b/,
    produceItem: /\b(apple|banana|carrot|tomato|lemon|grape)\b/,
    schoolPet: /\b(homework|schools?|classrooms?|teachers?|students?)\b/,
    petCue: /\b(cats?|dogs?|pets?|kittens?|puppies?|milk)\b/,
    bathroom: /\b(bathrooms?|bathtub|toiletries|toothbrush|towel|soap|shampoo)\b/,
    // Dishwashing / kitchen sink (not bathroom wash-up / face wash).
    washUp: /\b(wash(?:ing)?\s*up|dishwashing|washing\s*dishes|do\s*the\s*dishes)\b/,
    kitchenWash: /\b(sink|sponge)\b/,
    kitchenWashMate: /\b(plate|plates|dishes|dish|dry|dishwasher|dinner)\b/,
    kitchenCook: /\b(kitchen|cooking|cook|chef|bake|baking|stove|oven|spatula|whisk|blender|grater|apron|helpers?)\b/,
    fire: /\b(fire\s*stations?|firehouses?|firefighters?|firemen|fireman|fire\s*trucks?|fire\s*engines?|fire\s*safety)\b/,
    camp: /\b(campsites?|camping|campfire)\b/,
    construction: /\b(construction|building\s*sites?|hard\s*hats?|excavators?)\b/,
    aquarium: /\b(aquariums?|fish\s*tanks?|coral\s*reefs?)\b/,
    dollhouse: /\b(dollhouses?|doll\s*houses?|furniture|home\s*tour)\b/,
    museum: /\b(museums?|galler(?:y|ies)|exhibits?|exhibition)\b/,
  };

  // King-stage instruction copy, keyed by resolved king type. `default` is the
  // sane fallback (unknown lessons read exactly as before).
  const KING_HINTS = {
    default: 'Build the world with the pieces. Then point and say: I put the ___ ___.',
    feelings: '<b>Round 1:</b> drag a feeling face onto the blank face; write or say how it feels.<br><b>Round 2:</b> your partner reads the face, names the feeling, then answers with If I felt ____, I would ____.',
    face: 'Drag eyes, nose, mouth, and hair onto the face. Then say: My friend has ___',
    dental: 'Help the patient. Drag a tool to the mouth. Then say: I use the ___ to ___.',
    hospital: 'Help the patient. Drag a tool to the bed. Then say: I use the ___ to ___.',
    castle: 'Build the castle with the pieces. Then say: I put the ___ on the castle.',
    trampoline: 'Make a safe bounce scene. Then say: I use the ___ to ___.',
    music: 'Build the concert on the stage. Then say: The ___ plays ___.',
    beach: 'Build the beach world. Then say: I put the ___ by the sandcastle.',
    fire: 'Build the fire-rescue scene. Then say: I use the ___ to ___.',
    camp: 'Build the campsite around the tent. Then say: I put the ___ by the tent.',
    bathroom: 'Build the wash-up scene. Then say: I use the ___ to ___.',
    playground: 'Build the playground. Then say: I put the ___ by the slide.',
    cafe: 'Build the cafe counter. Then say: I put the ___ on the counter.',
    farm: 'Build the farmyard. Then say: I put the ___ by the barn.',
    aquarium: 'Build the aquarium. Then say: I put the ___ in the tank.',
    construction: 'Build the construction site. Then say: I use the ___ to ___.',
    dollhouse: 'Build the rooms. Then say: I put the ___ in the ___ room.',
    chest: 'Drag treasure into the chest. Then say: I found a ___.',
    backpack: 'Drag things into the backpack. Then say: I packed the ___.',
    pizza: 'Drag toppings onto the pizza. Then say: I made a ___ pizza.',
    mouth: 'Drag food into the mouth. Then say: It ate the ___.',
    fridge: 'Drag food into the fridge. Then say: I put away the ___.',
    putIn: 'Drag things inside. Then say: I put the ___ inside.',
    oven: 'Drag food into the oven. Then say: I baked the ___.',
    laundry: 'Drag clothes into the basket. Then say: I washed the ___.',
    fort: 'Drag things into the fort. Then say: I brought the ___.',
  };

  const KING_MISSIONS = {
    default: 'Build the World!',
    feelings: 'Show a Feeling!',
    face: 'Make a Face!',
    dental: 'Help the Dentist!',
    hospital: 'Help the Patient!',
    castle: 'Build the Castle!',
    trampoline: 'Plan a Safe Bounce!',
    music: 'Build the Concert!',
    beach: 'Build the Beach World!',
    fire: 'Build the Rescue Scene!',
    camp: 'Build the Campsite!',
    bathroom: 'Build the Wash-Up Scene!',
    playground: 'Build the Playground!',
    cafe: 'Build the Cafe!',
    farm: 'Build the Farmyard!',
    aquarium: 'Build the Aquarium!',
    construction: 'Build the Work Site!',
    dollhouse: 'Build the Rooms!',
    chest: 'Fill the Treasure Chest!',
    backpack: 'Pack the Backpack!',
    pizza: 'Make the Food!',
    mouth: 'Feed the Character!',
    fridge: 'Stock the Fridge!',
    putIn: 'Fill the Scene!',
    oven: 'Bake the Food!',
    laundry: 'Pack the Laundry!',
    fort: 'Build the Fort!',
  };

  // Play-surface kings: hint from the actual hero key so "backpack" vocab on a
  // camping tent lesson cannot steal the chest/backpack copy.
  const HERO_KEY_HINTS = {
    'dental-kid-open-mouth': 'dental',
    'hospital-bed': 'hospital',
    'castle-wall-gate': 'castle',
    'trampoline': 'trampoline',
    'fire-truck': 'fire',
    'tent': 'camp',
    'bath-bathtub': 'bathroom',
    'bath-sink': 'bathroom',
    'playground-slide': 'playground',
    'cafe-counter-stage': 'cafe',
    'farm-barn': 'farm',
    'aquarium-tank': 'aquarium',
    'construction-tower-crane': 'construction',
    'dollhouse-cutaway': 'dollhouse',
    'hero-chest-open': 'chest',
    'hero-backpack-open': 'backpack',
    'hero-pizza-base': 'pizza',
    'hero-sandwich-base': 'pizza',
    'hero-animal-mouth': 'mouth',
    'hero-monster-mouth': 'mouth',
    'hero-fridge-open': 'fridge',
    'hero-freezer-open': 'fridge',
    'hero-oven-open': 'oven',
    'hero-microwave-open': 'oven',
    'hero-toaster-open': 'oven',
    'hero-air-fryer-open': 'oven',
    'hero-grill-open': 'oven',
    'hero-dishwasher-open': 'putIn',
    'hero-blender-open': 'putIn',
    'hero-pantry-open': 'putIn',
    'hero-box-open': 'putIn',
    'hero-suitcase-open': 'backpack',
    'hero-cupboard-open': 'putIn',
    'hero-drawer-open': 'putIn',
    'hero-curtain-open': 'putIn',
    'hero-locker-open': 'putIn',
    'hero-envelope-open': 'putIn',
    'hero-gift-box-open': 'putIn',
    'hero-mailbox-open': 'putIn',
    'hero-washing-machine-open': 'laundry',
    'hero-laundry-basket-open': 'laundry',
    'hero-recycling-bin-open': 'putIn',
    'hero-vending-machine-open': 'putIn',
    'hero-garage-open': 'putIn',
    'hero-safe-open': 'chest',
    'hero-barrel-open': 'putIn',
    'hero-shelf': 'putIn',
    'hero-lunch-tray': 'pizza',
    'hero-garden-patch': 'putIn',
    'hero-toolbox-open': 'putIn',
    'hero-toy-box-open': 'putIn',
    'hero-picnic-basket-open': 'backpack',
    'hero-cooler-open': 'putIn',
    'hero-wardrobe-open': 'putIn',
    'hero-cubby-open': 'putIn',
    'hero-lunchbox-open': 'backpack',
    'hero-cookie-jar-open': 'putIn',
    'hero-piggy-bank-open': 'chest',
    'hero-jewelry-box-open': 'putIn',
    'hero-craft-box-open': 'putIn',
    'hero-paint-box-open': 'putIn',
    'hero-pencil-case-open': 'putIn',
    'hero-school-desk-open': 'putIn',
    'hero-medicine-cabinet-open': 'putIn',
    'hero-wooden-crate-open': 'putIn',
    'hero-trash-can-open': 'putIn',
    'hero-compost-bin-open': 'putIn',
    'hero-blanket-fort-open': 'fort',
    'hero-cave-open': 'fort',
    'hero-treehouse-open': 'fort',
    'hero-playhouse-open': 'fort',
    'hero-puppet-theater-open': 'fort',
    'hero-birdcage-open': 'putIn',
    'hero-pet-carrier-open': 'putIn',
    'hero-train-car-open': 'putIn',
    'hero-bus-door-open': 'putIn',
    'hero-school-bus-door-open': 'putIn',
    'hero-subway-door-open': 'putIn',
    'hero-elevator-door-open': 'putIn',
    'hero-ferry-gate-open': 'putIn',
    'hero-taxi-trunk-open': 'backpack',
    'hero-ambulance-back-open': 'putIn',
    'hero-fire-truck-compartment-open': 'putIn',
    'hero-police-trunk-open': 'putIn',
    'hero-helicopter-door-open': 'putIn',
    'hero-sailboat-cabin-open': 'putIn',
    'hero-submarine-hatch-open': 'putIn',
    'hero-hot-air-balloon-basket-open': 'putIn',
    'hero-gondola-cabin-open': 'putIn',
    'hero-cable-car-cabin-open': 'putIn',
    'hero-ski-lift-chair-open': 'putIn',
    'hero-pirate-ship-hatch-open': 'chest',
    'hero-train-platform': 'putIn',
    'hero-subway-platform': 'putIn',
    'hero-helipad': 'putIn',
    'hero-ferry-deck': 'putIn',
    'hero-tram-stop': 'putIn',
    'hero-monorail-platform': 'putIn',
    'hero-airport-baggage-carousel': 'backpack',
    'hero-runway-marker': 'putIn',
    'hero-cable-car-station': 'putIn',
    'hero-easter-basket-open': 'putIn',
    'hero-trick-or-treat-bucket-open': 'putIn',
    'hero-christmas-stocking-open': 'putIn',
    'hero-advent-calendar-box-open': 'putIn',
    'hero-valentine-mailbox-open': 'putIn',
    'hero-party-pinata-open': 'putIn',
    'hero-fireworks-box-open': 'putIn',
    'hero-fortune-cookie-jar-open': 'putIn',
    'hero-gingerbread-house-door-open': 'fort',
    'hero-nativity-stable-open': 'fort',
    'hero-ornament-box-open': 'putIn',
    'hero-wreath-storage-box-open': 'putIn',
    'hero-snow-globe-base-open': 'putIn',
    'hero-maypole-base-open': 'putIn',
    'hero-carnival-game-booth-open': 'putIn',
    'hero-birthday-present-stack-open': 'putIn',
    'hero-gift-sack-open': 'putIn',
    'hero-pumpkin-patch-bin-open': 'putIn',
    'hero-corn-maze-gate-open': 'fort',
    'hero-beach-cooler-tub-open': 'putIn',
    'hero-sledding-hill': 'putIn',
    'hero-ice-rink-edge': 'putIn',
    'hero-sand-castle-mold': 'putIn',
    'hero-snowman-base': 'putIn',
    'hero-leaf-pile': 'putIn',
    'hero-puddle': 'putIn',
    'hero-campfire-log-ring': 'putIn',
    'hero-kite-ground-spot': 'putIn',
    'hero-parade-float-platform': 'putIn',
    'hero-festival-booth-counter': 'putIn',
  };

  // Ordered regex-tested king types (checked only after the caller-supplied
  // feelings/face booleans). Order MUST match the original else-if cascade:
  // dental → hospital → castle → trampoline → music → beach.
  const KING_TYPE_RULES = [
    { type: 'dental', re: RE.dental },
    { type: 'hospital', re: RE.hospital },
    { type: 'castle', re: RE.castle },
    { type: 'trampoline', re: RE.trampoline },
    { type: 'music', re: RE.music },
    { type: 'beach', re: RE.beach },
  ];

  const THEME_NONE = Object.freeze({
    id: 'none',
    pack: null,
    packs: Object.freeze([]),
    heroKey: null,
    charmPrefer: null,
    charmEmpty: true,
    charmBan: null,
  });

  function vocabWords(lesson) {
    return ((lesson && lesson.vocabulary) || [])
      .map((v) => (typeof v === 'string' ? v : v && v.word))
      .filter(Boolean);
  }

  /**
   * Theme blob for resolveTheme — title + vocab + activity title ONLY.
   * Never sampleAnswer / warm-up prose (incidental "bus" / "star" steal).
   */
  function themeBlob(lesson) {
    const bits = [
      lesson && lesson.title,
      lesson && lesson.activity && lesson.activity.title,
      ...vocabWords(lesson),
    ];
    return bits.filter(Boolean).join(' ').toLowerCase();
  }

  function themeOf(id, pack, packs, heroKey, opts) {
    opts = opts || {};
    const list = packs && packs.length ? packs.slice() : (pack ? [pack] : []);
    return {
      id,
      pack: pack || null,
      packs: list,
      heroKey: heroKey || null,
      // Title charm: ordered PropBank keys (sharp + dockSafe). Empty beats wrong art.
      charmPrefer: Array.isArray(opts.charmPrefer) ? opts.charmPrefer.slice() : null,
      charmEmpty: !!opts.charmEmpty,
      // Extra key bans for this theme (RegExp source or RegExp).
      charmBan: opts.charmBan || null,
    };
  }

  /** Shared bans: instruments / stick-charms / white-fringe balls on non-music titles. */
  const CHARM_BAN_INSTRUMENT =
    /^(musician-|music-|mus-|hobby-flute)|flute|violin|cello|clarinet|trumpet|trombone|oboe|bassoon|harp|piano|saxophone|xylophone|piccolo|recorder|harmonica/;
  const CHARM_BAN_STICK =
    /relay-baton|baton|hockey-stick|golf-club|baseball-bat|sport-bat\b|pointer-stick|craft-stick|ski-pole|walking-stick|marshmallow-stick|magic-wand|star-wand|conductor/;
  const CHARM_BAN_FRINGE_BALL =
    /^(soccer-ball|sport-soccer|sports-soccer-ball|soccer-ball-orange)$/;
  const CHARM_BAN_SPORTS = new RegExp(
    `(?:${CHARM_BAN_INSTRUMENT.source})|(?:${CHARM_BAN_STICK.source})|(?:${CHARM_BAN_FRINGE_BALL.source})`,
    'i'
  );

  /**
   * One lesson → one theme (or none). First strong match wins.
   * Callers force pickers inside theme.packs; id 'none' → no ready kit / no king.
   * Title art uses theme.charmPrefer / charmEmpty (not per-topic ifs in render).
   */
  function resolveTheme(lesson) {
    const blob = themeBlob(lesson);
    if (!blob.trim()) return THEME_NONE;

    // dental — real dentistry cue (bare "teeth" in a wash routine is bathroom)
    if (
      RE.dental.test(blob)
      && /\b(dentist|dental|cavity|floss|filling|molar|plaque|check.?up)\b/.test(blob)
    ) {
      return themeOf('dental', 'dental', ['dental', 'dentist'], 'dental-kid-open-mouth', {
        charmPrefer: ['dental-kid-open-mouth', 'dental-toothbrush', 'dental-floss'],
      });
    }

    // hospital — after dental so "dental checkup" stays dental
    if (RE.hospital.test(blob)) {
      return themeOf('hospital', 'hospital', ['hospital'], 'hospital-bed', {
        charmPrefer: ['hospital-bed', 'hospital-stethoscope', 'stethoscope'],
      });
    }

    // face — structural cues only (NOT lone happy/sad → circus must not face-blank)
    if (
      RE.faceCue.test(blob)
      && !RE.bathroom.test(blob)
    ) {
      return themeOf('face', 'face', ['face', 'faces'], 'face-blank', {
        charmPrefer: ['face-blank'],
      });
    }

    // feelings — feelingsCore only (emotion word lists without "feelings" stay off)
    if (RE.feelingsCore.test(blob)) {
      return themeOf('feelings', 'face', ['face', 'faces', 'feelings'], 'face-blank', {
        charmPrefer: ['face-blank'],
      });
    }

    // castle before beach sandcastle? beach owns sandcastle via RE.beach
    if (RE.castle.test(blob) && !/\b(sand|sandcastle|beach|shore|seaside)\b/.test(blob)) {
      return themeOf('castle', 'castle', ['castle'], 'castle-wall-gate', {
        charmPrefer: ['castle-wall-gate', 'castle-tower', 'castle-flag'],
      });
    }

    if (RE.trampoline.test(blob)) {
      return themeOf('trampoline', 'trampoline', ['trampoline'], 'trampoline', {
        charmPrefer: ['trampoline'],
      });
    }

    // Classical music only — school-club lessons never claim the orchestra kit
    // (same clubs veto as kingTypeFor). Terrace already paints instruments — no charm.
    if (RE.music.test(blob) && !RE.clubs.test(blob)) {
      return themeOf('music', 'music', ['music'], 'concert-harp', {
        charmEmpty: true,
      });
    }

    if (RE.beach.test(blob)) {
      return themeOf('beach', 'beach', ['beach'], 'beach-sandcastle', {
        charmPrefer: ['beach-sandcastle', 'beach-bucket', 'beach-shell'],
      });
    }

    // space — real space cues only (bare "star" / "moon" reward words do not count)
    if (RE.space.test(blob)) {
      return themeOf('space', 'space', ['space'], null, {
        charmPrefer: [
          'space-rocket-cutaway', 'space-spacesuit', 'space-spacesuit-v2',
          'space-rocket-v2', 'space-rocket', 'space-astronaut-helmet',
          'space-astronaut-helmet-v2', 'space-helmet-white', 'space-star',
        ],
      });
    }

    // fruit / market → none (empty > cafe/farm king)
    if (
      (RE.fruit.test(blob) || RE.produceItem.test(blob))
      && !RE.cafe.test(blob)
      && !RE.farm.test(blob)
    ) {
      return THEME_NONE;
    }

    if (RE.cafe.test(blob)) {
      return themeOf('cafe', 'cafe', ['cafe'], 'cafe-counter-stage', {
        charmPrefer: ['cafe-counter-stage', 'cafe-coffee-cup', 'cafe-croissant'],
      });
    }

    if (RE.farm.test(blob)) {
      return themeOf('farm', 'farm', ['farm'], 'farm-barn', {
        charmPrefer: ['farm-barn', 'farm-tractor', 'farm-cow'],
      });
    }

    // sports before playground — ball/hoop must not claim playground-slide
    if (
      RE.sports.test(blob)
      || (/\b(court|hoops?|score|team|teams)\b/.test(blob) && /\bballs?\b/.test(blob))
    ) {
      const soccer = /\b(soccer|football|goalkeeper|kickoff|pitch|fifa)\b/.test(blob)
        && !/\bbasketball\b/.test(blob);
      const basketball = /\bbasketball\b/.test(blob);
      const prefer = soccer
        ? ['sports-whistle', 'sport-gold-medal', 'soccer-goal', 'soccer-goal-stage', 'sport-soccer']
        : basketball
          ? ['sport-basketball', 'sport-gold-medal', 'sports-whistle']
          : ['sports-whistle', 'sport-gold-medal', 'sport-soccer', 'sport-basketball'];
      return themeOf('sports', 'sports', ['sports'], null, {
        charmPrefer: prefer,
        charmBan: CHARM_BAN_SPORTS,
      });
    }

    if (
      RE.playground.test(blob)
      || (
        /\b(slides?|swings?)\b/.test(blob)
        && /\b(playgrounds?|park|recess|seesaws?|climbing\s*frame|jungle\s*gym|monkey\s*bars|sandpit)\b/.test(blob)
      )
    ) {
      return themeOf('playground', 'playground', ['playground'], 'playground-slide', {
        charmPrefer: ['playground-slide', 'playground-swing', 'swing'],
      });
    }

    // circus — pack may exist but no king hero; never face-blank on "happy" alone
    if (RE.circus.test(blob)) {
      return themeOf('circus', 'circus', ['circus'], null, {
        charmPrefer: ['circus-tent', 'circus-clown', 'circus-balloon'],
      });
    }

    // school / pet / homework → none (empty > space/farm/cafe via milk/cat/star tags)
    if (
      /\bhomework\b/.test(blob)
      || (RE.schoolPet.test(blob) && RE.petCue.test(blob))
      || /\bpet\s*day\b/.test(blob)
    ) {
      return THEME_NONE;
    }

    // Established place kings (KEEP cases) — after adversarial rules
    // Kitchen wash-up BEFORE bathroom — "washing up" + plate/sink is dishes,
    // not a bathtub lesson (empty used to win; bath-sink is the kitchen stage).
    if (
      RE.washUp.test(blob)
      || (RE.kitchenWash.test(blob) && RE.kitchenWashMate.test(blob))
    ) {
      return themeOf('kitchen', 'kitchen', ['kitchen'], 'bath-sink', {
        charmPrefer: ['bath-sink', 'bake-whisk', 'kitchen-spatula'],
      });
    }

    if (RE.bathroom.test(blob) || (
      /\b(bath\b|showers?|wash\s*up|routines?)\b/.test(blob)
      && /\b(bathrooms?|bathtub|toilet|tooth|teeth|toothbrush|towel|soap|shampoo|mirror|bathe|bathing|wash\s*(?:your\s*)?face)\b/.test(blob)
    )) {
      return themeOf('bathroom', 'bathroom', ['bathroom'], 'bath-bathtub', {
        charmPrefer: ['bath-bathtub', 'bath-toothbrush', 'bath-towel'],
      });
    }

    // Cooking / kitchen place without a dish-wash cue — kitchen + bakery +
    // cooking packs (bake-whisk / bake-apron are dock-sharp; densify kitchen-*
    // white-plates are not). No king (empty > steal bath-sink onto "chef spatula").
    if (RE.kitchenCook.test(blob)) {
      return themeOf('kitchen', 'kitchen', ['kitchen', 'bakery', 'cooking'], null, {
        charmPrefer: [
          'bake-whisk', 'cooking-whisk', 'kitchen-spatula', 'bake-apron',
          'kitchen-blender', 'kitchen-grater', 'kitchen-timer', 'bake-timer',
        ],
      });
    }

    if (RE.fire.test(blob)) {
      return themeOf('fire', 'fire-station', ['fire-station', 'fire'], 'fire-truck', {
        charmPrefer: ['fire-truck', 'fire-helmet', 'fire-hydrant'],
      });
    }

    if (RE.camp.test(blob) || (
      /\btents?\b/.test(blob)
      && /\b(camp|camping|campsite|campfire|outdoors?|hike|hiking|forest|woods|sleeping\s*bag|backpack)\b/.test(blob)
      && !RE.circus.test(blob)
    )) {
      return themeOf('camp', 'camping', ['camping', 'camp'], 'tent', {
        charmPrefer: ['tent', 'camp-lantern', 'campfire'],
      });
    }

    if (RE.construction.test(blob) || (
      /\bcranes?\b/.test(blob)
      && /\b(construction|building\s*sites?|hard\s*hats?|excavators?|cement|scaffold(?:ing)?|builders?|bulldozer|digger)\b/.test(blob)
    )) {
      return themeOf('construction', 'construction', ['construction'], 'construction-tower-crane', {
        charmPrefer: ['construction-tower-crane', 'construction-hard-hat', 'construction-cone'],
      });
    }

    if (RE.aquarium.test(blob)) {
      return themeOf('aquarium', 'aquarium', ['aquarium'], 'aquarium-tank', {
        charmPrefer: ['aquarium-tank', 'aquarium-fish', 'aquarium-coral'],
      });
    }

    if (RE.dollhouse.test(blob)) {
      return themeOf('dollhouse', 'dollhouse', ['dollhouse', 'home', 'furniture'], 'dollhouse-cutaway', {
        charmPrefer: ['dollhouse-cutaway', 'dollhouse-sofa', 'dollhouse-bed'],
      });
    }

    // Museum / gallery — no shippable king; vocab pack fill densifies thin boards.
    if (RE.museum.test(blob)) {
      return themeOf('museum', null, [], null, { charmEmpty: true });
    }

    return THEME_NONE;
  }

  // buildSectionList musicTitle: title + vocab blob → SceneBackgrounds mood.
  function isMusicTitle(lesson) {
    const topic = (lesson && lesson.title) || '';
    const topicBlob = [topic, ...vocabWords(lesson)].join(' ');
    // School clubs with a "music" vocab card are not classical title lessons.
    if (RE.clubs.test(topicBlob) && !/\b(orchestra|symphony|concert|compose|classical|piano|violin)\b/i.test(topicBlob)) {
      return false;
    }
    return !!(
      window.SceneBackgrounds &&
      window.SceneBackgrounds.moodsFor &&
      (window.SceneBackgrounds.moodsFor(topicBlob) || []).includes('music')
    );
  }

  // makeActivity feelingsKing: emotion words win unless the cue is a make-a-face
  // lesson. Cue is lowercased so the guard is case-insensitive like the original
  // (the call site passes an already-lowercased kingCue, so this is a no-op there).
  function isFeelingsCue(cue) {
    const c = String(cue || '').toLowerCase();
    return RE.feelingsCore.test(c)
      || (RE.feelingsWords.test(c) && !RE.faceGuard.test(c));
  }

  // makeActivity faceKing regex (original used /…/i on a non-lowercased join —
  // lowercasing here + a non-i regex is equivalent).
  function isFaceCue(cue) {
    return RE.faceCue.test(String(cue || '').toLowerCase());
  }

  // Resolve the king type. feelings/face are decided by the caller (they depend
  // on plan state, not just the cue) and win first, preserving the cascade.
  function kingTypeFor(cue, opts) {
    if (opts && opts.feelingsKing) return 'feelings';
    if (opts && opts.faceKing) return 'face';
    const c = String(cue || '');
    const clubsTopic = RE.clubs.test(c.toLowerCase());
    for (const rule of KING_TYPE_RULES) {
      if (clubsTopic && rule.type === 'music') continue;
      if (rule.re.test(c)) return rule.type;
    }
    return 'default';
  }

  function kingHintFor(cue, opts) {
    const heroKey = opts && opts.heroKey;
    if (heroKey && HERO_KEY_HINTS[heroKey] && KING_HINTS[HERO_KEY_HINTS[heroKey]]) {
      return KING_HINTS[HERO_KEY_HINTS[heroKey]];
    }
    return KING_HINTS[kingTypeFor(cue, opts)];
  }

  function kingMissionFor(cue, opts) {
    const heroKey = opts && opts.heroKey;
    const feelingsKing = opts && opts.feelingsKing != null
      ? !!opts.feelingsKing
      : isFeelingsCue(cue);
    const faceKing = opts && opts.faceKing != null
      ? !!opts.faceKing
      : (!feelingsKing && isFaceCue(cue));
    const cueType = kingTypeFor(cue, { feelingsKing, faceKing });
    const heroType = heroKey && HERO_KEY_HINTS[heroKey];
    // face-blank serves two jobs; the lesson cue decides feelings vs make-a-face.
    const type = heroKey === 'face-blank' ? cueType : (heroType || cueType);
    return KING_MISSIONS[type] || KING_MISSIONS.default;
  }

  // Lesson-level resolver. Returns the trait bundle the render spine reads, with
  // a sane default (musicTitle:false) so unknown lessons behave as the fallback.
  function traitsFor(lesson) {
    lesson = lesson || {};
    const theme = resolveTheme(lesson);
    return {
      musicTitle: isMusicTitle(lesson),
      theme,
    };
  }

  window.LessonTraits = {
    RE,
    KING_HINTS,
    KING_MISSIONS,
    KING_TYPE_RULES,
    THEME_NONE,
    CHARM_BAN_SPORTS,
    traitsFor,
    themeBlob,
    themeOf,
    resolveTheme,
    isMusicTitle,
    isFeelingsCue,
    isFaceCue,
    kingTypeFor,
    kingHintFor,
    kingMissionFor,
  };
})();
