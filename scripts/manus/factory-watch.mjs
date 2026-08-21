/**
 * Overnight watch: log A1/A2 factory JSON; start A2 --run when A1 queue clear.
 * Read-only on A1 while lesson-factory.mjs --run is already active (no poll-once).
 */
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { ROOT } from "./client.mjs";

const A1_STATUS = path.join(ROOT, "manus-lessons", "A1", "factory-status.json");
const A2_STATUS = path.join(ROOT, "manus-lessons", "A2", "factory-status.json");
const LOG = path.join(ROOT, "tmp", "manus-lesson-factory", "overnight.log");
const POLL_MS = Number(process.env.FACTORY_WATCH_MS || 180000);
let a2Started = false;

function readStatus(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function log(line) {
  const msg = `[${new Date().toISOString()}] ${line}`;
  console.log(msg);
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  fs.appendFileSync(LOG, msg + "\n");
}

function a1QueueClear(st) {
  if (!st) return false;
  return !st.units.some((u) => u.status === "QUEUED" || u.status === "RETRY_NEEDED");
}

function startA2Factory() {
  if (a2Started) return;
  a2Started = true;
  log("Starting A2 factory (--run --cefr=A2) in background");
  const child = spawn(
    process.execPath,
    ["scripts/manus/lesson-factory.mjs", "--cefr=A2", "--run"],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        LESSON_FACTORY_MAX_CONCURRENT: process.env.LESSON_FACTORY_MAX_CONCURRENT || "5",
        LESSON_FACTORY_AGENT_PROFILE: process.env.LESSON_FACTORY_AGENT_PROFILE || "manus-1.6",
      },
      stdio: ["ignore", "append", "append"],
      detached: true,
    },
  );
  const out = path.join(ROOT, "tmp", "manus-lesson-factory", "a2-run.log");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  child.stdout?.on("data", (d) => fs.appendFileSync(out, d));
  child.stderr?.on("data", (d) => fs.appendFileSync(out, d));
  child.unref();
  log(`A2 factory pid=${child.pid} log=${out}`);
}

function summarize(label, st) {
  if (!st) return `${label}: (no ledger)`;
  const t = st.totals || {};
  return `${label}: run=${t.units_running} q=${t.units_queued} done=${t.units_complete} fail=${t.units_failed} pages=${t.total_pages_complete}`;
}

async function tick() {
  const a1 = readStatus(A1_STATUS);
  const a2 = readStatus(A2_STATUS);
  log(summarize("A1", a1));
  if (a2) log(summarize("A2", a2));

  if (a1 && a1QueueClear(a1) && !a2Started) {
    const a2run = a2 && a2.units.some((u) => u.status === "RUNNING");
    if (!a2run && !(a2 && a2.units.some((u) => u.status === "COMPLETE"))) {
      startA2Factory();
    } else if (a2 && !a2run) {
      startA2Factory();
    }
  }
}

log("factory-watch started");
await tick();
setInterval(tick, POLL_MS);