# Quick Start Guide - 10 Minutes

Get your Tasks MCP Server running in under 10 minutes.

## Prerequisites

- Node.js 18+ installed
- Access to Supabase Dashboard
- Your CRM database already set up

## Step-by-Step Setup

### 1. Install Dependencies (2 min)

```bash
cd /tmp/cc-agent/57919466/project/mcp-servers
npm install
```

### 2. Get Service Role Key (3 min)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Settings** → **API**
4. Find **Project API keys** section
5. Copy the **`service_role`** key (NOT the anon key!)

### 3. Configure Environment (1 min)

```bash
# Copy example env file
cp .env.example .env

# Edit the file
nano .env
```

Update these values:
```env
SUPABASE_URL=https://lddridmkphmckbjjlfxi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=paste_your_service_role_key_here
AGENT_ID=  # Leave empty for now
```

Save and exit (`Ctrl+X`, then `Y`, then `Enter`).

### 4. Test the Server (2 min)

```bash
npm run test:client
```

You should see:
```
🧪 Starting Tasks MCP Server Test...
📡 Connecting to Tasks MCP Server...
✅ Connected successfully

📋 Test 1: List Resources
──────────────────────────────────────────────────
Found 6 resources:
  - All Tasks (tasks://all)
  - Pending Tasks (tasks://pending)
  ...

✨ All tests completed successfully!
```

### 5. Create AI Agent (Optional - 2 min)

If you want to test CRUD operations:

**Option A: Via CRM UI**
1. Go to AI Agents page
2. Create new agent: "Tasks Assistant"
3. Enable Tasks permissions (View, Create, Edit, Delete)
4. Copy the agent ID
5. Add to `.env`: `AGENT_ID=your-agent-id`

**Option B: Via SQL**
```sql
-- Create agent
INSERT INTO ai_agents (name, description, status, model)
VALUES ('Tasks Assistant', 'MCP test agent', 'active', 'gpt-4')
RETURNING id;

-- Add permissions (use ID from above)
INSERT INTO ai_agent_permissions (agent_id, permissions)
VALUES ('agent-id-here', '{
  "Tasks": {
    "can_view": true,
    "can_create": true,
    "can_edit": true,
    "can_delete": true
  }
}'::jsonb);
```

### 6. Test Again with Agent (1 min)

```bash
npm run test:client
```

Now Test 7 should create a test task successfully!

## Quick Reference

### Test Commands
```bash
npm run test:client       # Run all tests
npm run dev:tasks         # Start server manually
npm run build             # Compile TypeScript
```

### Check Logs
```sql
-- View recent MCP operations
SELECT * FROM ai_agent_logs
WHERE module = 'Tasks'
ORDER BY created_at DESC
LIMIT 10;
```

### Common Issues

**"Missing required environment variables"**
- Check `.env` file exists
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set

**"Failed to connect to Supabase"**
- Verify service_role_key is correct (not anon key)
- Check Supabase project is accessible

**"Permission denied"**
- Set `AGENT_ID` in `.env`
- Verify agent has Tasks permissions
- Check `ai_agent_permissions` table

## What's Next?

Once testing succeeds:

1. Read [AUTHENTICATION-INTEGRATION.md](./AUTHENTICATION-INTEGRATION.md) to understand how this works with your OTP auth
2. Review [README.md](./README.md) for complete API reference
3. Check [NEXT-STEPS.md](./NEXT-STEPS.md) for integration options
4. Explore [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md) for technical details

## Success Checklist

- [ ] Dependencies installed
- [ ] `.env` configured with service_role_key
- [ ] Test client runs successfully
- [ ] All 7 tests pass (or 6 without agent)
- [ ] Operations logged to ai_agent_logs
- [ ] Ready to integrate with AI chat!

Time to complete: **~10 minutes**
