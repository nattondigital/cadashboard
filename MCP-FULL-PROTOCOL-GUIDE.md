# MCP Full Protocol Integration Guide

## Overview

Your AI agent system now fully implements the **Model Context Protocol (MCP)**, providing a standardized way for AI agents to discover, understand, and interact with your CRM data.

## What is MCP?

MCP is a protocol that provides:

1. **Tools** - Actions the AI can perform (create, update, delete)
2. **Resources** - Read-only data the AI can access (task lists, statistics)
3. **Prompts** - Templates and guidance for AI interactions

## Benefits of Full MCP Implementation

### 1. Self-Discovery
AI agents can discover what's available without hardcoding:
```javascript
// AI automatically discovers available capabilities
const tools = await mcpClient.listTools()
const resources = await mcpClient.listResources()
const prompts = await mcpClient.listPrompts()
```

### 2. Rich Context via Resources
Resources provide read-only access to aggregated data:
- `tasks://all` - All tasks in the system
- `tasks://pending` - Active tasks only
- `tasks://overdue` - Tasks past due date
- `tasks://high-priority` - Urgent/High priority tasks
- `tasks://statistics` - Aggregated task metrics

### 3. AI Guidance via Prompts
Prompts provide context and best practices:
- `task_summary` - Comprehensive task overview
- `task_creation_guide` - Best practices for creating tasks
- `overdue_alert` - Alert message for overdue tasks

### 4. Actions via Tools
Tools enable AI to modify data:
- `get_tasks` - Query tasks with filters
- `create_task` - Create new tasks
- `update_task` - Modify existing tasks
- `delete_task` - Remove tasks

## Architecture

```
┌─────────────────┐
│   AI Agent      │
│   Dashboard     │
└────────┬────────┘
         │
         ├─ Internal Chat (uses MCP)
         │
         v
┌─────────────────┐
│   ai-chat       │  ← Edge Function
│   Function      │
└────────┬────────┘
         │
         ├─ Initialize MCP
         ├─ List Tools/Resources/Prompts
         ├─ Read Resources (context)
         ├─ Get Prompts (guidance)
         └─ Call Tools (actions)
         │
         v
┌─────────────────┐
│   mcp-server    │  ← Edge Function
│   (Full MCP)    │
└────────┬────────┘
         │
         ├─ Validate Permissions
         ├─ Execute Operations
         └─ Return Results
         │
         v
┌─────────────────┐
│   Supabase DB   │
│   (Tasks, etc)  │
└─────────────────┘
```

## MCP Protocol Flow

### 1. Initialize Session
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "clientInfo": {
      "name": "ai-agent-client",
      "version": "1.0.0",
      "agentId": "agent-uuid-here"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {},
      "resources": {},
      "prompts": {}
    },
    "serverInfo": {
      "name": "crm-tasks-mcp-server",
      "version": "1.0.0"
    }
  }
}
```

### 2. Discover Capabilities

#### List Resources
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "resources/list"
}
```

**Returns:** Array of available resources with URIs

#### List Tools
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/list"
}
```

**Returns:** Array of available tools with schemas

#### List Prompts
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "prompts/list"
}
```

**Returns:** Array of available prompts

### 3. Read Context (Resources)

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "resources/read",
  "params": {
    "uri": "tasks://overdue"
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "contents": [{
      "uri": "tasks://overdue",
      "mimeType": "application/json",
      "text": "{\"tasks\": [...], \"count\": 5}"
    }]
  }
}
```

### 4. Get Guidance (Prompts)

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "prompts/get",
  "params": {
    "name": "task_summary",
    "arguments": {
      "include_overdue": true,
      "include_high_priority": true
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "result": {
    "messages": [{
      "role": "user",
      "content": {
        "type": "text",
        "text": "# Task Management Summary\n\n..."
      }
    }]
  }
}
```

