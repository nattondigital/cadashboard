#!/usr/bin/env node

/**
 * Tasks MCP Server
 * Provides MCP protocol access to task management functionality
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { initializeSupabase } from '../shared/supabase-client.js';
import { createLogger } from '../shared/logger.js';
import { resources, readResource } from './resources.js';
import { tools, callTool } from './tools.js';
import { prompts, getPrompt } from './prompts.js';

dotenv.config();

const logger = createLogger('TasksServer');

const SERVER_NAME = process.env.MCP_SERVER_NAME || 'crm-tasks-server';
const SERVER_VERSION = process.env.MCP_SERVER_VERSION || '1.0.0';
const AGENT_ID = process.env.AGENT_ID || '';

async function main() {
  logger.info('Starting Tasks MCP Server', {
    name: SERVER_NAME,
    version: SERVER_VERSION,
    agentId: AGENT_ID || 'Not set (will use dynamic agent ID)',
  });

  try {
    initializeSupabase();
    logger.info('Supabase initialized successfully');
  } catch (error: any) {
    logger.error('Failed to initialize Supabase', { error: error.message });
    process.exit(1);
  }

  const server = new Server(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        resources: {},
        tools: {},
        prompts: {},
      },
    }
  );

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    logger.debug('Handling list resources request');
    return { resources };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    logger.debug('Handling read resource request', { uri: request.params.uri });
    return await readResource(request.params.uri);
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Handling list tools request');
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.debug('Handling call tool request', { name, args });

    const agentId = (args as any).agent_id || AGENT_ID;
    if (!agentId) {
      const error = 'agent_id is required either in arguments or AGENT_ID environment variable';
      logger.error(error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: {
                code: 'MISSING_AGENT_ID',
                message: error,
              },
            }),
          },
        ],
      };
    }

    const agentName = (args as any).agent_name || 'Unknown Agent';
    const result = await callTool(name, args, agentId, agentName);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    logger.debug('Handling list prompts request');
    return { prompts };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.debug('Handling get prompt request', { name, args });
    return await getPrompt(name, args || {});
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('Tasks MCP Server is running and ready to accept connections');

  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully');
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  logger.error('Fatal error', { error: error.message, stack: error.stack });
  process.exit(1);
});
