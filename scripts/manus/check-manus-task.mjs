/**
 * Check Manus task messages to debug why no sheets were generated
 */
import { listMessages } from './client.mjs';

const taskId = process.argv[2];

if (!taskId) {
  console.error('Usage: node check-manus-task.mjs <task_id>');
  process.exit(1);
}

async function checkTask() {
  console.log(`Fetching messages for task ${taskId}...\n`);
  
  const result = await listMessages(taskId, { order: 'asc', limit: 200 });
  const messages = result.messages || [];
  
  console.log(`Found ${messages.length} messages\n`);
  
  for (const msg of messages) {
    if (msg.type === 'assistant_message') {
      const content = msg.assistant_message?.content || '';
      console.log(`[ASSISTANT] ${content.substring(0, 500)}${content.length > 500 ? '...' : ''}`);
      
      const blocks = msg.assistant_message?.blocks || [];
      for (const block of blocks) {
        if (block.type === 'file') {
          console.log(`  [FILE] ${block.file?.filename} - ${block.file?.url ? 'has URL' : 'NO URL'}`);
        }
      }
    } else if (msg.type === 'status_update') {
      const status = msg.status_update?.agent_status;
      const detail = msg.status_update?.status_detail;
      const brief = msg.status_update?.brief;
      console.log(`[STATUS] ${status}${brief ? ` - ${brief}` : ''}`);
      if (detail) {
        console.log(`  Detail: ${JSON.stringify(detail).substring(0, 200)}`);
      }
    } else if (msg.type === 'user_message') {
      const content = msg.user_message?.content || '';
      console.log(`[USER] ${typeof content === 'string' ? content.substring(0, 300) : 'multipart message'}${typeof content === 'string' && content.length > 300 ? '...' : ''}`);
    }
    console.log('');
  }
}

checkTask().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
