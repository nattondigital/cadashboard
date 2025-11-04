# MCP Integration for AI Agents - Complete Guide

## Overview

Your CRM now has **Model Context Protocol (MCP)** integration for AI Agents powered by OpenRouter. This allows your AI agents to execute CRM operations through a standardized protocol interface, just like n8n workflows connecting to your MCP server.

## What is MCP?

Model Context Protocol is a standardized way for AI assistants to interact with external tools and data sources. Think of it as a universal adapter that lets any AI platform (OpenRouter, Claude Desktop, n8n, etc.) talk to your CRM using the same language.

### Why MCP?

**Before MCP:**
```
AI Agent → Custom Code → Database
```
Each AI platform needs custom integration code.

**With MCP:**
```
AI Agent → MCP Client → MCP Server → Database
```
All AI platforms use the same standardized protocol.

## Quick Start

### 1. Prerequisites

- [ ] Supabase project with `mcp-server` edge function deployed
- [ ] OpenRouter API key configured (Settings → Integrations)
- [ ] At least one AI Agent created

### 2. Enable MCP (2 minutes)

**Option A: Through UI**
1. Go to **AI Agents** → Edit your agent
2. Scroll to **Enable MCP Integration**
3. Check the box
4. Save

**Option B: Via SQL**
```sql
UPDATE ai_agents
SET use_mcp = true,
    mcp_config = '{
      "enabled": true,
      "server_url": "https://your-project.supabase.co/functions/v1/mcp-server",
      "use_for_modules": ["Tasks"]
    }'::jsonb
WHERE id = 'your-agent-id';
```

### 3. Test (1 minute)

1. Open agent chat
2. Look for **MCP Enabled** badge
3. Type: "Create a task called Test with high priority"
4. See: `✅ Task created: Test 🔌 (via MCP)`

That's it! Your agent now uses MCP for task operations.

## Documentation Structure

We've created comprehensive documentation to help you:

### 📚 For Getting Started

**[MCP-QUICK-START.md](./MCP-QUICK-START.md)**
- 5-minute setup guide
- Step-by-step instructions with screenshots
- Testing checklist
- Troubleshooting common issues

**Start here if you want to enable MCP quickly!**

### 📖 For Understanding

**[MCP-AI-AGENTS-INTEGRATION.md](./MCP-AI-AGENTS-INTEGRATION.md)**
- Complete feature overview
- How MCP works with your agents
- Architecture explanation
- Configuration options
- Extension guide for adding more modules

**Read this to understand the system deeply.**

### 🔧 For Developers

**[MCP-IMPLEMENTATION-SUMMARY.md](./MCP-IMPLEMENTATION-SUMMARY.md)**
- Technical implementation details
- Code structure and components
- API reference
- Testing guidelines
- Future roadmap

**Read this if you're extending or debugging the implementation.**

### 🔌 For n8n Integration

**[N8N-MCP-SETUP.md](./N8N-MCP-SETUP.md)**
- n8n MCP client configuration
- Connection details
- Example workflows
- Shared server with AI agents

**Read this if you want to use n8n with the same MCP server.**

### 🏗️ For MCP Server Details

**[MCP-HTTP-SERVER.md](./MCP-HTTP-SERVER.md)**
- MCP server architecture
- Protocol specifications
- Tool definitions
- Permission system
- Logging and monitoring

**Read this for deep MCP server knowledge.**

## Key Features

### ✅ What Works Now

- **Tasks Module MCP Integration**
  - Get tasks (filter by status, priority, task_id)
  - Create tasks with all fields
  - Update task status, priority, assignee, etc.
  - Delete tasks
  - All operations respect agent permissions

- **Visual Indicators**
  - "MCP Enabled" badge in chat interface
  - `🔌 (via MCP)` indicator on MCP operations
  - Clear error messages from MCP server

- **Security & Auditing**
  - All operations logged to `ai_agent_logs`
  - Permission checks enforced by MCP server
  - Can't bypass RLS policies
  - Agent ID tracked for every operation

