# AI Chat Function Fixes - Configuration Guide

## Issues Fixed

The 403 error was caused by two issues in the `ai-chat` edge function:

1. ✅ **Wrong field check**: Changed from `agent.is_active` to `agent.status !== 'Active'`
2. ✅ **Permissions structure**: Fixed to properly read from `ai_agent_permissions` table
3. ✅ **API Key source**: Now uses centralized OpenRouter key from `integrations` table

## Changes Made

### 1. Function Updates
- Fixed status check to use `agent.status` instead of `agent.is_active`
- Fetch OpenRouter API key from `integrations` table (centralized)
- Fixed permissions loading from `ai_agent_permissions` table
- Proper handling of JSONB permissions structure

### 2. No Database Migration Needed
- OpenRouter API key is already configured in `integrations` table ✓
- No need to add per-agent API keys
- Centralized configuration in Settings > Integrations

## Verify Configuration

Check your OpenRouter integration is configured:

```sql
SELECT
  integration_type,
  name,
  status,
  config->>'apiKey' as api_key_present
FROM integrations
WHERE integration_type = 'openrouter';
```

**Expected output:**
- `integration_type`: "openrouter"
- `name`: "OpenRouter"
- `status`: "Connected"
- `api_key_present`: "sk-or-v1-..." (your key)

## Deploy Updated Function

Deploy the updated ai-chat function:

```bash
supabase functions deploy ai-chat
```

Or use the Supabase Dashboard:
1. Go to: https://supabase.com/dashboard/project/lddridmkphmckbjjlfxi/functions
2. Find **ai-chat** function
3. Click **Edit Function**
4. Replace code with content from: `supabase/functions/ai-chat/index.ts`
5. Click **Deploy**

## Test the Agent

Once deployed, test from n8n or with curl:

```bash
curl -X POST https://lddridmkphmckbjjlfxi.supabase.co/functions/v1/ai-chat \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "bcae762b-1db8-4e83-9487-0d12ba09b924",
    "phone_number": "9034812332",
    "message": "provide details for task TASK-10028"
  }'
```

**Expected response:**
```json
{
  "response": "Here are the details for task TASK-10028: ..."
}
```

## Agent Configuration Summary

Your **TASK AGENT** currently has:

### Status
- Name: "TASK AGENT"
- Status: "Active" ✓
- Model: "openai/gpt-4o-mini"
- MCP: Enabled for Tasks module

### Permissions (12 modules configured)

| Module | View | Create | Edit | Delete | Notes |
|--------|------|--------|------|--------|-------|
| Tasks | ✓ | ✓ | ✓ | ✓ | **Full access via MCP** |
| Contacts | ✓ | ✓ | ✓ | - | Hardcoded tools |
| Leads | ✓ | ✓ | ✓ | - | Hardcoded tools |
| Appointments | ✓ | ✓ | ✓ | - | Hardcoded tools |
| Support Tickets | ✓ | ✓ | ✓ | - | Hardcoded tools |
| Expenses | ✓ | ✓ | ✓ | - | Hardcoded tools |
| Billing | ✓ | ✓ | ✓ | - | Hardcoded tools |
| Files | ✓ | - | - | - | Read-only |
| Notes | ✓ | - | - | - | Read-only |
| Members | ✓ | - | - | - | Read-only |
| Products | ✓ | - | - | - | Read-only |
| Affiliates | ✓ | - | - | - | Read-only |

### MCP Configuration

```json
{
  "enabled": true,
  "server_url": "https://lddridmkphmckbjjlfxi.supabase.co/functions/v1/mcp-server",
  "use_for_modules": ["Tasks"]
}
```

**How it works:**
- **Tasks** → Uses MCP server (dynamic tools, better context)
- **All other modules** → Uses hardcoded tools (faster, simpler)

## Error Codes Reference

| Code | Error | Solution |
|------|-------|----------|
| 403 | "Agent is not active" | Set `status = 'Active'` in ai_agents |
| 400 | "OpenRouter API key not configured" | Configure in Settings > Integrations |
| 404 | "Agent not found" | Check `agent_id` is correct |
| 500 | Function error | Check Supabase function logs |

## Troubleshooting

### Error: "OpenRouter API key not configured"

The API key should already be in the integrations table. Verify:

```sql
SELECT status, config FROM integrations WHERE integration_type = 'openrouter';
```

If missing, add it via the Settings > Integrations page in your app.

### Error: "Agent is not active"

```sql
UPDATE ai_agents
SET status = 'Active'
WHERE id = 'bcae762b-1db8-4e83-9487-0d12ba09b924';
```

### View Function Logs

```bash
supabase functions logs ai-chat --tail
```

Or in Supabase Dashboard:
https://supabase.com/dashboard/project/lddridmkphmckbjjlfxi/functions/ai-chat/logs

## Setup Checklist

- [x] OpenRouter integration configured ✓
- [x] Function updated to use centralized API key
- [ ] ai-chat function deployed
- [x] Agent status verified as "Active"
- [ ] Test request successful
- [ ] Logs show "MCP mode" for tasks

## Advantages of Centralized API Key

✅ **Single configuration point** - Update once, affects all agents
✅ **Better cost tracking** - All API usage under one key
✅ **Easier management** - Configure via Settings UI
✅ **No duplication** - One API key for entire system
✅ **Consistent configuration** - All agents use same integration

## Next Steps

Once working:

1. **Monitor API usage** - Track costs via OpenRouter dashboard
2. **Test MCP mode** - Compare response quality for Tasks
3. **Extend MCP server** - Add more modules (Contacts, Leads, etc.)
4. **Set up error handling** - Proper error responses in n8n workflows
5. **Add more agents** - Create specialized agents for different purposes

## Cost Estimation

Using **OpenRouter** with `openai/gpt-4o-mini`:
- Input: ~$0.15 per 1M tokens
- Output: ~$0.60 per 1M tokens

**Typical chat turn:**
- User message: ~50 tokens
- System prompt + tools: ~500 tokens
- AI response: ~200 tokens
- **Total: ~750 tokens = ~$0.0005 per message**

1000 messages ≈ $0.50

## Related Documentation

- `MCP-HYBRID-QUICK-START.md` - Hybrid MCP architecture
- `AI-CHAT-MCP-HYBRID.md` - Technical implementation details
- `MCP-IMPLEMENTATION-SUMMARY.md` - MCP server overview
