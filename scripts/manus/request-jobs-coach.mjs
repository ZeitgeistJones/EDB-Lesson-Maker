/**
 * One-shot: request Manus jobs/people sheet including coach.
 *   node scripts/manus/request-jobs-coach.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTask, MANUS_SKILLS } from './client.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const brief = `Request a ClassIn ESL prop contact sheet (black field, one prop per cell, no labels/grid).

Theme: **jobs / community helpers people** — standing kid-safe characters, full body or 3/4, clear silhouette, matte toy style matching our existing job-* props.

MUST include a distinct **coach** (sports coach with cap or whistle-on-lanyard — NOT a classroom teacher, NOT a whistle alone). Also include: teacher, doctor, nurse, firefighter, pilot, chef, police officer, construction worker (pick ~9–16 that fit a 3x3 or 4x4 grid).

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
