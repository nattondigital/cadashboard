# AI Chat Debugging Guide

## Problem: AI Agent Not Creating Tasks

The AI says it will create tasks but doesn't actually execute the tool calls.

## Root Cause Analysis

### Possible Issues:

1. **No MCP Tools Being Loaded**
   - MCP server not responding
   - MCP server not deployed
   - Connection issues

2. **Module Filtering Too Strict**
   - Agent config says "Tasks" but tool names are "create_task", "get_tasks"
   - Filtering logic fails to match

3. **Tools Not Sent to OpenRouter**
   - Empty tools array
   - Malformed tool definitions

4. **OpenRouter Not Using Tools**
   - Model doesn't support function calling (unlikely with gpt-4o-mini)
   - Tool definitions are invalid
   - Tool_choice not set properly

## How to Debug

### Step 1: Check Supabase Edge Function Logs

Go to Supabase Dashboard → Edge Functions → ai-chat → Logs

Look for these log messages:

```
✓ GOOD: "Raw MCP tools received: 6 [ 'get_tasks', 'create_task', ... ]"
✗ BAD:  "Raw MCP tools received: 0 []"
```

If 0 tools received → **MCP server is not returning tools**

```
✓ GOOD: "Filtering for modules: ['Tasks']"
✓ GOOD: "Checking tool 'create_task' against module 'Tasks' (normalized: 'task'): true"
✗ BAD:  "Checking tool 'create_task' against module 'Tasks' (normalized: 'task'): false"
```

If all false → **Module filtering logic is broken**

```
✓ GOOD: "Filtered tools: 6 [ 'get_tasks', 'create_task', ... ]"
✗ BAD:  "Filtered tools: 0 []"
```

If 0 filtered tools → **Filtering is removing all tools**

```
✓ GOOD: "Tool names being sent to OpenRouter: [ 'get_tasks', 'create_task', ... ]"
✗ BAD:  "Tool names being sent to OpenRouter: []"
```

If empty array → **No tools being sent to AI**

```
✓ GOOD: "Sending 6 tools to OpenRouter: [...]"
✗ BAD:  "WARNING: No tools available to send to OpenRouter!"
```

```
✓ GOOD: "OpenRouter response: { hasToolCalls: true, toolCallsCount: 1, content: null }"
✗ BAD:  "OpenRouter response: { hasToolCalls: false, toolCallsCount: 0, content: 'I will create...' }"
```

If hasToolCalls: false → **OpenRouter is not using the tools**

### Step 2: Check MCP Server

Test the MCP server directly:

```bash
curl -X POST https://YOUR_SUPABASE_URL/functions/v1/mcp-server \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

Expected response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      { "name": "get_tasks", ... },
      { "name": "create_task", ... },
      ...
    ]
  }
}
```

If this fails → **MCP server is not working**

### Step 3: Check Agent Configuration

```sql
SELECT id, name, use_mcp, mcp_config
FROM ai_agents
WHERE status = 'Active';
```

Verify:
- `use_mcp`: true
- `mcp_config.enabled`: true
- `mcp_config.server_url`: correct URL
- `mcp_config.use_for_modules`: ["Tasks"] or similar

### Step 4: Check AI Agent Logs

```sql
SELECT * FROM ai_agent_logs
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;
```

Look for:
- Module: "Tasks"
- Action: "Create"
- Result: "Success" or "Error"

### Step 5: Check If Tasks Were Actually Created

```sql
SELECT * FROM tasks
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;
```

If no tasks → **Tool was never executed**

## Quick Fixes

### Fix 1: Module Filtering Issue

The current logic removes trailing 's' from module name:
- "Tasks" → "task"
- Then checks if "create_task".includes("task") → TRUE ✓

If this doesn't work, change to simpler matching:

```typescript
const filteredTools = mcpTools.filter(tool => {
  if (useForModules.length === 0) return true
  // Just check if tool name contains any part of the module name
  return useForModules.some(module => {
    const toolLower = tool.name.toLowerCase()
    const moduleLower = module.toLowerCase()
    // Remove 's' from end of both
    const toolBase = toolLower.replace(/s$/, '')
    const moduleBase = moduleLower.replace(/s$/, '')
    return toolLower.includes(moduleBase) || moduleLower.includes(toolBase)
  })
})
```

### Fix 2: Force All Tools (Temporary)

For testing, bypass filtering:

```typescript
// TEMPORARY: Use all MCP tools
const filteredTools = mcpTools
console.log(`Using ALL ${filteredTools.length} MCP tools (no filtering)`)
```

### Fix 3: Verify Tool Format

Add logging to check tool format:

```typescript
console.log('First tool structure:', JSON.stringify(tools[0], null, 2))
```

Should look like:
```json
{
  "type": "function",
  "function": {
    "name": "create_task",
    "description": "...",
    "parameters": {
      "type": "object",
      "properties": { ... },
      "required": [ ... ]
    }
  }
}
```

## Expected Flow

1. User: "create a task for tomorrow"
2. AI Chat → MCP Server: "List tools"
3. MCP Server → AI Chat: Returns 6 tools
4. AI Chat: Filters for "Tasks" module → 2 tools (create_task, get_tasks)
5. AI Chat → OpenRouter: Sends message + 2 tools
6. OpenRouter → AI Chat: Returns tool_call for "create_task"
7. AI Chat → MCP Server: Execute "create_task" with args
8. MCP Server: Creates task in database
9. MCP Server → AI Chat: Returns success message
10. AI Chat → OpenRouter: "What should I tell the user?"
11. OpenRouter → AI Chat: "Task created successfully..."
12. AI Chat → User: Final response

## Current Issue

Based on the logs, the AI is responding **without calling any tools**. This means either:
- Step 4: No tools passed filtering
- Step 5: Tools not sent to OpenRouter
- Step 6: OpenRouter didn't call the tool

The new logging will reveal which step is failing.