### 5. Take Action (Tools)

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/call",
  "params": {
    "name": "update_task",
    "arguments": {
      "agent_id": "agent-uuid",
      "task_id": "TASK-10031",
      "status": "In Progress"
    }
  }
}
```

## Available Resources

| URI | Description | Use Case |
|-----|-------------|----------|
| `tasks://all` | All tasks | Get complete overview |
| `tasks://pending` | Active tasks (To Do + In Progress) | Focus on current work |
| `tasks://overdue` | Past due date tasks | Identify urgent items |
| `tasks://high-priority` | High/Urgent priority | Prioritize work |
| `tasks://statistics` | Aggregated metrics | Dashboard summaries |

### Resource Usage Example

```typescript
// Fetch task statistics for context
const stats = await mcpClient.readResource('tasks://statistics')

// AI now knows:
// - Total tasks: 45
// - Overdue: 3
// - Due today: 7
// - Status breakdown
// - Priority distribution
```

## Available Prompts

| Prompt | Arguments | Purpose |
|--------|-----------|---------|
| `task_summary` | `include_overdue`, `include_high_priority` | Generate comprehensive task overview |
| `task_creation_guide` | None | Best practices for creating tasks |
| `overdue_alert` | None | Alert message for overdue tasks |

### Prompt Usage Example

```typescript
// Get best practices guidance
const guide = await mcpClient.getPrompt('task_creation_guide')

// Returns formatted markdown with:
// - Clear title guidelines
// - Description best practices
// - Priority recommendations
// - Tips and common mistakes
```

## Available Tools

| Tool | Required Params | Optional Params | Permissions |
|------|-----------------|-----------------|-------------|
| `get_tasks` | - | `task_id`, `status`, `priority`, `limit` | can_view |
| `create_task` | `title` | `description`, `priority`, `status`, `assigned_to`, `contact_id`, `due_date` | can_create |
| `update_task` | `task_id` | `title`, `description`, `status`, `priority`, `assigned_to`, `due_date` | can_edit |
| `delete_task` | `task_id` | - | can_delete |

## Permission Enforcement

All MCP operations respect agent permissions from `ai_agent_permissions` table:

```sql
SELECT permissions FROM ai_agent_permissions
WHERE agent_id = 'agent-uuid';

-- Result:
{
  "Tasks": {
    "can_view": true,
    "can_create": true,
    "can_edit": true,
    "can_delete": false
  }
}
```

**Permission Checks:**
- **Resources** → Require `can_view`
- **Tools (get_tasks)** → Require `can_view`
- **Tools (create_task)** → Require `can_create`
- **Tools (update_task)** → Require `can_edit`
- **Tools (delete_task)** → Require `can_delete`

## AI Chat Integration

The `ai-chat` edge function automatically leverages MCP for enhanced context:

### Typical AI Chat Flow

1. **User asks:** "What are my overdue tasks?"

2. **AI reads resource:**
   ```typescript
   const overdueTasks = await mcpClient.readResource('tasks://overdue')
   ```

3. **AI gets guidance:**
   ```typescript
   const alert = await mcpClient.getPrompt('overdue_alert')
   ```

4. **AI responds** with context-aware answer including:
   - List of overdue tasks
   - Days overdue for each
   - Priority information
   - Recommended actions

### Benefits Over Hardcoded Tools

**Before (Hardcoded):**
- AI has to call `get_tasks` with filters
- No aggregated context
- No best practices guidance
- More API calls

**After (MCP Resources + Prompts):**
- AI reads `tasks://overdue` resource (single call)
- Gets formatted guidance from `overdue_alert` prompt
- Comprehensive context in one request
- Better, more informed responses

## Testing MCP Protocol

### Test from Dashboard

1. Go to AI Agents page
2. Select your agent
3. Click "Chat" tab
4. Try these queries:

```
"Show me task statistics"
→ AI uses tasks://statistics resource

"What are the overdue tasks?"
→ AI uses tasks://overdue resource + overdue_alert prompt

"How should I create a new task?"
→ AI uses task_creation_guide prompt

"Update TASK-10031 to In Progress"
→ AI uses update_task tool
```

### Test with curl

