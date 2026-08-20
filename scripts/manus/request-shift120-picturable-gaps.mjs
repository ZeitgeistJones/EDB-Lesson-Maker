/**
 * Shift120 — picturable coverage gaps (white 3×3 still-life). Skip abstracts.
 *   node scripts/manus/request-shift120-picturable-gaps.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-gaps');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const SHEETS = [
  {
    id: 'G1',
    theme: 'family-camp-pet-objects',
    keys: ['aunt','cousin','uncle','grandpa','grandma','baby','pet','camp','tent-icon'],
  },
  {
    id: 'G2',
    theme: 'dental-clean-sweet-objects',
    keys: ['clean-tooth','sparkle-tooth','floss-pick','mouthwash','lollipop','candy-cane','cookie','toothbrush-holder','dental-mirror'],
  },
  {
    id: 'G3',
    theme: 'submarine-crew-objects',
    keys: ['captain-hat','crew-badge','periscope','hatch','porthole','sonar-screen','life-vest','submarine','depth-gauge'],
  },
];

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab icon contact sheets (07_vocab-pack). STILL-LIFE / clear OBJECT icons only — NO abstract metaphor tiles.

Skip any cell that won't read at ~96px after 1–2 tries. Never pad with duplicates.

HARD STYLE: solid #FFFFFF field; true even 3×3; one subject per cell; flat educational vector; ZERO text/letters/numbers/logos; quality: default only. Deliver 3 separate PNG sheets.

SHEET 1 — FAMILY / CAMP / PET (3×3) L→R top→bottom:
1. aunt — adult woman icon distinct from mom (simple character still-life, not portrait photo)
2. cousin — kid character still-life distinct from brother/sister if possible
3. uncle — adult man icon distinct from dad
4. grandpa — older man with glasses or grey hair cue
5. grandma — older woman with grey hair cue
6. baby — baby / infant still-life (bottle+bib ok)
7. pet — generic pet silhouette still-life (cat OR dog — one clear pet, not a zoo animal)
8. camp — campsite still-life (small tent + campfire as ONE icon arrangement)
9. tent-icon — simple camping tent only (for camp/tent vocab bridge)
Keys: aunt,cousin,uncle,grandpa,grandma,baby,pet,camp,tent-icon

SHEET 2 — DENTAL CLEAN + SWEETS (3×3):
1. clean-tooth — sparkling clean tooth (NOT bar soap)
2. sparkle-tooth — tooth with shine lines (alternate clean cue)
3. floss-pick — dental floss pick / floss stick
4. mouthwash — mouthwash bottle blank (no label text)
5. lollipop — classic lollipop candy
6. candy-cane — candy cane
7. cookie — cookie / biscuit
8. toothbrush-holder — cup holding toothbrushes
9. dental-mirror — small round dental mirror tool
Keys: clean-tooth,sparkle-tooth,floss-pick,mouthwash,lollipop,candy-cane,cookie,toothbrush-holder,dental-mirror

SHEET 3 — SUBMARINE / CREW OBJECTS (3×3) — objects/symbols, avoid full crowd scenes:
1. captain-hat — captain peaked cap
2. crew-badge — blank crew badge / patch (no letters)
3. periscope — periscope tube
4. hatch — round submarine hatch
5. porthole — round porthole window
6. sonar-screen — blank sonar/radar round screen (no numbers/text)
7. life-vest — life vest / life jacket
8. submarine — side-view submarine
9. depth-gauge — blank circular gauge (no numbers)
Keys: captain-hat,crew-badge,periscope,hatch,porthole,sonar-screen,life-vest,submarine,depth-gauge

Return 3 PNGs + short chat legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = {
  started_at: new Date().toISOString(),
  agent_profile: profile,
  force_skills: force,
  quality: 'default',
  sheets: SHEETS,
  import_hint: {
    'family-camp-pet-objects': 'npm run assets:vocab-sheet -- <png> --sheet --grid=3x3 --names=aunt,cousin,uncle,grandpa,grandma,baby,pet,camp,tent-icon',
    'dental-clean-sweet-objects': 'npm run assets:vocab-sheet -- <png> --sheet --grid=3x3 --names=clean-tooth,sparkle-tooth,floss-pick,mouthwash,lollipop,candy-cane,cookie,toothbrush-holder,dental-mirror',
    'submarine-crew-objects': 'npm run assets:vocab-sheet -- <png> --sheet --grid=3x3 --names=captain-hat,crew-badge,periscope,hatch,porthole,sonar-screen,life-vest,submarine,depth-gauge',
  },
};

if (DRY) {
  fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, dry_run: true, brief: BRIEF }, null, 2));
  console.log(JSON.stringify({ phase: 'dry-run', sheets: SHEETS.length }, null, 2));
  process.exit(0);
}
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) {
    console.error('REFUSING duplicate — already', prev.task_id);
    console.log(JSON.stringify({ phase: 'refused_duplicate', ...prev }, null, 2));
    process.exit(2);
  }
}
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 picturable gaps (family/dental/sub)',
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
  task_url: created.task_url || (taskId ? 'https://manus.im/app/' + taskId : null),
  created,
};
fs.writeFileSync(OUT_JSON, JSON.stringify(dump, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: dump.task_url }, null, 2));