- **Compatibility**
  - Works with all OpenRouter models
  - Graceful fallback to direct Supabase if MCP fails
  - Same chat experience with/without MCP
  - Compatible with n8n MCP client

### 🚧 Coming Soon

- Leads module MCP tools
- Contacts module MCP tools
- Appointments module MCP tools
- Expenses module MCP tools
- Multi-server support (connect to external MCP servers)
- MCP tool caching for better performance

## Architecture

```
┌─────────────┐
│    User     │
│   Types     │
│   Message   │
└──────┬──────┘
       │
       v
┌──────────────────┐
│  OpenRouter AI   │ ← Gemini/GPT/Claude
│  "Create a task" │ ← Decides to use create_task tool
└──────┬───────────┘
       │
       v
┌──────────────────────┐
│  Should Use MCP?     │ ← Checks agent config
│  ├─ Yes → MCP Path   │
│  └─ No → Direct Path │
└──────┬───────────────┘
       │
       v (Yes)
┌──────────────────────┐
│   MCP Client         │
│   ├─ Convert format  │ ← OpenRouter → MCP JSON-RPC
│   ├─ Add agent_id    │
│   └─ Send via HTTP   │
└──────┬───────────────┘
       │
       v
┌──────────────────────┐
│   MCP Server         │
│   ├─ Validate agent  │ ← Check permissions
│   ├─ Execute query   │ ← Database operation
│   ├─ Log action      │ ← Audit trail
│   └─ Return result   │
└──────┬───────────────┘
       │
       v
┌──────────────────────┐
│   Response           │
│   "✅ Task created   │
│    🔌 (via MCP)"     │
└──────────────────────┘
```

## Real-World Example

### Without MCP

**User**: "Create a task for follow-up call"

```
1. OpenRouter AI decides to use create_task
2. Frontend executes: supabase.from('tasks').insert({...})
3. Database inserts directly
4. Response: "✅ Task created"
```

**Issues:**
- Business logic scattered in frontend
- Hard to audit operations
- Each platform needs custom code
- Permission checks in multiple places

### With MCP

**User**: "Create a task for follow-up call"

```
1. OpenRouter AI decides to use create_task
2. MCP Client converts to MCP format
3. MCP Server validates permissions
4. MCP Server logs the operation
5. MCP Server executes database query
6. Response flows back through MCP
7. Response: "✅ Task created 🔌 (via MCP)"
```

**Benefits:**
- All logic in one place (MCP server)
- Every operation logged automatically
- Same code for n8n, agents, API
- Single permission check point

## FAQ

### Q: Do I need to enable MCP for all agents?

**A**: No! MCP is optional per agent. You can have:
- Agent A with MCP enabled
- Agent B without MCP (uses direct Supabase)
- Both work the same from user perspective

### Q: Will my existing agents break?

**A**: No! The migration adds new fields with default values (`use_mcp = false`). Existing agents continue working exactly as before.

### Q: What happens if MCP server is down?

**A**: The system gracefully falls back to direct Supabase queries. Users see no interruption.

### Q: Can n8n and AI agents share the same MCP server?

**A**: Yes! They both use your Supabase MCP server with the same permission system.

### Q: How do I add more modules to MCP?

**A**: See the "Extending to Other Modules" section in `MCP-AI-AGENTS-INTEGRATION.md`. Basically:
1. Update MCP server with new tools
2. Update agent's `mcp_config.use_for_modules` array
3. That's it!

### Q: Does MCP affect performance?

**A**: Minimal impact. One extra HTTP call to the MCP server, but you gain:
- Automatic logging
- Centralized permissions
- Consistent error handling
- Worth the tiny overhead!

### Q: Can I use external MCP servers?

**A**: Not yet, but it's planned! Phase 4 of the roadmap includes multi-server support.

## Monitoring

### Check MCP Usage