```bash
# Initialize
curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/mcp-server \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "clientInfo": {
        "agentId": "your-agent-id"
      }
    }
  }'

# List resources
curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/mcp-server \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: session-id-from-init" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "resources/list"
  }'

# Read resource
curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/mcp-server \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: session-id-from-init" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "resources/read",
    "params": {
      "uri": "tasks://statistics"
    }
  }'
```

## Extending MCP to Other Modules

The current implementation focuses on Tasks. To add Contacts, Leads, etc:

### 1. Add Resources

```typescript
// In mcp-server/index.ts - resources/list
{
  uri: 'contacts://all',
  name: 'All Contacts',
  description: 'Complete list of contacts',
  mimeType: 'application/json',
}
```

### 2. Add Resource Reader

```typescript
// In mcp-server/index.ts - resources/read
if (uri === 'contacts://all') {
  const { data } = await supabase
    .from('contacts_master')
    .select('*')
    .order('created_at', { ascending: false })
  resourceData = { contacts: data || [], count: data?.length || 0 }
}
```

### 3. Add Prompts

```typescript
// In mcp-server/index.ts - prompts/list
{
  name: 'contact_summary',
  description: 'Generate summary of contacts',
  arguments: []
}
```

### 4. Add Tools

```typescript
// In mcp-server/index.ts - tools/list
{
  name: 'create_contact',
  description: 'Create a new contact',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string' },
      phone: { type: 'string' }
    },
    required: ['name']
  }
}
```

## Best Practices

### 1. Use Resources for Context
Before taking actions, read relevant resources to understand current state:
```typescript
// BAD: Blindly update
await mcpClient.callTool('update_task', { task_id, status: 'Completed' })

// GOOD: Check context first
const task = await mcpClient.readResource(`tasks://task/${task_id}`)
if (task.status === 'Cancelled') {
  return "This task is cancelled and cannot be completed"
}
await mcpClient.callTool('update_task', { task_id, status: 'Completed' })
```

### 2. Use Prompts for Guidance
Leverage prompts to provide better responses:
```typescript
// BAD: Generic response
"You have 3 overdue tasks"

// GOOD: Use prompt for formatted guidance
const alert = await mcpClient.getPrompt('overdue_alert')
// Returns formatted alert with task details and recommended actions
```

### 3. Batch Resource Reads
If you need multiple resources, read them efficiently:
```typescript
const [stats, overdue, highPriority] = await Promise.all([
  mcpClient.readResource('tasks://statistics'),
  mcpClient.readResource('tasks://overdue'),
  mcpClient.readResource('tasks://high-priority'),
])
```

## Deployment

Deploy both edge functions:

```bash
# Deploy MCP server
supabase functions deploy mcp-server

# Deploy AI chat (uses MCP client)
supabase functions deploy ai-chat
```

## Monitoring

Check function logs to see MCP operations:

```bash
# View MCP server logs
supabase functions logs mcp-server --tail

# View AI chat logs
supabase functions logs ai-chat --tail
```

## Troubleshooting

### Error: "Agent not initialized"
- Ensure `agent_id` is passed during MCP `initialize`
- Check session is maintained across requests

### Error: "Agent does not have permission"
- Verify permissions in `ai_agent_permissions` table
- Check the specific permission for the operation (can_view, can_create, etc.)

### Resources Return Empty
- Check agent has `can_view` permission
- Verify agent_id is correctly stored in session
- Check Supabase function logs for errors

## Summary

Your AI agent system now has complete MCP protocol support:

✅ **Single Entry Point** - MCP server edge function
✅ **Self-Discovery** - AI can list available capabilities
✅ **Rich Context** - Resources provide read-only data access
✅ **AI Guidance** - Prompts offer templates and best practices
✅ **Secure Actions** - Tools with permission enforcement
✅ **Session Management** - Agent context maintained across requests
✅ **Extensible** - Easy to add new modules (Contacts, Leads, etc.)

This provides a standardized, scalable foundation for AI agent capabilities in your CRM system!
