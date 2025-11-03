#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  console.log('🧪 Testing get_tasks with task_id parameter...\n');

  const client = new Client(
    { name: 'test-client', version: '1.0.0' },
    { capabilities: {} }
  );

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['--loader', 'ts-node/esm', 'tasks-server/index.ts'],
  });

  console.log('📡 Connecting to Tasks MCP Server...');
  await client.connect(transport);
  console.log('✅ Connected\n');

  console.log('🔍 Getting task TASK-10031...');
  const result = await client.callTool({
    name: 'get_tasks',
    arguments: { task_id: 'TASK-10031' },
  });

  const content = (result.content as any)[0] as { text: string };
  const data = JSON.parse(content.text);
  
  if (data.success && data.data.tasks.length > 0) {
    const task = data.data.tasks[0];
    console.log('✅ Task found!\n');
    console.log(`Task ID: ${task.task_id}`);
    console.log(`Title: ${task.title}`);
    console.log(`Description: ${task.description}`);
    console.log(`Status: ${task.status}`);
    console.log(`Priority: ${task.priority}`);
    console.log(`Assigned to: ${task.assigned_to_name}`);
    console.log(`Due date: ${task.due_date}`);
    console.log(`Contact: ${task.contact_name} (${task.contact_phone})`);
  } else {
    console.log('❌ Task not found');
  }

  await client.close();
  console.log('\n👋 Done');
}

main().catch(console.error);
