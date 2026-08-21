/**
 * Poll all world-zoom-completion tasks and download sheets when ready
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ROOT,
  pollUntilDone,
  listMessages,
} from './client.mjs';

const HARVEST_ROOT = path.join(ROOT, 'harvested/world-zoom-completions');
const INV_PATH = path.join(ROOT, 'docs/world-zoom-completions-inventory.json');
const POLL_MS = 30_000;
const TIMEOUT_MS = 70 * 60 * 1000;

function loadInv() {
  if (!fs.existsSync(INV_PATH)) {
    return { worlds: {} };
  }
  return JSON.parse(fs.readFileSync(INV_PATH, 'utf8'));
}

function saveInv(inv) {
  fs.writeFileSync(INV_PATH, JSON.stringify(inv, null, 2));
}

async function downloadSheets(worldId, messages, sheetDir) {
  fs.mkdirSync(sheetDir, { recursive: true });
  const saved = [];
  
  for (const msg of messages) {
    if (msg.type === 'assistant_message' && msg.assistant_message) {
      // Check attachments array (Manus API v2)
      const attachments = msg.assistant_message.attachments || [];
      for (const att of attachments) {
        if (att.type === 'image' && att.filename && att.filename.endsWith('.png')) {
          const url = att.url;
          if (url) {
            const savePath = path.join(sheetDir, att.filename);
            if (!fs.existsSync(savePath)) {
              console.log(`  📥 Downloading ${att.filename}...`);
              try {
                const res = await fetch(url);
                const buffer = Buffer.from(await res.arrayBuffer());
                fs.writeFileSync(savePath, buffer);
                saved.push({ filename: att.filename, bytes: buffer.length, path: savePath });
              } catch (err) {
                console.error(`  ❌ Failed to download ${att.filename}: ${err.message}`);
              }
            } else {
              saved.push({ filename: att.filename, bytes: fs.statSync(savePath).size, path: savePath });
            }
          }
        }
      }
      
      // Also check blocks array (backward compat)
      const blocks = msg.assistant_message.blocks || [];
      for (const block of blocks) {
        if (block.type === 'file' && block.file) {
          const file = block.file;
          if (file.filename && file.filename.endsWith('.png')) {
            const url = file.url;
            if (url) {
              const savePath = path.join(sheetDir, file.filename);
              if (!fs.existsSync(savePath)) {
                console.log(`  📥 Downloading ${file.filename}...`);
                try {
                  const res = await fetch(url);
                  const buffer = Buffer.from(await res.arrayBuffer());
                  fs.writeFileSync(savePath, buffer);
                  saved.push({ filename: file.filename, bytes: buffer.length, path: savePath });
                } catch (err) {
                  console.error(`  ❌ Failed to download ${file.filename}: ${err.message}`);
                }
              } else {
                saved.push({ filename: file.filename, bytes: fs.statSync(savePath).size, path: savePath });
              }
            }
          }
        }
      }
    }
  }
  
  return saved;
}

async function pollWorld(worldId, worldData) {
  const worldDir = path.join(HARVEST_ROOT, worldId);
  const sheetDir = path.join(worldDir, 'sheets');
  const runJson = path.join(worldDir, 'run.json');
  
  if (worldData.finished_at) {
    console.log(`✓ ${worldId} already complete`);
    return worldData;
  }
  
  const taskId = worldData.task_id;
  console.log(`\n📊 Polling ${worldId} (${taskId})...`);
  
  try {
    const result = await pollUntilDone(taskId, {
      intervalMs: POLL_MS,
      timeoutMs: TIMEOUT_MS,
      onTick: ({ agent_status }) => {
        console.log(`  ${worldId}: ${agent_status || 'unknown'}`);
      },
    });
    
    const msgs = await listMessages(taskId, { order: 'asc', limit: 120 });
    const messages = msgs.messages || result.messages || [];
    
    const saved = await downloadSheets(worldId, messages, sheetDir);
    
    const updated = {
      ...worldData,
      finished_at: new Date().toISOString(),
      agent_status: result.agent_status,
      saved: saved,
      qa: saved.length >= worldData.min_views ? 'REG_A' : 'REG_C',
    };
    
    fs.writeFileSync(runJson, JSON.stringify(updated, null, 2));
    
    console.log(`✅ Downloaded ${worldId}: ${saved.length}/${worldData.min_views} views, QA=${updated.qa}`);
    return updated;
  } catch (err) {
    console.error(`❌ Failed to poll ${worldId}: ${err.message}`);
    const updated = {
      ...worldData,
      error: err.message,
      error_at: new Date().toISOString(),
    };
    fs.writeFileSync(runJson, JSON.stringify(updated, null, 2));
    return updated;
  }
}

async function pollAll() {
  console.log(`\n🔄 Polling all world-zoom-completion tasks...\n`);
  
  const inv = loadInv();
  const worlds = Object.entries(inv.worlds || {});
  
  if (worlds.length === 0) {
    console.log('No worlds to poll');
    return;
  }
  
  console.log(`Found ${worlds.length} worlds to poll\n`);
  
  for (const [worldId, worldData] of worlds) {
    const updated = await pollWorld(worldId, worldData);
    inv.worlds[worldId] = updated;
    saveInv(inv);
  }
  
  console.log(`\n✅ All polls complete!`);
  
  // Summary
  const results = Object.values(inv.worlds);
  const completed = results.filter(w => w.finished_at && w.agent_status === 'stopped');
  const errors = results.filter(w => w.error);
  const totalViews = completed.reduce((sum, w) => sum + (w.saved?.length || 0), 0);
  
  console.log(`\nSummary:`);
  console.log(`  Completed: ${completed.length}/${results.length}`);
  console.log(`  Errors: ${errors.length}`);
  console.log(`  Total views: ${totalViews}`);
  console.log(`  QA breakdown:`);
  
  const qaCounts = {};
  completed.forEach(w => {
    const qa = w.qa || 'UNKNOWN';
    qaCounts[qa] = (qaCounts[qa] || 0) + 1;
  });
  
  Object.entries(qaCounts).forEach(([qa, count]) => {
    console.log(`    ${qa}: ${count}`);
  });
}

const __filename = fileURLToPath(import.meta.url);
const isDirect =
  process.argv[1] &&
  (path.resolve(process.argv[1]) === __filename ||
    String(process.argv[1]).endsWith('poll-all-world-zoom-completions.mjs'));

if (isDirect) {
  pollAll().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
