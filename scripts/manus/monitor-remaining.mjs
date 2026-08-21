/**
 * Monitor and wait for remaining tasks to complete, then download sheets
 */
import fs from 'fs';
import path from 'path';
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
    }
  }
  
  return saved;
}

async function monitorAndDownload() {
  console.log('\n🔄 Monitoring remaining tasks...\n');
  
  const inv = loadInv();
  const incomplete = Object.entries(inv.worlds).filter(([_, w]) => !w.finished_at);
  
  if (incomplete.length === 0) {
    console.log('All tasks already complete!');
    return;
  }
  
  console.log(`Found ${incomplete.length} incomplete tasks\n`);
  
  for (const [worldId, worldData] of incomplete) {
    console.log(`\n📊 Polling ${worldId} (${worldData.task_id})...`);
    
    try {
      const result = await pollUntilDone(worldData.task_id, {
        intervalMs: POLL_MS,
        timeoutMs: TIMEOUT_MS,
        onTick: ({ agent_status }) => {
          console.log(`  ${worldId}: ${agent_status || 'unknown'}`);
        },
      });
      
      const msgs = await listMessages(worldData.task_id, { order: 'asc', limit: 120 });
      const messages = msgs.messages || result.messages || [];
      
      const sheetDir = path.join(HARVEST_ROOT, worldId, 'sheets');
      const saved = await downloadSheets(worldId, messages, sheetDir);
      
      const updated = {
        ...worldData,
        finished_at: new Date().toISOString(),
        agent_status: result.agent_status,
        saved: saved,
        qa: saved.length >= worldData.min_views ? 'REG_A' : 'REG_C',
      };
      
      inv.worlds[worldId] = updated;
      saveInv(inv);
      
      console.log(`✅ Downloaded ${worldId}: ${saved.length}/${worldData.min_views} views, QA=${updated.qa}`);
    } catch (err) {
      console.error(`❌ Failed to poll ${worldId}: ${err.message}`);
      const updated = {
        ...worldData,
        error: err.message,
        error_at: new Date().toISOString(),
      };
      inv.worlds[worldId] = updated;
      saveInv(inv);
    }
  }
  
  console.log(`\n✅ All monitoring complete!`);
  
  const results = Object.values(inv.worlds);
  const completed = results.filter(w => w.finished_at && w.agent_status === 'stopped');
  const totalViews = completed.reduce((sum, w) => sum + (w.saved?.length || 0), 0);
  
  console.log(`\nFinal Summary:`);
  console.log(`  Completed: ${completed.length}/${results.length}`);
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

monitorAndDownload().catch((err) => {
  console.error(err);
  process.exit(1);
});
