/* storyScene.js — composable story-stage layout for ClassIn story art slots.
 * Classic script → window.StoryScene
 *
 * Eight locked templates. Producer supplies page.storyScene; placer maps named
 * slots → layered PropBank imgs (normalized 0–1 stage coords).
 *
 * Honesty rule: do NOT silently map kick/climb/eat/etc. onto walk/idle.
 * Unknown action verbs stay unmatched until a dedicated pose exists.
 */
(function () {
  /** @typedef {{ x:number, y:number, w:number, h:number, facing?:string, scaleClass?:string, anchor?:string }} SlotDef */

  /**
   * Geometry tuned after Mia/Leo E2E + env fit v3:
   * - actors stay large; story-env uses envBackdrop / envMidground / envStrip
   * - shared floor plane (~ACTOR_FLOOR_Y); actors stand *in* the env footprint
   * - optional envFg apron (bottom of env drawn in front of ankles) for spatial unify
   */
  const ACTOR_FLOOR_Y = 0.94;
  /** Actor soles sit slightly above env bottom so painted floors receive the feet. */
  const ACTOR_FEET_Y = 0.9;

  /**
   * Story-env stage modes — infer from key; producer may override with fill.envMode.
   * backdrop  = whole place behind actors (fields, woods, interiors, habitats)
   * midground = interactive furniture zones (sofa, bed, desk, counter, clinic)
   * strip     = ground plane only (grass, path, road, platform)
   */
  const ENV_MODE_BY_KEY = {
    'story-env-pool-edge': 'backdrop',
    'story-env-soccer-field': 'backdrop',
    'story-env-basketball-court': 'backdrop',
    'story-env-woods': 'backdrop',
    'story-env-zoo': 'backdrop',
    'story-env-ocean': 'backdrop',
    'story-env-pasture': 'backdrop',
    'story-env-train-interior': 'backdrop',
    'story-env-bus-interior': 'backdrop',
    'story-env-construction': 'backdrop',
    'story-env-classroom': 'midground',
    'story-env-home': 'midground',
    'story-env-bedroom': 'midground',
    'story-env-closet': 'midground',
    'story-env-hotel-lobby': 'midground',
    'story-env-airport-counter': 'midground',
    'story-env-clinic': 'midground',
    'story-env-grass-field': 'strip',
    'story-env-bus-stop': 'strip',
    'story-env-train-platform': 'strip',
    'story-env-train-platform-b': 'strip',
  };

  const ENV_MODE_SCALE = {
    backdrop: 'envBackdrop',
    midground: 'envMidground',
    strip: 'envStrip',
  };

  /** Slot boxes for locationActivity when backdrop is a story-env key. */
  const ENV_LOCATION_SLOTS = {
    backdrop: {
      x: 0.0,
      y: 0.0,
      w: 1.0,
      h: ACTOR_FLOOR_Y,
      scaleClass: 'envBackdrop',
      anchor: 'bottom',
    },
    midground: {
      x: 0.02,
      y: 0.06,
      w: 0.96,
      h: ACTOR_FLOOR_Y - 0.06,
      scaleClass: 'envMidground',
      anchor: 'bottom',
    },
    strip: {
      x: 0.0,
      y: 0.58,
      w: 1.0,
      h: ACTOR_FLOOR_Y - 0.58,
      scaleClass: 'envStrip',
      anchor: 'bottom',
    },
  };

  /**
   * When a story-env is present, pull actors into the place (not left of a sticker).
   * Leaves room on the right for actorB / props.
   */
  const ENV_ACTOR_SLOTS = {
    backdrop: {
      actor: { x: 0.1, y: 0.08, w: 0.4, h: ACTOR_FEET_Y - 0.08, facing: 'right', scaleClass: 'actor' },
      actorB: { x: 0.42, y: 0.1, w: 0.4, h: ACTOR_FEET_Y - 0.1, facing: 'left', scaleClass: 'actor' },
    },
    midground: {
      actor: { x: 0.16, y: 0.06, w: 0.38, h: ACTOR_FEET_Y - 0.06, facing: 'right', scaleClass: 'actor' },
      actorB: { x: 0.46, y: 0.08, w: 0.38, h: ACTOR_FEET_Y - 0.08, facing: 'left', scaleClass: 'actor' },
    },
    strip: {
      actor: { x: 0.08, y: 0.06, w: 0.4, h: ACTOR_FEET_Y - 0.06, facing: 'right', scaleClass: 'actor' },
      actorB: { x: 0.46, y: 0.08, w: 0.4, h: ACTOR_FEET_Y - 0.08, facing: 'left', scaleClass: 'actor' },
    },
  };

  /** Bottom fraction of env redrawn in front of ankles (mild — not a foot chop). */
  const ENV_FG_APRON = {
    backdrop: 0.12,
    midground: 0.1,
    strip: 0.4,
  };

  /** Per-key apron overrides (fence/habitat need more FG; water decks need less). */
  const ENV_FG_BY_KEY = {
    'story-env-zoo': 0.34,
    'story-env-construction': 0.28,
    'story-env-woods': 0.16,
    'story-env-pool-edge': 0.06,
    'story-env-soccer-field': 0.1,
    'story-env-ocean': 0.08,
    'story-env-classroom': 0.12,
    'story-env-home': 0.12,
    'story-env-bedroom': 0.12,
    'story-env-hotel-lobby': 0.14,
    'story-env-airport-counter': 0.14,
  };

  /**
   * Existing reusable environments that may complete an otherwise isolated
   * character/prop composition. Keep specific places before broad cues.
   */
  const ENV_CUE_RULES = [
    { re: /\bbedroom\b/i, key: 'story-env-bedroom' },
    { re: /\bcloset|wardrobe\b/i, key: 'story-env-closet' },
    { re: /\bhotel|lobby\b/i, key: 'story-env-hotel-lobby' },
    { re: /\bairport|check-?in|passport\s+counter\b/i, key: 'story-env-airport-counter' },
    { re: /\bbus\s+stop\b/i, key: 'story-env-bus-stop' },
    { re: /\bon\s+the\s+bus|bus\s+interior\b/i, key: 'story-env-bus-interior' },
    { re: /\btrain\s+platform|train\s+station\b/i, key: 'story-env-train-platform' },
    { re: /\bon\s+the\s+train|train\s+interior\b/i, key: 'story-env-train-interior' },
    { re: /\bclinic|doctor|hospital|dentist\b/i, key: 'story-env-clinic' },
    { re: /\bclassroom|school|lesson\b/i, key: 'story-env-classroom' },
    { re: /\bhome|house|family|living\s+room\b/i, key: 'story-env-home' },
    { re: /\bsoccer|football|pitch\b/i, key: 'story-env-soccer-field' },
    { re: /\bbasketball|hoop|court\b/i, key: 'story-env-basketball-court' },
    { re: /\bpool|swimming\s+pool\b/i, key: 'story-env-pool-edge' },
    { re: /\bocean|sea|underwater|aquarium\b/i, key: 'story-env-ocean' },
    { re: /\bwoods|forest|camp|camping\b/i, key: 'story-env-woods' },
    { re: /\bconstruction|building\s+site\b/i, key: 'story-env-construction' },
    { re: /\bzoo|lion|giraffe|zebra|elephant|monkey\b/i, key: 'story-env-zoo' },
    { re: /\bpasture|farm|cow|sheep|horse\b/i, key: 'story-env-pasture' },
    { re: /\bgrass|field|park|outdoor\b/i, key: 'story-env-grass-field' },
  ];

  const TEMPLATES = {
    charObject: {
      paintOrder: ['ground', 'actor', 'object'],
      slots: {
        ground: { x: 0.04, y: 0.86, w: 0.92, h: 0.12, scaleClass: 'ground', anchor: 'bottom' },
        object: { x: 0.42, y: 0.38, w: 0.36, h: 0.36, scaleClass: 'handheld', anchor: 'center' },
        actor: { x: 0.02, y: 0.06, w: 0.58, h: 0.88, facing: 'right', scaleClass: 'actor' },
      },
    },
    action: {
      paintOrder: ['ground', 'actor', 'support'],
      slots: {
        ground: { x: 0.04, y: 0.86, w: 0.92, h: 0.12, scaleClass: 'ground', anchor: 'bottom' },
        support: { x: 0.5, y: 0.58, w: 0.4, h: 0.34, scaleClass: 'ball', anchor: 'bottom' },
        actor: { x: 0.02, y: 0.06, w: 0.58, h: 0.88, facing: 'right', scaleClass: 'actor' },
      },
    },
    exchange: {
      paintOrder: ['ground', 'giver', 'receiver', 'item'],
      slots: {
        ground: { x: 0.04, y: 0.88, w: 0.92, h: 0.1, scaleClass: 'ground', anchor: 'bottom' },
        giver: { x: 0.0, y: 0.08, w: 0.48, h: 0.86, facing: 'right', scaleClass: 'actor' },
        receiver: { x: 0.52, y: 0.08, w: 0.48, h: 0.86, facing: 'left', scaleClass: 'actor' },
        item: { x: 0.34, y: 0.32, w: 0.32, h: 0.3, scaleClass: 'held', anchor: 'center' },
      },
    },
    locationActivity: {
      paintOrder: ['backdrop', 'actor', 'actorB', 'prop'],
      slots: {
        backdrop: { x: 0.08, y: 0.48, w: 0.84, h: 0.46, scaleClass: 'furniture', anchor: 'bottom' },
        prop: { x: 0.38, y: 0.4, w: 0.24, h: 0.22, scaleClass: 'book', anchor: 'bottom' },
        actor: { x: 0.06, y: 0.1, w: 0.44, h: 0.78, facing: 'right', scaleClass: 'actor' },
        actorB: { x: 0.36, y: 0.12, w: 0.42, h: 0.76, facing: 'left', scaleClass: 'actor' },
      },
    },
    /** Three people as one cluster — overlap slightly so it reads as a group. */
    group3: {
      paintOrder: ['ground', 'left', 'right', 'center'],
      slots: {
        ground: { x: 0.04, y: 0.88, w: 0.92, h: 0.1, scaleClass: 'ground', anchor: 'bottom' },
        left: { x: 0.0, y: 0.18, w: 0.4, h: 0.76, facing: 'right', scaleClass: 'actor' },
        right: { x: 0.6, y: 0.18, w: 0.4, h: 0.76, facing: 'left', scaleClass: 'actor' },
        center: { x: 0.26, y: 0.06, w: 0.48, h: 0.88, facing: 'front', scaleClass: 'actor' },
      },
    },
    /** Locomotion / arrival: destination behind, walker in front walking toward it. */
    travel: {
      paintOrder: ['skyOrPath', 'vehicleOrGoal', 'actor'],
      slots: {
        skyOrPath: { x: 0.04, y: 0.78, w: 0.92, h: 0.18, scaleClass: 'ground', anchor: 'bottom' },
        vehicleOrGoal: { x: 0.48, y: 0.12, w: 0.48, h: 0.78, scaleClass: 'landmark', anchor: 'bottom' },
        actor: { x: 0.0, y: 0.08, w: 0.52, h: 0.86, facing: 'right', scaleClass: 'actor' },
      },
    },
    /** Big noun dominates; optional witness stays secondary on the side. */
    heroFocus: {
      paintOrder: ['ground', 'hero', 'witness'],
      slots: {
        ground: { x: 0.04, y: 0.88, w: 0.92, h: 0.1, scaleClass: 'ground', anchor: 'bottom' },
        hero: { x: 0.28, y: 0.06, w: 0.68, h: 0.88, scaleClass: 'hero', anchor: 'bottom' },
        witness: { x: 0.0, y: 0.28, w: 0.34, h: 0.66, facing: 'right', scaleClass: 'witness' },
      },
    },
    /** Conversational spacing — face each other, talk/listen poses. */
    dialogue: {
      paintOrder: ['ground', 'speakerA', 'speakerB'],
      slots: {
        ground: { x: 0.04, y: 0.88, w: 0.92, h: 0.1, scaleClass: 'ground', anchor: 'bottom' },
        speakerA: { x: 0.04, y: 0.08, w: 0.44, h: 0.86, facing: 'right', scaleClass: 'actor' },
        speakerB: { x: 0.52, y: 0.08, w: 0.44, h: 0.86, facing: 'left', scaleClass: 'actor' },
      },
    },
  };

  /** Fraction of the *slot* height used after fit. */
  const SCALE_FRAC = {
    ground: 0.7,
    env: 0.55,
    envBackdrop: 1,
    envMidground: 0.92,
    envStrip: 1,
    furniture: 0.88,
    landmark: 0.78,
    vehicle: 0.7,
    hero: 0.9,
    actor: 0.94,
    witness: 0.78,
    prop: 0.48,
    handheld: 0.48,
    fruit: 0.42,
    ball: 0.5,
    held: 0.55,
    book: 0.5,
  };

  function inferEnvMode(key, fill) {
    if (fill && fill.envMode) {
      const m = String(fill.envMode).toLowerCase();
      if (m === 'backdrop' || m === 'midground' || m === 'strip') return m;
    }
    if (fill && fill.scaleClass) {
      const sc = String(fill.scaleClass);
      if (sc === 'envBackdrop' || sc === 'backdrop') return 'backdrop';
      if (sc === 'envMidground' || sc === 'midground') return 'midground';
      if (sc === 'envStrip' || sc === 'strip' || sc === 'ground') return 'strip';
    }
    const k = String(key || '').toLowerCase();
    if (ENV_MODE_BY_KEY[k]) return ENV_MODE_BY_KEY[k];
    if (!/^story-env-/.test(k)) return null;
    // Heuristic fallback for new keys
    if (/(grass|path|road|platform|field-edge|curb|strip)/.test(k)) return 'strip';
    if (/(sofa|home|bedroom|closet|classroom|hotel|airport|clinic|counter|desk|kitchen|bakery)/.test(k)) {
      return 'midground';
    }
    return 'backdrop';
  }

  function environmentKeyForCue(cue, propGet) {
    const text = String(cue || '');
    if (!text) return null;
    for (const rule of ENV_CUE_RULES) {
      if (!rule.re.test(text)) continue;
      if (!propGet || propGet(rule.key)) return rule.key;
    }
    return null;
  }

  /** Poses we stock as reusable cast plates (not every English verb). */
  const POSES = [
    'idle', 'hold', 'walk', 'talk', 'sit', 'listen', 'reach',
    'jump', 'climb', 'eat', 'drink', 'kick', 'run', 'throw', 'catch',
    'wave', 'push', 'swim', 'draw', 'brush',
  ];
  const EMOTIONS = ['neutral', 'happy', 'worried'];

  /**
   * Verbs that may reuse a generic pose without lying.
   * Anything else needs a dedicated action plate (or a different beat wording).
   */
  const VERB_TO_POSE = {
    stand: 'idle',
    stands: 'idle',
    look: 'idle',
    looks: 'idle',
    see: 'idle',
    sees: 'idle',
    wait: 'idle',
    waits: 'idle',
    find: 'reach',
    finds: 'reach',
    pick: 'reach',
    picks: 'reach',
    point: 'reach',
    points: 'reach',
    take: 'reach',
    takes: 'reach',
    put: 'reach',
    puts: 'reach',
    open: 'reach',
    opens: 'reach',
    hold: 'hold',
    holds: 'hold',
    carry: 'hold',
    carries: 'hold',
    give: 'hold',
    gives: 'hold',
    share: 'hold',
    shares: 'hold',
    show: 'hold',
    shows: 'hold',
    walk: 'walk',
    walks: 'walk',
    go: 'walk',
    goes: 'walk',
    come: 'walk',
    comes: 'walk',
    run: 'run',
    runs: 'run',
    talk: 'talk',
    talks: 'talk',
    say: 'talk',
    says: 'talk',
    ask: 'talk',
    asks: 'talk',
    listen: 'listen',
    listens: 'listen',
    sit: 'sit',
    sits: 'sit',
    read: 'sit',
    reads: 'sit',
    jump: 'jump',
    jumps: 'jump',
    climb: 'climb',
    climbs: 'climb',
    eat: 'eat',
    eats: 'eat',
    drink: 'drink',
    drinks: 'drink',
    kick: 'kick',
    kicks: 'kick',
    throw: 'throw',
    throws: 'throw',
    catch: 'catch',
    catches: 'catch',
    wave: 'wave',
    waves: 'wave',
    push: 'push',
    pushes: 'push',
    swim: 'swim',
    swims: 'swim',
    draw: 'draw',
    draws: 'draw',
    brush: 'brush',
    brushes: 'brush',
  };

  /** Physical actions that must NOT map onto walk/idle/hold — need dedicated plates. */
  const NEEDS_DEDICATED_POSE = [
    'bounce', 'bounces', 'ride', 'rides', 'juggle', 'juggles', 'swing', 'swings',
    'pull', 'pulls', 'dance', 'dances', 'sleep', 'sleeps', 'write', 'writes',
    'mix', 'mixes', 'lift', 'lifts', 'score', 'scores', 'pass', 'passes',
  ];
  const TRANSFER_VERBS = new Set([
    'give', 'gives', 'gave', 'hand', 'hands', 'share', 'shares', 'show', 'shows',
  ]);

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function inferScaleClass(key, fill, slotDef) {
    const envMode = inferEnvMode(key, fill);
    if (envMode) return ENV_MODE_SCALE[envMode];
    // Explicit non-env scaleClass on the fill wins (but never treat story-env as furniture).
    if (fill && fill.scaleClass) {
      const sc = String(fill.scaleClass);
      if (sc === 'furniture' && /^story-env-/i.test(String(key || ''))) {
        return ENV_MODE_SCALE[inferEnvMode(key, null) || 'backdrop'];
      }
      return sc;
    }
    if (slotDef && slotDef.scaleClass && slotDef.scaleClass !== 'prop') return slotDef.scaleClass;
    const k = String(key || '').toLowerCase();
    if (/^cast-/.test(k)) return 'actor';
    if (/^family-/.test(k) || /^job-/.test(k)) return 'actor';
    if (/^animal-/.test(k)) return 'hero';
    if (/(apple|banana|orange|lemon|grape|carrot|tomato|fruit)/.test(k)) return 'fruit';
    if (/(soccer-ball|beach-ball|basketball|ball|football)/.test(k)) return 'ball';
    if (/(book|notebook|ticket|passport|key|phone|pencil|pen)/.test(k)) return 'book';
    if (/(desk|table|counter|bookshelf|sofa|chair|bed|oven|stall)/.test(k)) return 'furniture';
    if (/(truck|bus|car|boat|ship|train|taxi|scooter|bike)/.test(k)) return 'vehicle';
    if (/(door|gate|bus-stop|suitcase|slide|swing)/.test(k)) return 'landmark';
    if (slotDef && slotDef.scaleClass) return slotDef.scaleClass;
    return 'handheld';
  }

  function resolveCastKey(fill, propGet) {
    if (!fill || typeof fill !== 'object') return null;
    if (fill.propKey && !fill.who) return String(fill.propKey);
    const who = String(fill.who || '').toLowerCase().trim();
    if (!who) return null;
    let pose = String(fill.pose || 'idle').toLowerCase();
    let emotion = String(fill.emotion || 'neutral').toLowerCase();
    if (fill.actionPose || (pose && !POSES.includes(pose))) {
      const dedicated = `cast-${who}-${pose}-${EMOTIONS.includes(emotion) ? emotion : 'neutral'}`;
      if (!propGet || propGet(dedicated)) return dedicated;
      return null;
    }
    if (!POSES.includes(pose)) pose = 'idle';
    if (!EMOTIONS.includes(emotion)) emotion = 'neutral';
    const tryKeys = [
      `cast-${who}-${pose}-${emotion}`,
      `cast-${who}-idle-${emotion}`,
      `cast-${who}-${pose}-neutral`,
      `cast-${who}-idle-neutral`,
    ];
    for (const k of tryKeys) {
      if (propGet && propGet(k)) return k;
      if (!propGet) return k;
    }
    return tryKeys[0];
  }

  function resolvePropKey(fill) {
    if (!fill || typeof fill !== 'object') return null;
    if (fill.propKey) return String(fill.propKey);
    if (fill.word) return String(fill.word).toLowerCase().replace(/\s+/g, '-');
    return null;
  }

  function layerKey(slotName, fill, propGet) {
    if (fill && (fill.who || fill.role === 'character' || fill.actionPose)) {
      return resolveCastKey(fill, propGet);
    }
    return resolvePropKey(fill) || resolveCastKey(fill, propGet);
  }

  /**
   * @returns {{ ok:boolean, pose:string|null, reason?:string, needsDedicated?:boolean }}
   */
  function poseForVerb(verb, chosenPose) {
    const v = String(verb || '').toLowerCase().trim();
    if (!v) return { ok: true, pose: chosenPose || 'idle' };
    if (NEEDS_DEDICATED_POSE.includes(v)) {
      const want = v.replace(/s$/, '');
      const ok = chosenPose === want || chosenPose === v;
      return {
        ok,
        pose: want,
        needsDedicated: true,
        reason: ok
          ? null
          : `"${v}" needs dedicated pose "${want}" — do not reuse ${chosenPose || 'idle'}/walk`,
      };
    }
    const mapped = VERB_TO_POSE[v];
    if (!mapped) {
      return {
        ok: false,
        pose: null,
        needsDedicated: true,
        reason: `unlisted verb "${v}" — do not silently map to walk/idle`,
      };
    }
    if (chosenPose && chosenPose !== mapped && chosenPose !== 'idle') {
      return { ok: true, pose: chosenPose };
    }
    return { ok: !chosenPose || chosenPose === mapped || mapped === 'idle', pose: mapped };
  }

  /**
   * Static contract for transfer predicates. This is semantic and geometric:
   * a transfer requires two engaged actors and an item visibly between them.
   */
  function storyActionContract(scene, fills, layers) {
    const verb = String(scene && (scene.actionVerb || scene.verb) || '').toLowerCase().trim();
    if (!TRANSFER_VERBS.has(verb)) return null;
    const giverFill = fills && fills.giver;
    const receiverFill = fills && fills.receiver;
    const giver = (layers || []).find((layer) => layer.slot === 'giver');
    const receiver = (layers || []).find((layer) => layer.slot === 'receiver');
    const item = (layers || []).find((layer) => layer.slot === 'item');
    const giverPose = String(giverFill && giverFill.pose || '').toLowerCase();
    const receiverPose = String(receiverFill && receiverFill.pose || '').toLowerCase();
    const giverFacing = String(giverFill && giverFill.facing || 'right').toLowerCase();
    const receiverFacing = String(receiverFill && receiverFill.facing || 'left').toLowerCase();
    const itemCenter = item ? item.x + item.w / 2 : NaN;
    const giverCenter = giver ? giver.x + giver.w / 2 : NaN;
    const receiverCenter = receiver ? receiver.x + receiver.w / 2 : NaN;

    const contract = {
      kind: 'transfer',
      verb,
      agent_contact: !!giver && !!item && /^(reach|hold|give|show)$/.test(giverPose),
      object_path:
        !!giver &&
        !!receiver &&
        !!item &&
        itemCenter > Math.min(giverCenter, receiverCenter) &&
        itemCenter < Math.max(giverCenter, receiverCenter),
      recipient_state: !!receiver && /^(reach|catch|hold)$/.test(receiverPose),
      mutual_attention: !!giver && !!receiver && giverFacing === 'right' && receiverFacing === 'left',
      payoff_state:
        !!receiverFill &&
        ['happy', 'worried'].includes(String(receiverFill.emotion || '').toLowerCase()),
    };
    contract.ok =
      contract.agent_contact &&
      contract.object_path &&
      contract.recipient_state &&
      contract.mutual_attention &&
      contract.payoff_state;
    return contract;
  }

  function placeInSlot(slotName, slotDef, fill, stageW, stageH, propGet, propSrc, z) {
    const key = layerKey(slotName, fill, propGet);
    if (!key) return null;
    const prop = propGet ? propGet(key) : null;
    const src = propSrc ? propSrc(key, prop) : prop && prop.path ? prop.path : null;
    if (!src) return null;

    const aspect = prop && prop.aspect > 0 ? prop.aspect : /^cast-/.test(key) ? 0.42 : 0.75;
    const scaleClass = inferScaleClass(key, fill, slotDef);
    const envMode = inferEnvMode(key, fill);
    const frac = SCALE_FRAC[scaleClass] != null ? SCALE_FRAC[scaleClass] : 0.4;

    const slotPx = {
      x: slotDef.x * stageW,
      y: slotDef.y * stageH,
      w: slotDef.w * stageW,
      h: slotDef.h * stageH,
    };

    let h;
    let w;
    let x;
    let y;
    let objectFit = 'contain';
    let objectPosition = 'bottom center';

    if (scaleClass === 'envBackdrop') {
      // Full-bleed place: cover the stage; crop toward ground so Mia stands in it.
      w = slotPx.w;
      h = slotPx.h;
      x = slotPx.x;
      y = slotPx.y + slotPx.h - h;
      objectFit = 'cover';
      objectPosition = 'center bottom';
    } else if (scaleClass === 'envMidground') {
      // Large interactable zone: fill a tall frame with cover so rooms receive the actor.
      w = clamp(stageW * 0.86, stageW * 0.78, stageW * 0.94);
      h = Math.min(slotPx.h * 0.98, stageH * 0.82);
      x = (stageW - w) / 2;
      y = stageH * ACTOR_FLOOR_Y - h;
      objectFit = 'cover';
      objectPosition = 'center bottom';
    } else if (scaleClass === 'envStrip') {
      // Full-width shared ground plane under feet.
      w = stageW;
      h = Math.min(slotPx.h, Math.max(stageH * 0.22, stageH * 0.28));
      const stripH = w / Math.max(aspect, 0.01);
      if (stripH > 0 && stripH < h * 1.5) h = Math.min(Math.max(stripH * 0.55, stageH * 0.18), slotPx.h);
      x = 0;
      y = stageH * ACTOR_FLOOR_Y - h;
      objectFit = 'cover';
      objectPosition = 'center bottom';
    } else {
      h = slotPx.h * frac;
      w = h * aspect;
      if (w > slotPx.w * 0.98) {
        w = slotPx.w * 0.98;
        h = w / aspect;
      }
      if (scaleClass === 'furniture' || scaleClass === 'env' || scaleClass === 'landmark' || scaleClass === 'vehicle') {
        w = slotPx.w * (scaleClass === 'vehicle' ? 0.95 : 0.9);
        h = w / aspect;
        if (h > slotPx.h * 0.95) {
          h = slotPx.h * 0.95;
          w = h * aspect;
        }
      }
      if (scaleClass === 'hero') {
        h = slotPx.h * frac;
        w = h * aspect;
        if (w > slotPx.w * 0.98) {
          w = slotPx.w * 0.98;
          h = w / aspect;
        }
      }
      h = clamp(h, 18, slotPx.h);
      w = clamp(w, 12, slotPx.w);

      const anchor = String((fill && fill.anchor) || slotDef.anchor || 'bottom').toLowerCase();
      x = slotPx.x + (slotPx.w - w) / 2;
      if (anchor === 'center') {
        y = slotPx.y + (slotPx.h - h) / 2;
        objectPosition = 'center';
      } else if (anchor === 'top') {
        y = slotPx.y;
        objectPosition = 'top center';
      } else {
        y = slotPx.y + slotPx.h - h;
      }
    }

    const wantFacing = String((fill && fill.facing) || slotDef.facing || 'right').toLowerCase();
    // Cast plates are authored viewer-right. Flip cast when slot wants left.
    // Front-facing family/job props: do not auto-flip unless fill.facing === 'left'.
    let flip = false;
    if (wantFacing === 'left') {
      if (/^cast-/.test(key)) flip = true;
      else if (fill && String(fill.facing || '').toLowerCase() === 'left') flip = true;
    }

    return {
      key,
      src,
      x,
      y,
      w,
      h,
      flip,
      z,
      slot: slotName,
      scaleClass,
      envMode: envMode || null,
      objectFit,
      objectPosition,
    };
  }

  function compose(scene, opts) {
    const o = opts || {};
    const stageW = Math.max(40, Number(o.stageW) || 420);
    const stageH = Math.max(40, Number(o.stageH) || 360);
    const templateId = scene && scene.templateId;
    const tpl = TEMPLATES[templateId];
    const warnings = [];
    if (!tpl) return { templateId: templateId || null, layers: [], stageW, stageH, warnings };

    const verb = scene && (scene.actionVerb || scene.verb);
    if (verb) {
      const actorFill =
        (scene.slots &&
          (scene.slots.actor ||
            scene.slots.giver ||
            scene.slots.speakerA ||
            scene.slots.center ||
            scene.slots.witness)) ||
        null;
      const check = poseForVerb(verb, actorFill && actorFill.pose);
      if (!check.ok) warnings.push(check.reason || `verb "${verb}" pose mismatch`);
    }

    let fills = (scene && scene.slots) || {};
    const transferVerb = TRANSFER_VERBS.has(String(verb || '').toLowerCase().trim());
    if (templateId === 'exchange' && transferVerb) {
      // Generic hold plates do not show a transfer. Reuse existing reach plates
      // on both sides so hands, eyeline, and object path form one readable beat.
      fills = Object.assign({}, fills, {
        giver: Object.assign({}, fills.giver || {}, { pose: 'reach', facing: 'right' }),
        receiver: Object.assign({}, fills.receiver || {}, { pose: 'reach', facing: 'left' }),
      });
    }
    const propGet = o.propGet || (window.PropBank && window.PropBank.get.bind(window.PropBank));
    const propSrc =
      o.propSrc ||
      function (key, prop) {
        const p = prop || (propGet && propGet(key));
        return p && p.path ? p.path : null;
      };

    const slots = {};
    for (const name of Object.keys(tpl.slots)) {
      slots[name] = Object.assign({}, tpl.slots[name]);
    }
    if (templateId === 'action' && fills.support && fills.actor && String(fills.actor.pose) === 'hold') {
      Object.assign(slots.support, {
        x: 0.28,
        y: 0.28,
        w: 0.34,
        h: 0.34,
        scaleClass: fills.support.scaleClass || 'held',
        anchor: 'center',
      });
    }
    if (templateId === 'charObject' && fills.object && fills.actor && String(fills.actor.pose) === 'reach') {
      Object.assign(slots.object, {
        x: 0.38,
        y: 0.3,
        w: 0.34,
        h: 0.34,
        anchor: 'center',
      });
    }
    if (templateId === 'travel' && fills.vehicleOrGoal) {
      const gk = resolvePropKey(fills.vehicleOrGoal) || '';
      if (/(truck|bus|car|boat|ship)/.test(gk)) {
        Object.assign(slots.vehicleOrGoal, {
          x: 0.38,
          y: 0.28,
          w: 0.58,
          h: 0.6,
          scaleClass: fills.vehicleOrGoal.scaleClass || 'vehicle',
        });
      }
    }
    if (templateId === 'exchange' && transferVerb) {
      Object.assign(slots.giver, {
        x: 0.03,
        y: 0.08,
        w: 0.5,
        h: 0.86,
        facing: 'right',
      });
      Object.assign(slots.receiver, {
        x: 0.47,
        y: 0.08,
        w: 0.5,
        h: 0.86,
        facing: 'left',
      });
      Object.assign(slots.item, {
        x: 0.38,
        y: 0.35,
        w: 0.24,
        h: 0.24,
        scaleClass: 'held',
        anchor: 'center',
      });
    }

    // Remap locationActivity when fill is a story-env key: bigger place + actors inside it.
    let activeEnvMode = null;
    function remapEnvSlot(slotName, fill) {
      const ek = resolvePropKey(fill);
      if (!ek || !/^story-env-/i.test(ek)) return;
      const mode = inferEnvMode(ek, fill);
      if (!mode) return;
      activeEnvMode = mode;
      const geo = ENV_LOCATION_SLOTS[mode];
      if (!geo) return;
      if (slotName === 'backdrop' || slotName === 'ground' || slotName === 'skyOrPath') {
        Object.assign(slots[slotName], geo);
      }
    }
    for (const sn of Object.keys(fills)) remapEnvSlot(sn, fills[sn]);

    if (activeEnvMode && templateId === 'locationActivity') {
      const actorGeo = ENV_ACTOR_SLOTS[activeEnvMode];
      if (actorGeo) {
        if (fills.actor && slots.actor) Object.assign(slots.actor, actorGeo.actor);
        if (fills.actorB && slots.actorB) Object.assign(slots.actorB, actorGeo.actorB);
      }
      // Soft prop nest near mid-right of the place (room for second actor).
      if (fills.prop && slots.prop) {
        Object.assign(slots.prop, {
          x: activeEnvMode === 'midground' ? 0.52 : 0.48,
          y: 0.42,
          w: 0.28,
          h: 0.28,
        });
      }
    }

    const layers = [];
    let z = 0;
    let envLayer = null;
    const hasBoundEnvironment = Object.keys(fills).some((slotName) => {
      const key = resolvePropKey(fills[slotName]);
      return /^story-env-/i.test(String(key || ''));
    });
    const ambientKey = hasBoundEnvironment
      ? null
      : String(
          o.environmentKey ||
          (scene && scene.environmentKey) ||
          ''
        ).trim();
    if (ambientKey && /^story-env-/i.test(ambientKey)) {
      const ambient = placeInSlot(
        'environment',
        { x: 0, y: 0, w: 1, h: 1, scaleClass: 'envBackdrop', anchor: 'bottom' },
        { propKey: ambientKey, scaleClass: 'envBackdrop', envMode: 'backdrop' },
        stageW,
        stageH,
        propGet,
        propSrc,
        1
      );
      if (ambient) {
        layers.push(ambient);
        envLayer = ambient;
        activeEnvMode = 'backdrop';
        z = 1;
      }
    }
    for (const slotName of tpl.paintOrder) {
      const slotDef = slots[slotName];
      const fill = fills[slotName];
      if (!slotDef || !fill) continue;
      z += 1;
      const layer = placeInSlot(slotName, slotDef, fill, stageW, stageH, propGet, propSrc, z);
      if (layer) {
        layers.push(layer);
        if (
          (slotName === 'backdrop' || slotName === 'ground' || slotName === 'skyOrPath') &&
          layer.envMode
        ) {
          envLayer = layer;
        }
      } else if (fill.who || fill.actionPose) {
        warnings.push(`missing cast layer for slot "${slotName}" (pose may be unsourced)`);
      }
    }

    if (envLayer && activeEnvMode) {
      const frac =
        (ENV_FG_BY_KEY[envLayer.key] != null
          ? ENV_FG_BY_KEY[envLayer.key]
          : ENV_FG_APRON[activeEnvMode]) || 0;
      if (frac > 0) {
        const apronH = Math.max(14, envLayer.h * frac);
        z += 1;
        layers.push({
          key: envLayer.key,
          src: envLayer.src,
          x: envLayer.x,
          y: envLayer.y + envLayer.h - apronH,
          w: envLayer.w,
          h: apronH,
          flip: envLayer.flip,
          z,
          slot: 'envFg',
          scaleClass: 'envFg',
          envMode: envLayer.envMode,
          objectFit: 'cover',
          objectPosition: 'center bottom',
          isEnvFg: true,
        });
      }
    }

    const actionContract = storyActionContract(scene, fills, layers);
    if (actionContract && !actionContract.ok) {
      const failed = Object.keys(actionContract)
        .filter((key) => key !== 'kind' && key !== 'verb' && key !== 'ok' && actionContract[key] === false);
      warnings.push(`story action contract failed: ${failed.join(', ')}`);
    }

    return {
      templateId,
      layers,
      stageW,
      stageH,
      environmentKey: envLayer ? envLayer.key : null,
      storyActionContract: actionContract,
      warnings,
    };
  }

  function supportedTemplates() {
    return Object.keys(TEMPLATES);
  }

  window.StoryScene = {
    TEMPLATES,
    SCALE_FRAC,
    ENV_MODE_BY_KEY,
    ENV_MODE_SCALE,
    ENV_LOCATION_SLOTS,
    ENV_ACTOR_SLOTS,
    ENV_FG_APRON,
    ENV_FG_BY_KEY,
    ENV_CUE_RULES,
    ACTOR_FLOOR_Y,
    ACTOR_FEET_Y,
    POSES,
    VERB_TO_POSE,
    NEEDS_DEDICATED_POSE,
    TRANSFER_VERBS,
    compose,
    resolveCastKey,
    poseForVerb,
    inferEnvMode,
    environmentKeyForCue,
    storyActionContract,
    supportedTemplates,
  };
})();
