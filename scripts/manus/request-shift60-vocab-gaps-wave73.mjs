/**
 * Shift60 vocab-gaps wave73 — sushi extras + mountain animals + sewing extras.
 *   node scripts/manus/request-shift60-vocab-gaps-wave73.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave73');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — SUSHI EXTRAS:
1. nigiri — nigiri sushi
2. maki — maki roll
3. sashimi — sashimi plate
4. wasabi — wasabi mound
5. pickled-ginger — pickled ginger
6. soy-dish — soy sauce dish
7. sushi-mat — bamboo sushi mat
8. miso-soup — miso soup bowl
9. edamame — edamame bowl
Keys: nigiri,maki,sashimi,wasabi,pickled-ginger,soy-dish,sushi-mat,miso-soup,edamame

SHEET 2 — MOUNTAIN ANIMALS:
1. mountain-goat — mountain goat
2. bighorn-sheep — bighorn sheep
3. marmot — marmot
4. eagle-mountain — eagle
5. lynx — lynx
6. elk — elk
7. pika — pika
8. mountain-lion — mountain lion
9. ibex — ibex
Keys: mountain-goat,bighorn-sheep,marmot,eagle-mountain,lynx,elk,pika,mountain-lion,ibex

SHEET 3 — SEWING EXTRAS:
1. sewing-machine — sewing machine (BLANK)
2. pin-cushion — pin cushion
3. fabric-bolt — fabric bolt
4. pattern-paper — pattern paper (BLANK)
5. seam-ripper — seam ripper
6. bobbin — bobbin
7. snap-button — snap button
8. hook-eye — hook and eye
9. bias-tape — bias tape roll
Keys: sewing-machine,pin-cushion,fabric-bolt,pattern-paper,seam-ripper,bobbin,snap-button,hook-eye,bias-tape

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 73, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave73 (sushi/mountain/sewing)',
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
  themes: ['sushi-extras', 'mountain-animals', 'sewing-extras'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
