# Quick Start: MCP Integration with AI Agents

Get your AI Agents using MCP in 5 minutes!

## Prerequisites

- Supabase project with MCP server deployed (`mcp-server` edge function)
- OpenRouter API key configured in Settings → Integrations
- At least one AI Agent created

## Step-by-Step Setup

### 1. Apply Database Migration

The migration adds `use_mcp` and `mcp_config` fields to the `ai_agents` table.

**Migration file**: `supabase/migrations/20251104000000_add_mcp_config_to_ai_agents.sql`

```bash
# If using Supabase CLI
supabase db push

# Or apply directly in Supabase Dashboard SQL Editor
```

### 2. Create or Update an Agent

#### Option A: Create New Agent with MCP

1. Go to **AI Agents** page
2. Click **Add New Agent**
3. Fill in:
   - **Name**: "MCP Test Agent"
   - **Model**: Select any OpenRouter model (e.g., `google/gemini-2.5-flash-lite`)
   - **System Prompt**:
     ```
     You are a helpful CRM assistant with access to task management tools.
     Help users create, read, update, and delete tasks efficiently.
     ```
   - **Status**: Active
   - **Channels**: Select at least "Web"
4. Scroll down to **Enable MCP Integration**
5. Check the box to enable
6. Leave MCP Server URL blank (uses default)
7. Click **Create Agent**

#### Option B: Enable MCP for Existing Agent

```sql
-- Replace 'agent-uuid' with your actual agent ID
UPDATE ai_agents
SET
  use_mcp = true,
  mcp_config = '{
    "enabled": true,
    "server_url": "https://your-project.supabase.co/functions/v1/mcp-server",
    "use_for_modules": ["Tasks"]
  }'::jsonb
WHERE id = 'agent-uuid';
```

### 3. Configure Agent Permissions

1. Go to **AI Agents** page
2. Click on your agent
3. Click **Configure Module Permissions**
4. Enable Tasks permissions:
   - ✅ can_view
   - ✅ can_create
   - ✅ can_edit
   - ✅ can_delete
5. Click **Save Permissions**

### 4. Test MCP Integration

1. From the agent's page, click **Open Chat Interface**
2. Look for the **MCP Enabled** badge next to the agent status
3. Try these commands:

#### Test 1: Create a Task
```
Create a task called "Test MCP integration" with high priority
```

Expected response:
```
✅ Task created: Test MCP integration 🔌 (via MCP)
```

#### Test 2: Get Tasks
```
Show me all my tasks
```

Expected response: List of tasks with the `🔌 (via MCP)` indicator

#### Test 3: Get Specific Task
```
Get task TASK-10001
```

Expected response: Details of that specific task

#### Test 4: Update Task
```
Update task TASK-10001 status to In Progress
```

Expected response:
```
✅ Task updated successfully: TASK-10001 🔌 (via MCP)
```

### 5. Verify MCP is Working

#### Check Agent Logs

```sql
SELECT
  created_at,
  agent_name,
  action,
  module,
  result,
  details
FROM ai_agent_logs
WHERE agent_id = 'your-agent-uuid'
  AND user_context = 'MCP Server HTTP'
ORDER BY created_at DESC
LIMIT 10;
```

You should see entries with:
- `user_context` = "MCP Server HTTP"
- `module` = "Tasks"
- `action` = "get_tasks", "create_task", etc.

#### Check Chat Memory

```sql
SELECT
  created_at,
  role,
  message,
  action,
  result
FROM ai_agent_chat_memory
WHERE agent_id = 'your-agent-uuid'
ORDER BY created_at DESC
LIMIT 10;
```

### 6. Compare: MCP vs Direct Supabase

Create two identical agents:
- **Agent A**: MCP Enabled
- **Agent B**: MCP Disabled

Test the same task operations with both. You'll notice:

| Feature | MCP Enabled | Direct Supabase |
|---------|-------------|-----------------|
| Tool execution | Via MCP server | Direct database query |
| Permission check | MCP server validates | Frontend validates |
| Audit logging | Automatic in MCP | Manual in frontend |
| Response indicator | 🔌 (via MCP) | No indicator |
| Error handling | Centralized | Scattered |

## Troubleshooting

### MCP Badge Not Showing

