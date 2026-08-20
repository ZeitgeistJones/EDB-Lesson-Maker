/**
 * Shift60 vocab-gaps wave44 — holidays extras + dentist + vehicles more.
 *   node scripts/manus/request-shift60-vocab-gaps-wave44.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave44');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — HOLIDAY EXTRAS:
1. stocking — christmas stocking
2. wreath — holiday wreath
3. ornament — bauble ornament (BLANK)
4. candy-bucket — halloween candy bucket (BLANK)
5. witch-hat — witch hat
6. turkey-roast — roast turkey
7. gravy — gravy boat
8. champagne — champagne bottle (BLANK)
9. party-popper — party popper
Keys: stocking,wreath,ornament,candy-bucket,witch-hat,turkey-roast,gravy,champagne,party-popper

SHEET 2 — DENTIST:
1. toothbrush-electric — electric toothbrush
2. dental-floss — dental floss
3. mouthwash — mouthwash bottle (BLANK)
4. tooth — tooth
5. braces — dental braces model
6. retainer — retainer
7. dental-mirror — dental mirror
8. toothpaste-kids — kids toothpaste tube (BLANK)
9. dental-chair — dental chair
Keys: toothbrush-electric,dental-floss,mouthwash,tooth,braces,retainer,dental-mirror,toothpaste-kids,dental-chair

SHEET 3 — VEHICLES MORE:
1. bus — bus (BLANK)
2. tram — tram / streetcar
3. subway-car — subway car
4. helicopter — helicopter
5. jet — passenger jet
6. yacht — yacht
7. canoe — canoe
8. skateboard — skateboard
9. roller-skate — roller skate
Keys: bus,tram,subway-car,helicopter,jet,yacht,canoe,skateboard,roller-skate

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 44, shift: 60 };
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) {
    console.error('REFUSING', prev.task_id);
    process.exit(2);
  }
}
if (DRY) {
  fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, dry_run: true, brief: BRIEF }, null, 2));
  process.exit(0);
}
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave44 (holiday/dentist/vehicles)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(OUT_JSON, JSON.stringify({
  ...dumpBase,
  task_id: taskId,
  task_url: created.task_url || (taskId ? 'https://manus.im/app/' + taskId : null),
  themes: ['holiday-extras', 'dentist', 'vehicles-more'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
