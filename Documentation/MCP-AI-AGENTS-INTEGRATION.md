# MCP Integration for AI Agents

This document explains how the Model Context Protocol (MCP) integration works with your AI Agents powered by OpenRouter.

## Overview

Your AI Agents can now use the MCP protocol to execute CRM operations through a standardized interface, similar to how n8n agents connect to MCP servers. This provides:

- **Standardized Tool Execution**: All operations go through the MCP protocol
- **Permission-Based Access**: MCP server enforces agent permissions
- **Audit Logging**: All MCP operations are logged automatically
- **Future-Proof**: Easy to extend to other modules and external MCP servers

## How It Works

```
┌─────────────────┐
│   User Chat     │
│   with Agent    │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  OpenRouter AI  │  ← Receives user message
│  (GPT/Gemini)   │  ← Has access to MCP tools
└────────┬────────┘
         │
         v
┌─────────────────┐
│  MCP Client     │  ← Converts OpenRouter → MCP format
│   (Frontend)    │  ← Handles authentication
└────────┬────────┘
         │
         v
┌─────────────────┐
│   MCP Server    │  ← Validates permissions
│ (Edge Function) │  ← Executes database operations
└────────┬────────┘
         │
         v
┌─────────────────┐
│    Supabase     │  ← Stores data
│    Database     │  ← RLS enforcement
└─────────────────┘
```

## Configuration

### Step 1: Enable MCP for an Agent

1. Go to **AI Agents** page
2. Click **Add New Agent** or edit an existing agent
3. Fill in the basic information (Name, Model, System Prompt, etc.)
4. Scroll down to **Enable MCP Integration** section
5. Toggle the checkbox to enable MCP
6. (Optional) Enter a custom MCP server URL, or leave blank to use the default

**Default MCP Server**: `${SUPABASE_URL}/functions/v1/mcp-server`

### Step 2: Configure Agent Permissions

MCP respects the existing permission system. Make sure your agent has the correct permissions:

1. Go to **AI Agents** → Click on your agent
2. Click **Configure Module Permissions**
3. Enable permissions for **Tasks**:
   - `can_view` - Required to get/read tasks
   - `can_create` - Required to create tasks
   - `can_edit` - Required to update tasks
   - `can_delete` - Required to delete tasks

### Step 3: Test MCP Integration

1. Open the agent's chat interface
2. You'll see a **MCP Enabled** badge if MCP is active
3. Try these test commands:
   - "Show me my tasks"
   - "Create a task called 'Test MCP integration' with high priority"
   - "Get task TASK-10001"
   - "Update task TASK-10001 status to In Progress"

When a tool is executed via MCP, you'll see a `🔌 (via MCP)` indicator in the response.

## Features

### Currently Supported (Tasks Module)

The following MCP tools are available for the Tasks module:

#### get_tasks
- **Description**: Retrieve tasks with filtering
- **Parameters**:
  - `task_id` (optional): Get specific task by ID
  - `status` (optional): Filter by status
  - `priority` (optional): Filter by priority
  - `limit` (optional): Max number of tasks
- **Permission Required**: `Tasks.can_view`

#### create_task
- **Description**: Create a new task
- **Parameters**:
  - `title` (required): Task title
  - `description` (optional): Task description
  - `priority` (optional): Low, Medium, High, Urgent
  - `status` (optional): To Do, In Progress, Completed, Cancelled
  - `assigned_to` (optional): Team member UUID
  - `contact_id` (optional): Contact UUID
  - `due_date` (optional): YYYY-MM-DD format
- **Permission Required**: `Tasks.can_create`

#### update_task
- **Description**: Update an existing task
- **Parameters**:
  - `task_id` (required): Task ID to update
  - All other parameters from create_task (optional)
- **Permission Required**: `Tasks.can_edit`

#### delete_task
- **Description**: Delete a task
- **Parameters**:
  - `task_id` (required): Task ID to delete
- **Permission Required**: `Tasks.can_delete`

### What Happens Behind the Scenes

1. **User sends message**: "Create a task for follow-up call"

2. **OpenRouter AI processes**: Determines it should use the `create_task` tool

3. **MCP Client activates**:
   - Checks if agent has `use_mcp` enabled
   - Converts OpenRouter function call to MCP format
   - Adds `agent_id` automatically

