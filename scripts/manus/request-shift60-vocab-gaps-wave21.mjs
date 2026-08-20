/**
 * Shift60 vocab-gaps wave21 — construction + firefighting + postal.
 *   node scripts/manus/request-shift60-vocab-gaps-wave21.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave21');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — CONSTRUCTION SITE:
1. crane — tower crane
2. brick — brick
3. safety-vest — high-vis safety vest
4. cone — traffic cone
5. jackhammer — jackhammer
6. steel-beam — steel I-beam
7. caution-tape — caution tape roll (BLANK, no readable letters)
8. dump-truck — dump truck
9. excavator — excavator
Keys: crane,brick,safety-vest,cone,jackhammer,steel-beam,caution-tape,dump-truck,excavator

SHEET 2 — FIREFIGHTING:
1. hydrant — fire hydrant
2. axe — fire axe
3. oxygen-tank — oxygen tank / air cylinder
4. stretcher — stretcher
5. siren — emergency siren light
6. hose-reel — hose reel
7. fire-boot — firefighter boot
8. smoke-mask — smoke / breathing mask
9. fire-pole — fire station pole section
Keys: hydrant,axe,oxygen-tank,stretcher,siren,hose-reel,fire-boot,smoke-mask,fire-pole

SHEET 3 — POSTAL / MAIL:
1. postage-stamp — postage stamp (BLANK, no text/numbers)
2. letter — sealed letter / envelope letter
3. postcard — postcard (BLANK face)
4. mailbag — mailbag / post bag
5. rubber-stamp — rubber stamp (BLANK)
6. packing-tape — packing tape roll
7. courier-bag — courier satchel (BLANK)
8. postage-meter — postage meter machine (BLANK screen)
9. parcel-label — blank parcel label sticker (no text)
Keys: postage-stamp,letter,postcard,mailbag,rubber-stamp,packing-tape,courier-bag,postage-meter,parcel-label

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 21, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave21 (construction/fire/postal)',
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
  themes: ['construction', 'firefighting', 'postal'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
