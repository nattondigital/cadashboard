# AI Chat Function Fixes - Configuration Guide

## Issues Fixed

The 403 error you received was caused by three issues in the `ai-chat` edge function:

1. ✅ **Wrong field check**: Changed from `agent.is_active` to `agent.status !== 'Active'`
2. ✅ **Missing api_key column**: Added `api_key` column to `ai_agents` table
3. ✅ **Permissions structure**: Fixed to properly read from `ai_agent_permissions` table

## Changes Made

### 1. Database Migration
```sql
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS api_key text;
```

### 2. Function Updates
- Fixed status check to use `agent.status` instead of `agent.is_active`
- Added API key validation with helpful error message
- Fixed permissions loading from `ai_agent_permissions` table
- Proper handling of JSONB permissions structure

## Required Configuration

### Step 1: Add API Key to Your Agent

Your agent needs an OpenRouter or OpenAI API key to make LLM calls:

```sql
UPDATE ai_agents
SET api_key = 'sk-or-v1-your-actual-openrouter-key-here'
WHERE id = 'bcae762b-1db8-4e83-9487-0d12ba09b924';
```

**Get an API key from:**
- **OpenRouter** (Recommended): https://openrouter.ai/keys
  - Provides access to multiple LLM providers
  - Your agent uses: `openai/gpt-4o-mini`
- **OpenAI**: https://platform.openai.com/api-keys
  - Direct OpenAI API access

### Step 2: Deploy Updated Function

The migration has already been applied. Now deploy the updated function:

```bash
supabase functions deploy ai-chat
```

Or use the Supabase Dashboard:
1. Go to: https://supabase.com/dashboard/project/lddridmkphmckbjjlfxi/functions
2. Find **ai-chat** function
3. Click **Edit Function**
4. Replace code with content from: `supabase/functions/ai-chat/index.ts`
5. Click **Deploy**

## Verify Configuration

Check your agent is properly configured:

```sql
SELECT
  name,
  status,
  use_mcp,
  model,
  CASE
    WHEN api_key IS NOT NULL THEN '✓ API Key Configured'
    ELSE '✗ API Key Missing'
  END as api_key_status,
  mcp_config
FROM ai_agents
WHERE id = 'bcae762b-1db8-4e83-9487-0d12ba09b924';
```

**Expected output:**
- `name`: "TASK AGENT"
- `status`: "Active"
- `use_mcp`: true
- `model`: "openai/gpt-4o-mini"
- `api_key_status`: "✓ API Key Configured"
- `mcp_config`: `{"enabled": true, "server_url": "...", "use_for_modules": ["Tasks"]}`

## Test the Agent

Once configured, test from n8n or with curl:

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
| 403 | "Agent is not active" | Set `status = 'Active'` |
| 400 | "Agent API key not configured" | Add `api_key` to agent |
| 404 | "Agent not found" | Check `agent_id` is correct |
| 500 | Function error | Check Supabase function logs |

## Troubleshooting

### Error: "Agent API key not configured"

```sql
-- Add your OpenRouter API key
UPDATE ai_agents
SET api_key = 'sk-or-v1-your-key-here'
WHERE id = 'bcae762b-1db8-4e83-9487-0d12ba09b924';
```

### Error: "Agent is not active"

```sql
-- Activate the agent
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

- [x] Migration applied (api_key column added)
- [ ] OpenRouter API key added to agent
- [ ] ai-chat function deployed
- [ ] Agent status verified as "Active"
- [ ] Test request successful
- [ ] Logs show "MCP mode" for tasks

## Next Steps

Once working:

1. **Monitor API usage** - Track costs per agent via OpenRouter dashboard
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
