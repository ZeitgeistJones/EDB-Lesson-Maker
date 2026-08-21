/**
 * Re-download sheets from already-completed tasks
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ROOT,
  listMessages,
} from './client.mjs';

const HARVEST_ROOT = path.join(ROOT, 'harvested/world-zoom-completions');
const INV_PATH = path.join(ROOT, 'docs/world-zoom-completions-inventory.json');

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
              console.log(`  ✓ Already have ${att.filename}`);
              saved.push({ filename: att.filename, bytes: fs.statSync(savePath).size, path: savePath });
            }
          }
        }
      }
    }
  }
  
  return saved;
}

async function redownloadAll() {
  console.log(`\n🔄 Re-downloading sheets from completed tasks...\n`);
  
  const inv = loadInv();
  const worlds = Object.entries(inv.worlds || {});
  
  for (const [worldId, worldData] of worlds) {
    if (!worldData.finished_at) {
      console.log(`⏭️  Skipping ${worldId} (not finished)`);
      continue;
    }
    
    console.log(`\n📦 ${worldId} (${worldData.task_id})`);
    
    const sheetDir = path.join(HARVEST_ROOT, worldId, 'sheets');
    const msgs = await listMessages(worldData.task_id, { order: 'asc', limit: 120 });
    const messages = msgs.messages || [];
    
    const saved = await downloadSheets(worldId, messages, sheetDir);
    
    worldData.saved = saved;
    worldData.qa = saved.length >= worldData.min_views ? 'REG_A' : 'REG_C';
    
    inv.worlds[worldId] = worldData;
    saveInv(inv);
    
    console.log(`✅ ${worldId}: ${saved.length}/${worldData.min_views} views, QA=${worldData.qa}`);
  }
  
  console.log(`\n✅ Re-download complete!`);
  
  const results = Object.values(inv.worlds);
  const totalViews = results.reduce((sum, w) => sum + (w.saved?.length || 0), 0);
  console.log(`\nTotal views downloaded: ${totalViews}`);
}

redownloadAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