4. **MCP Server validates**:
   - Verifies agent exists
   - Checks agent has `Tasks.can_create` permission
   - Logs the operation to `ai_agent_logs`

5. **Database operation**:
   - Inserts task into `tasks` table
   - Auto-generates `task_id`
   - Triggers webhooks and workflows

6. **Response flows back**:
   - MCP server returns result
   - MCP client parses response
   - OpenRouter formats user-friendly message
   - Chat shows: "✅ Task created: Follow-up call 🔌 (via MCP)"

## Benefits of MCP Integration

### 1. Separation of Concerns
- Chat layer focuses on conversation
- MCP server handles all business logic
- Database access is centralized

### 2. Security
- All operations go through permission checks
- Agent can't bypass RLS policies
- Audit trail for every action

### 3. Consistency
- Same tool behavior across all interfaces (chat, n8n, API)
- Single source of truth for schemas
- Centralized error handling

### 4. Extensibility
- Easy to add new modules (Leads, Contacts, Appointments, etc.)
- Can connect to external MCP servers
- Future-proof for new AI platforms

## Extending to Other Modules

Currently, only the Tasks module uses MCP. To add more modules:

### Option 1: Update MCP Config (Per Agent)

Edit an agent and modify the MCP config in the database:

```sql
UPDATE ai_agents
SET mcp_config = '{
  "enabled": true,
  "server_url": "https://your-project.supabase.co/functions/v1/mcp-server",
  "use_for_modules": ["Tasks", "Leads", "Contacts", "Appointments"]
}'
WHERE id = 'your-agent-id';
```

### Option 2: Extend MCP Server

The MCP server (`supabase/functions/mcp-server/index.ts`) currently only handles Tasks. To add more tools:

1. Add new tool definitions to `tools/list` method
2. Implement tool handlers in `tools/call` method
3. Add permission checks for the new module
4. Test with agent chat interface

## Troubleshooting

### MCP Badge Not Showing
- Verify `use_mcp` is true in database
- Check agent was created/updated after migration
- Refresh the browser

### "Agent does not have permission" Error
- Check AI Agent Permissions page
- Ensure Tasks module has required permission enabled
- Verify agent_id is correct

### "MCP is not enabled for this agent" Error
- Agent's `use_mcp` field is false
- Enable MCP in agent settings

### Tools Not Appearing in Chat
- Check browser console for errors
- Verify MCP server URL is correct
- Ensure OpenRouter API key is configured

### Seeing Duplicate Tools
- Agent might have both MCP and direct Supabase tools
- This is normal during transition
- MCP tools take priority when both exist

## Testing with n8n

Your MCP server can also be used by external tools like n8n:

1. Use the connection details from `N8N-MCP-SETUP.md`
2. n8n and AI agents share the same MCP server
3. Same permission system applies
4. All operations are logged to `ai_agent_logs`

## Database Schema

### ai_agents table (new columns)

```sql
-- Enable/disable MCP for agent
use_mcp BOOLEAN DEFAULT FALSE

-- MCP configuration (JSONB)
mcp_config JSONB DEFAULT NULL

-- Example mcp_config:
{
  "enabled": true,
  "server_url": "https://project.supabase.co/functions/v1/mcp-server",
  "use_for_modules": ["Tasks", "Leads", "Contacts"]
}
```

## API Reference

### MCP Client Functions

```typescript
import { getMCPTools, executeMCPTool, shouldUseMCP } from '@/lib/mcp-tool-executor'

// Get MCP tools as OpenRouter function format
const tools = await getMCPTools(agentId, supabaseUrl, anonKey)

// Execute a tool via MCP
const result = await executeMCPTool(agentId, 'create_task', args, supabaseUrl, anonKey)

// Check if tool should use MCP
const useMCP = await shouldUseMCP(agentId, 'create_task')
```

## Next Steps

1. **Test the Integration**: Create a test agent with MCP enabled
2. **Monitor Logs**: Check `ai_agent_logs` table for MCP operations
3. **Extend to Leads**: Add Leads module to MCP server
4. **Connect n8n**: Set up n8n workflows using the MCP server
5. **External MCP Servers**: Connect to third-party MCP servers for additional capabilities

## Support

For issues or questions:
- Check the MCP server logs in Supabase Dashboard
- Review `ai_agent_logs` table for operation history
- See `MCP-HTTP-SERVER.md` for detailed server documentation
- See `N8N-MCP-SETUP.md` for n8n integration guide
