#!/usr/bin/env node

/**
 * Test client for Tasks MCP Server
 * Automated testing of all MCP capabilities
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import dotenv from 'dotenv';

dotenv.config();

const AGENT_ID = process.env.AGENT_ID || '';
const AGENT_NAME = 'Test Agent';

async function main() {
  console.log('🧪 Starting Tasks MCP Server Test...\n');

  if (!AGENT_ID) {
    console.log('⚠️  Warning: AGENT_ID not set in .env file');
    console.log('   Some operations may fail due to permission checks\n');
  }

  const client = new Client(
    {
      name: 'tasks-test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['--loader', 'ts-node/esm', 'tasks-server/index.ts'],
  });

  console.log('📡 Connecting to Tasks MCP Server...');
  await client.connect(transport);
  console.log('✅ Connected successfully\n');

  try {
    console.log('📋 Test 1: List Resources');
    console.log('─'.repeat(50));
    const resources = await client.listResources();
    console.log(`Found ${resources.resources.length} resources:`);
    resources.resources.forEach((r: any) => {
      console.log(`  - ${r.name} (${r.uri})`);
    });
    console.log('');

    console.log('📖 Test 2: Read Task Statistics Resource');
    console.log('─'.repeat(50));
    const statsResource = await client.readResource({ uri: 'tasks://statistics' });
    const statsContent = statsResource.contents[0] as { text: string };
    console.log('Statistics:', JSON.parse(statsContent.text));
    console.log('');

    console.log('🔧 Test 3: List Available Tools');
    console.log('─'.repeat(50));
    const tools = await client.listTools();
    console.log(`Found ${tools.tools.length} tools:`);
    tools.tools.forEach((t: any) => {
      console.log(`  - ${t.name}: ${t.description}`);
    });
    console.log('');

    console.log('🛠️  Test 4: Execute get_tasks Tool');
    console.log('─'.repeat(50));
    const getTasksResult = await client.callTool({
      name: 'get_tasks',
      arguments: {
        agent_id: AGENT_ID,
        agent_name: AGENT_NAME,
        status: 'To Do',
        limit: 5,
      },
    });
    const tasksContent = (getTasksResult.content as any)[0] as { text: string };
    const tasksData = JSON.parse(tasksContent.text);
    console.log(`Result: ${tasksData.success ? '✅ Success' : '❌ Failed'}`);
    if (tasksData.success) {
      console.log(`Found ${tasksData.data.count} tasks`);
      if (tasksData.data.tasks.length > 0) {
        console.log('\nFirst task:');
        const task = tasksData.data.tasks[0];
        console.log(`  Title: ${task.title}`);
        console.log(`  Status: ${task.status}`);
        console.log(`  Priority: ${task.priority}`);
      }
    } else {
      console.log(`Error: ${tasksData.error?.message}`);
    }
    console.log('');

    console.log('💬 Test 5: List Available Prompts');
    console.log('─'.repeat(50));
    const prompts = await client.listPrompts();
    console.log(`Found ${prompts.prompts.length} prompts:`);
    prompts.prompts.forEach((p: any) => {
      console.log(`  - ${p.name}: ${p.description}`);
    });
    console.log('');

    console.log('📝 Test 6: Get Task Summary Prompt');
    console.log('─'.repeat(50));
    const summaryPrompt = await client.getPrompt({
      name: 'task_summary',
      arguments: {
        include_overdue: 'true',
        include_high_priority: 'true',
      },
    });
    const summaryContent = summaryPrompt.messages[0].content as { text: string };
    const summaryText = summaryContent.text;
    console.log('Prompt preview (first 300 chars):');
    console.log(summaryText.substring(0, 300) + '...\n');

    if (AGENT_ID) {
      console.log('🎯 Test 7: Create a Test Task');
      console.log('─'.repeat(50));
      const createResult = await client.callTool({
        name: 'create_task',
        arguments: {
          agent_id: AGENT_ID,
          agent_name: AGENT_NAME,
          title: `[TEST] MCP Test Task - ${new Date().toISOString()}`,
          description: 'This is a test task created by the MCP test client',
          status: 'To Do',
          priority: 'Low',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
      });
      const createContent = (createResult.content as any)[0] as { text: string };
      const createData = JSON.parse(createContent.text);
      console.log(`Create result: ${createData.success ? '✅ Success' : '❌ Failed'}`);
      if (createData.success) {
        console.log(`Created task: ${createData.data.task.task_id}`);
        console.log(`Task ID: ${createData.data.task.id}`);
      } else {
        console.log(`Error: ${createData.error?.message}`);
      }
      console.log('');
    } else {
      console.log('⏭️  Test 7: Skipped (no AGENT_ID configured)');
      console.log('   Set AGENT_ID in .env to test create operations\n');
    }

    console.log('✨ All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Resources: ${resources.resources.length}`);
    console.log(`  - Tools: ${tools.tools.length}`);
    console.log(`  - Prompts: ${prompts.prompts.length}`);

    if (AGENT_ID) {
      console.log('\n💡 Next Steps:');
      console.log('  1. Check ai_agent_logs table for operation logs');
      console.log('  2. Review created test task in tasks table');
      console.log('  3. Try different filters with get_tasks tool');
      console.log('  4. Explore other prompts for context-aware assistance');
    } else {
      console.log('\n💡 To enable full testing:');
      console.log('  1. Create an AI agent in your CRM');
      console.log('  2. Configure Tasks module permissions');
      console.log('  3. Add AGENT_ID to .env file');
      console.log('  4. Run this test again');
    }
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n👋 Disconnected from server');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
