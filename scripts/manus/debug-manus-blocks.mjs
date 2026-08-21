/**
 * Debug message blocks structure
 */
import { listMessages } from './client.mjs';
import fs from 'fs';

const taskId = process.argv[2];

async function debugBlocks() {
  const result = await listMessages(taskId, { order: 'asc', limit: 200 });
  const messages = result.messages || [];
  
  console.log('Looking for files in messages...\n');
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.assistant_message) {
      console.log(`Message ${i} [assistant]:`);
      console.log(JSON.stringify(msg.assistant_message, null, 2).substring(0, 2000));
      console.log('\n---\n');
    }
  }
  
  // Write full output to file for inspection
  fs.writeFileSync('manus-debug.json', JSON.stringify(result, null, 2));
  console.log('\nFull response written to manus-debug.json');
}

if (!taskId) {
  console.error('Usage: node debug-manus-blocks.mjs <task_id>');
  process.exit(1);
}

debugBlocks().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
