/**
 * One-shot: request Manus jobs/people sheet including coach.
 *   node scripts/manus/request-jobs-coach.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTask, MANUS_SKILLS } from './client.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const brief = `Request a ClassIn ESL prop contact sheet.

Layout: even **4×4 or smaller** true grid (prefer bigger people cells — NOT 4×8 tiny stamps). Solid pure black (#000000) field edge-to-edge. One standing person per cell. No painted grid lines, no labels, no text on art. Gutters are empty black only.

Style: **flat educational** vector/matte cutouts (restrained soft shading only) matching our existing job-* people — NOT soft-3D, NOT glossy product renders, NOT photo. Kid-safe, friendly, full body or 3/4, clear silhouette.

Theme: **jobs / community helpers people** — every cell MUST be a person figure in uniform (not tools/whistle/clipboard alone).

MUST include a distinct **coach** (sports coach with cap; whistle may hang on lanyard as accessory — NOT a classroom teacher, NOT a whistle/clipboard alone). Also fill high-value missing/refresh people that fit: teacher, doctor, nurse, firefighter, pilot, chef, police officer, construction worker, plus e.g. scientist / mail carrier / vet / dentist if natural (≤16 total).

Output: PNG contact sheet ready for blob-slice import into 09_props (pack tags: jobs, people). Name each cell in a short legend in the chat reply (not painted on the art).

Do not invent compound metonymy props (coach≠whistle alone).`;

const created = await createTask({
  title: 'jobs people sheet incl coach',
  message: brief,
  force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
  interactive_mode: false,
});

const id = created.task_id || created.id || (created.data && created.data.task_id) || null;
const outDir = path.join(ROOT, 'tmp/manus');
fs.mkdirSync(outDir, { recursive: true });
const stamp = {
  at: new Date().toISOString(),
  task_id: id,
  title: 'jobs people sheet incl coach',
  task_url: id ? `https://manus.im/app?taskId=${id}` : null,
};
fs.writeFileSync(path.join(outDir, 'jobs-coach-request.json'), JSON.stringify({ stamp, created }, null, 2));
console.log(JSON.stringify(stamp, null, 2));
