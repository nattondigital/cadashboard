# Deploy MCP Server Fix - Step by Step

## The Problem
N8N cannot connect because the deployed MCP server is still using the old code that returns SSE streams for `initialize` requests instead of plain JSON.

## The Solution
The fix is ready in: `supabase/functions/mcp-server/index.ts`

You need to deploy it to Supabase.

---

## Method 1: Supabase Dashboard (Easiest - Recommended)

### Step 1: Go to Supabase Dashboard
Visit: https://supabase.com/dashboard/project/lddridmkphmckbjjlfxi/functions

### Step 2: Find the mcp-server Function
- Click on **"mcp-server"** in the list of Edge Functions

### Step 3: Edit the Function
- Click **"Edit Function"** button (top right)

### Step 4: Replace the Code
- Select all the existing code (Ctrl+A / Cmd+A)
- Delete it
- Copy the entire content from: `/tmp/cc-agent/57919466/project/supabase/functions/mcp-server/index.ts`
- Paste it into the editor

### Step 5: Deploy
- Click **"Deploy"** button
- Wait for deployment to complete (usually 10-30 seconds)

### Step 6: Verify Deployment
Open a terminal and test:

```bash
curl -X POST https://lddridmkphmckbjjlfxi.supabase.co/functions/v1/mcp-server \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZHJpZG1rcGhtY2tiampsZnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjM0NjAsImV4cCI6MjA3NDk5OTQ2MH0.QpYhrr7a_5kTqsN5TOZOw5Xr4xrOWT1YqK_FzaGZZy4" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'
```

**Expected Response (Good):**
```json
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05",...}}
```

**NOT this (Old/Bad):**
```
data: {"jsonrpc":"2.0",...}
```

---

## Method 2: Using Supabase CLI (If Installed)

If you have Supabase CLI installed locally on your machine:

```bash
# Navigate to your project directory
cd /tmp/cc-agent/57919466/project

# Login to Supabase (if not already)
supabase login

# Link your project
supabase link --project-ref lddridmkphmckbjjlfxi

# Deploy the function
supabase functions deploy mcp-server

# Test
curl -X POST https://lddridmkphmckbjjlfxi.supabase.co/functions/v1/mcp-server \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZHJpZG1rcGhtY2tiampsZnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjM0NjAsImV4cCI6MjA3NDk5OTQ2MH0.QpYhrr7a_5kTqsN5TOZOw5Xr4xrOWT1YqK_FzaGZZy4" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'
```

---

## Method 3: Using Supabase Management API

If you have your Supabase access token:

```bash
# Get your access token from: https://supabase.com/dashboard/account/tokens

# Deploy using the API
curl -X POST "https://api.supabase.com/v1/projects/lddridmkphmckbjjlfxi/functions/mcp-server" \
  -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "slug": "mcp-server",
  "name": "mcp-server",
  "verify_jwt": true,
  "entrypoint_path": "index.ts",
  "files": [
    {
      "name": "index.ts",
      "content": "PASTE_FILE_CONTENT_HERE"
    }
  ]
}
EOF
```

---

## After Deployment: Test with N8N

### Step 1: Configure N8N MCP Client

1. **Endpoint URL:**
   ```
   https://lddridmkphmckbjjlfxi.supabase.co/functions/v1/mcp-server
   ```

2. **Server Transport:**
   - Select: `HTTP Streamable`

3. **Authentication:**
   - Type: `Header Auth`
   - Header Name: `Authorization`
   - Header Value:
     ```
     Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZHJpZG1rcGhtY2tiampsZnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjM0NjAsImV4cCI6MjA3NDk5OTQ2MH0.QpYhrr7a_5kTqsN5TOZOw5Xr4xrOWT1YqK_FzaGZZy4
     ```

4. **Tools to Include:**
   - You should now see 4 tools:
     - ✅ get_tasks
     - ✅ create_task
     - ✅ update_task
     - ✅ delete_task

### Step 2: Test a Tool Call

Try calling `get_tasks`:

**Parameters:**
```json
{
  "agent_id": "YOUR_AGENT_UUID",
  "limit": 10,
  "status": "To Do"
}
```

---

## What Changed in the Fix

### Before (Broken):
```typescript
// Always checked Accept header
if (supportsStreaming) {
  // Returned SSE stream for ALL requests including initialize
  return SSE_STREAM
}
```

### After (Fixed):
```typescript
// Check if message is initialize
const hasInitialize = messages.some(msg => msg.method === 'initialize')

// Only use SSE for non-initialize requests
const useStreaming = supportsStreaming && !hasInitialize

if (useStreaming) {
  return SSE_STREAM
} else {
  return JSON_RESPONSE  // ✅ Returns JSON for initialize
}
```