```sql
-- See which agents use MCP
SELECT id, name, use_mcp, mcp_config->>'server_url' as server
FROM ai_agents
WHERE use_mcp = true;

-- See recent MCP operations
SELECT created_at, agent_name, action, module, result
FROM ai_agent_logs
WHERE user_context = 'MCP Server HTTP'
ORDER BY created_at DESC
LIMIT 20;

-- Count operations by module
SELECT
  module,
  COUNT(*) as total_operations,
  COUNT(*) FILTER (WHERE result = 'Success') as successful,
  COUNT(*) FILTER (WHERE result = 'Error') as failed
FROM ai_agent_logs
WHERE user_context = 'MCP Server HTTP'
GROUP BY module;
```

### MCP Server Health

1. Go to Supabase Dashboard
2. Edge Functions → mcp-server
3. Check:
   - Deployment status
   - Recent invocations
   - Error logs
   - Response times

## Next Steps

### 1. Enable MCP (5 minutes)

Follow the Quick Start above or see `MCP-QUICK-START.md`

### 2. Test Thoroughly (10 minutes)

Use the testing checklist in `MCP-QUICK-START.md`

### 3. Monitor Operations (Ongoing)

Set up a dashboard using the monitoring queries above

### 4. Extend to More Modules (As needed)

When ready, follow the extension guide in `MCP-AI-AGENTS-INTEGRATION.md`

### 5. Connect n8n (Optional)

Use `N8N-MCP-SETUP.md` to create automation workflows

## Support

### Documentation

- **Quick Start**: `MCP-QUICK-START.md`
- **Complete Guide**: `MCP-AI-AGENTS-INTEGRATION.md`
- **Technical Details**: `MCP-IMPLEMENTATION-SUMMARY.md`
- **n8n Integration**: `N8N-MCP-SETUP.md`
- **Server Docs**: `MCP-HTTP-SERVER.md`

### Troubleshooting

1. **Check Documentation**: Most issues covered in Quick Start guide
2. **Check Logs**: `ai_agent_logs` table shows all operations
3. **Check Server**: Supabase Edge Functions logs
4. **Check Config**: Verify `use_mcp` and `mcp_config` in database

### Common Issues

| Issue | Solution |
|-------|----------|
| No MCP badge | Enable `use_mcp` in agent settings |
| Permission error | Check agent permissions for Tasks module |
| Tools not loading | Verify MCP server is deployed |
| No MCP indicator | Check `mcp_config.use_for_modules` includes "Tasks" |

## Success Checklist

Before considering MCP integration complete:

- [ ] Migration applied to database
- [ ] At least one agent has MCP enabled
- [ ] Agent has Tasks permissions configured
- [ ] "MCP Enabled" badge shows in chat
- [ ] Can create task via MCP (see `🔌` indicator)
- [ ] Can get tasks via MCP (see `🔌` indicator)
- [ ] Operations appear in `ai_agent_logs`
- [ ] Tested with n8n (optional)
- [ ] Team trained on MCP benefits
- [ ] Monitoring dashboard set up

## Conclusion

You now have a production-ready MCP integration that:

✅ Standardizes AI agent tool execution
✅ Works seamlessly with OpenRouter models
✅ Shares infrastructure with n8n
✅ Enforces permissions centrally
✅ Logs all operations automatically
✅ Scales to any module
✅ Future-proofs your architecture

**The foundation is built. The Tasks module is ready. Other modules can be added incrementally as needed.**

---

## Quick Reference Card

```bash
# Enable MCP for an agent
UPDATE ai_agents SET use_mcp = true WHERE id = 'agent-id';

# Check if MCP is working
SELECT * FROM ai_agent_logs
WHERE user_context = 'MCP Server HTTP'
ORDER BY created_at DESC LIMIT 5;

# Disable MCP for an agent
UPDATE ai_agents SET use_mcp = false WHERE id = 'agent-id';

# Test MCP in chat
"Create a task called Test with high priority"
→ Look for: ✅ Task created: Test 🔌 (via MCP)
```

**Happy Building! 🚀**