**Check 1**: Agent Configuration
```sql
SELECT id, name, use_mcp, mcp_config
FROM ai_agents
WHERE id = 'your-agent-uuid';
```

Expected:
- `use_mcp` = `true`
- `mcp_config` should have JSON object

**Fix**: Update agent
```sql
UPDATE ai_agents
SET use_mcp = true,
    mcp_config = '{"enabled": true, "server_url": "...", "use_for_modules": ["Tasks"]}'::jsonb
WHERE id = 'your-agent-uuid';
```

### "Agent does not have permission" Error

**Check**: Agent Permissions
```sql
SELECT permissions
FROM ai_agent_permissions
WHERE agent_id = 'your-agent-uuid';
```

Expected:
```json
{
  "Tasks": {
    "can_view": true,
    "can_create": true,
    "can_edit": true,
    "can_delete": true
  }
}
```

**Fix**: Update permissions
```sql
UPDATE ai_agent_permissions
SET permissions = jsonb_set(
  permissions,
  '{Tasks}',
  '{"can_view": true, "can_create": true, "can_edit": true, "can_delete": true}'::jsonb
)
WHERE agent_id = 'your-agent-uuid';
```

### MCP Tools Not Appearing

**Check 1**: Browser Console

Open browser DevTools (F12) and check for errors like:
- "Failed to fetch MCP tools"
- Network errors to MCP server

**Check 2**: Environment Variables

Verify in your `.env` file:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Check 3**: MCP Server Deployment

Verify in Supabase Dashboard:
1. Go to Edge Functions
2. Check `mcp-server` is listed and deployed
3. Check recent invocations and logs

### Task Created But No MCP Indicator

This means the tool used direct Supabase instead of MCP.

**Reason 1**: `shouldUseMCP()` returned false
- Check `use_mcp` is true
- Check `mcp_config.use_for_modules` includes "Tasks"

**Reason 2**: MCP execution failed, fallback to direct
- Check MCP server logs for errors
- Check agent permissions in database

## Testing Checklist

- [ ] Migration applied successfully
- [ ] Agent has `use_mcp = true`
- [ ] Agent has `mcp_config` with correct JSON
- [ ] Agent has Tasks permissions (can_view, can_create, can_edit, can_delete)
- [ ] "MCP Enabled" badge shows in chat interface
- [ ] Create task shows `🔌 (via MCP)` indicator
- [ ] Get tasks shows `🔌 (via MCP)` indicator
- [ ] Update task shows `🔌 (via MCP)` indicator
- [ ] Delete task shows `🔌 (via MCP)` indicator
- [ ] Operations appear in `ai_agent_logs` with `user_context = 'MCP Server HTTP'`

## Next Steps

### Extend to More Modules

Once Tasks MCP is working, you can extend to:

1. **Leads Module**: Add MCP tools for lead management
2. **Contacts Module**: Add MCP tools for contact operations
3. **Appointments Module**: Add MCP tools for scheduling
4. **Expenses Module**: Add MCP tools for expense tracking

See `MCP-AI-AGENTS-INTEGRATION.md` for detailed instructions.

### Connect n8n

Your MCP server can now be used by n8n workflows:

1. See `N8N-MCP-SETUP.md` for connection details
2. Use the same agent_id for permission enforcement
3. n8n and AI agents share the same MCP server

### Monitor and Optimize

- Set up dashboards for MCP usage metrics
- Monitor `ai_agent_logs` for patterns
- Optimize slow tool executions
- Add caching where appropriate

## Support Resources

- **Full Documentation**: See `MCP-AI-AGENTS-INTEGRATION.md`
- **Server Details**: See `MCP-HTTP-SERVER.md`
- **n8n Integration**: See `N8N-MCP-SETUP.md`
- **Agent Logs**: Check `ai_agent_logs` table
- **Edge Function Logs**: Supabase Dashboard → Edge Functions → mcp-server → Logs

## Success!

If you've completed all steps and tests successfully:

✅ Your AI agents now use MCP protocol for Tasks operations
✅ All operations are logged and audited
✅ Permission enforcement is centralized
✅ Ready to extend to other modules
✅ Compatible with n8n and other MCP clients

**What you've built:**

A production-ready MCP integration that separates concerns, enforces permissions, and provides a standardized interface for AI agents to interact with your CRM data. This architecture is scalable, secure, and future-proof!
