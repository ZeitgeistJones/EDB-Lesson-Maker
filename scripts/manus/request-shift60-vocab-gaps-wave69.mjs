/**
 * Shift60 vocab-gaps wave69 — market stall + woodland plants + dentist tools.
 *   node scripts/manus/request-shift60-vocab-gaps-wave69.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave69');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — MARKET STALL:
1. market-basket — market basket
2. scale-market — market scale
3. produce-bag — produce bag
4. bunches-herbs — herb bunches
5. flower-bunch — flower bunch
6. jar-honey — honey jar (BLANK)
7. eggs-carton — egg carton
8. bread-loaf — bread loaf
9. price-tag — blank price tag (BLANK)
Keys: market-basket,scale-market,produce-bag,bunches-herbs,flower-bunch,jar-honey,eggs-carton,bread-loaf,price-tag

SHEET 2 — WOODLAND PLANTS:
1. oak-leaf — oak leaf
2. maple-leaf — maple leaf
3. pine-needle — pine branch
4. moss — moss clump
5. mushroom-wild — wild mushroom
6. berry-bush — berry on stem
7. fern-wood — fern
8. toadstool — toadstool
9. pinecone-wood — pinecone
Keys: oak-leaf,maple-leaf,pine-needle,moss,mushroom-wild,berry-bush,fern-wood,toadstool,pinecone-wood

SHEET 3 — DENTIST TOOLS:
1. dental-probe — dental probe
2. dental-scaler — dental scaler
3. suction-tip — dental suction tip
4. mouth-mirror — mouth mirror
5. dental-drill — dental drill handpiece
6. bib-dental — dental bib (BLANK)
7. spit-cup — spit cup
8. fluoride-tray — fluoride tray
9. orthodontic-wax — orthodontic wax
Keys: dental-probe,dental-scaler,suction-tip,mouth-mirror,dental-drill,bib-dental,spit-cup,fluoride-tray,orthodontic-wax

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 69, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave69 (market/plants/dentist)',
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
  themes: ['market-stall', 'woodland-plants', 'dentist-tools'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