### Why This Matters

According to MCP Streamable HTTP specification:
> For initialize requests, the server MUST return `Content-Type: application/json` with the `Mcp-Session-Id` header.

N8N sends:
```
POST /mcp-server
Content-Type: application/json
Accept: application/json, text/event-stream
Body: {"jsonrpc":"2.0","method":"initialize",...}
```

Old server saw `Accept: text/event-stream` and returned SSE format → N8N rejected it ❌

New server checks if method is `initialize` and returns JSON → N8N accepts it ✅

---

## Troubleshooting After Deployment

### Issue: Still getting "Could not connect" error

**Check 1: Is the function deployed?**
```bash
curl -I https://lddridmkphmckbjjlfxi.supabase.co/functions/v1/mcp-server
```
Should return `200 OK` or redirect

**Check 2: Test initialize directly**
```bash
curl -X POST https://lddridmkphmckbjjlfxi.supabase.co/functions/v1/mcp-server \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZHJpZG1rcGhtY2tiampsZnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjM0NjAsImV4cCI6MjA3NDk5OTQ2MH0.QpYhrr7a_5kTqsN5TOZOw5Xr4xrOWT1YqK_FzaGZZy4" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}' \
  -w "\nContent-Type: %{content_type}\n"
```

**Expected:**
- Content-Type: `application/json` (NOT `text/event-stream`)
- Response: `{"jsonrpc":"2.0","id":1,"result":{...}}`

**Check 3: View Supabase Logs**
Go to: https://supabase.com/dashboard/project/lddridmkphmckbjjlfxi/functions/mcp-server/logs

Look for:
```
POST request - handling MCP messages
Using plain JSON response  <-- This should appear for initialize
```

**Check 4: N8N Authorization Header**
Make sure it includes "Bearer " with a space:
```
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

NOT:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Issue: Tools load but cannot call them

**Cause:** Missing or invalid `agent_id`

**Solution:**
1. Create an AI Agent in your CRM (if you haven't)
2. Get the agent UUID from `ai_agents` table
3. Set permissions in `ai_agent_permissions` table:
   ```sql
   INSERT INTO ai_agent_permissions (agent_id, permissions)
   VALUES (
     'YOUR-AGENT-UUID',
     '{"Tasks": {"can_view": true, "can_create": true, "can_edit": true, "can_delete": true}}'
   );
   ```
4. Use that UUID in all tool calls

---

## Success Indicators

After successful deployment, you should see:

✅ N8N MCP Client connects without errors
✅ N8N shows 4 available tools
✅ Tools can be added to workflows
✅ Tool calls return data (with valid agent_id)
✅ Actions are logged in `ai_agent_logs` table

---

## Quick Command Reference

**Test initialize (should return JSON):**
```bash
curl -X POST https://lddridmkphmckbjjlfxi.supabase.co/functions/v1/mcp-server \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZHJpZG1rcGhtY2tiampsZnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjM0NjAsImV4cCI6MjA3NDk5OTQ2MH0.QpYhrr7a_5kTqsN5TOZOw5Xr4xrOWT1YqK_FzaGZZy4" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'
```

**Test tools/list:**
```bash
curl -X POST https://lddridmkphmckbjjlfxi.supabase.co/functions/v1/mcp-server \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZHJpZG1rcGhtY2tiampsZnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjM0NjAsImV4cCI6MjA3NDk5OTQ2MH0.QpYhrr7a_5kTqsN5TOZOw5Xr4xrOWT1YqK_FzaGZZy4" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

**Test get_tasks tool:**
```bash
curl -X POST https://lddridmkphmckbjjlfxi.supabase.co/functions/v1/mcp-server \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZHJpZG1rcGhtY2tiampsZnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjM0NjAsImV4cCI6MjA3NDk5OTQ2MH0.QpYhrr7a_5kTqsN5TOZOw5Xr4xrOWT1YqK_FzaGZZy4" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_tasks","arguments":{"agent_id":"YOUR-AGENT-UUID","limit":5}}}'
```

---

## Need Help?

1. Check Supabase Edge Function logs for detailed debugging
2. Use the test page at: `/tmp/cc-agent/57919466/project/public/test-n8n-mcp.html`
3. Review: `DEBUGGING-N8N-MCP.md` for troubleshooting guide
4. Review: `N8N-MCP-CONFIGURATION.md` for N8N setup details

---

**Remember:** The fix is ready, it just needs to be deployed!

Use Method 1 (Supabase Dashboard) - it's the fastest and easiest way.
