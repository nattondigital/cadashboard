# Debugging N8N MCP Connection Issues

## How to Check Supabase Edge Function Logs

### Method 1: Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/lddridmkphmckbjjlfxi
2. Click on **Edge Functions** in the left sidebar
3. Click on **mcp-server** function
4. Click on **Logs** tab
5. Watch real-time logs as N8N makes requests

You'll see console.log output including:
- Request method, URL, and headers
- Session ID
- Request body
- Parsed messages
- Any errors

### Method 2: Using the Test Page

I've created `test-n8n-mcp.html` - open it in your browser:

```bash
# Open the test page in your browser
open test-n8n-mcp.html
# or
firefox test-n8n-mcp.html
```

This page lets you:
- Test all MCP methods (initialize, tools/list, etc.)
- See exactly what's being sent and received
- Test both Simple JSON and Streamable HTTP modes
- View detailed logs of all requests/responses

## Common N8N Connection Issues

### Issue 1: Invalid JWT / 401 Error

**Symptom:**
```
{"code":401,"message":"Invalid JWT"}
```

**Cause:** Using invalid authentication token

**Solution:** Use your Supabase Anon Key:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZHJpZG1rcGhtY2tiampsZnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjM0NjAsImV4cCI6MjA3NDk5OTQ2MH0.QpYhrr7a_5kTqsN5TOZOw5Xr4xrOWT1YqK_FzaGZZy4
```

In N8N:
- Header Name: `Authorization`
- Header Value: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZHJpZG1rcGhtY2tiampsZnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjM0NjAsImV4cCI6MjA3NDk5OTQ2MH0.QpYhrr7a_5kTqsN5TOZOw5Xr4xrOWT1YqK_FzaGZZy4`

**Note:** Must include "Bearer " (with space) before the token!

### Issue 2: Error Fetching Options from MCP Client Tool

**Symptom:** N8N can't load the tools list

**Possible Causes:**

1. **Wrong Transport Type**
   - Make sure you selected "HTTP Streamable" not "HTTP+SSE" or "StdIO"

2. **Endpoint URL Typo**
   - Must be exactly: `https://lddridmkphmckbjjlfxi.supabase.co/functions/v1/mcp-server`
   - No trailing slash
   - Check for copy-paste errors

3. **Missing Authorization**
   - N8N must send Authorization header with every request
   - Header format: `Authorization: Bearer <token>`

4. **CORS Issues**
   - Check if N8N is being blocked by browser CORS (unlikely in workflow execution)
   - Try from N8N workflow, not from browser testing

5. **Edge Function Not Deployed**
   - Verify function is deployed and running
   - Check Supabase dashboard

### Issue 3: Tools Load but Tool Calls Fail

**Symptom:** Can see tools but get errors when calling them

**Common Errors:**

1. **"agent_id is required"**
   - Every tool call needs `agent_id` parameter
   - Get agent UUID from `ai_agents` table
   - Example:
     ```json
     {
       "agent_id": "123e4567-e89b-12d3-a456-426614174000",
       "limit": 10
     }
     ```

2. **"Agent does not have permission"**
   - Check `ai_agent_permissions` table
   - Agent needs appropriate permissions:
     - `can_view` for get_tasks
     - `can_create` for create_task
     - `can_edit` for update_task
     - `can_delete` for delete_task

3. **Task Not Found**
   - When calling `get_tasks` with specific `task_id`
   - Verify task exists in database
   - Check task_id format (e.g., "TASK-10031")

## Diagnostic Steps

### Step 1: Test with curl

Test from command line to isolate N8N-specific issues:

```bash
# Test initialize
curl -X POST https://lddridmkphmckbjjlfxi.supabase.co/functions/v1/mcp-server \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZHJpZG1rcGhtY2tiampsZnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjM0NjAsImV4cCI6MjA3NDk5OTQ2MH0.QpYhrr7a_5kTqsN5TOZOw5Xr4xrOWT1YqK_FzaGZZy4" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'

# Expected: {"jsonrpc":"2.0","id":1,"result":{...}}
```

```bash
# Test tools/list
curl -X POST https://lddridmkphmckbjjlfxi.supabase.co/functions/v1/mcp-server \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZHJpZG1rcGhtY2tiampsZnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjM0NjAsImV4cCI6MjA3NDk5OTQ2MH0.QpYhrr7a_5kTqsN5TOZOw5Xr4xrOWT1YqK_FzaGZZy4" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Expected: {"jsonrpc":"2.0","id":1,"result":{"tools":[...]}}
```

### Step 2: Check Supabase Logs

1. Go to Supabase Dashboard → Edge Functions → mcp-server → Logs
2. Look for recent requests
3. Check for errors in console.log output
4. Verify request headers and body are correct

### Step 3: Verify Agent Permissions

```sql
-- Check if agent exists
SELECT * FROM ai_agents WHERE id = 'YOUR-AGENT-UUID';

-- Check agent permissions
SELECT * FROM ai_agent_permissions WHERE agent_id = 'YOUR-AGENT-UUID';

-- Expected permissions structure:
-- {
--   "Tasks": {
--     "can_view": true,
--     "can_create": true,
--     "can_edit": true,
--     "can_delete": false
--   }
-- }
```

### Step 4: Check N8N Configuration

Verify N8N settings exactly match:

**MCP Client Tool Node Settings:**
- **Endpoint**: `https://lddridmkphmckbjjlfxi.supabase.co/functions/v1/mcp-server`
- **Server Transport**: HTTP Streamable
- **Authentication**: Header Auth
- **Header Name**: `Authorization`
- **Header Value**: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZHJpZG1rcGhtY2tiampsZnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjM0NjAsImV4cCI6MjA3NDk5OTQ2MH0.QpYhrr7a_5kTqsN5TOZOw5Xr4xrOWT1YqK_FzaGZZy4`

### Step 5: Test with Test Page

1. Open `test-n8n-mcp.html` in browser
2. Click "1️⃣ Initialize" - should succeed
3. Click "2️⃣ List Tools" - should show 4 tools
4. Check logs in test page for detailed request/response

## Reading Edge Function Logs

### What to Look For

**Successful Request:**
```
=== MCP Server Request ===
Method: POST
URL: https://lddridmkphmckbjjlfxi.supabase.co/functions/v1/mcp-server
Headers: {
  "authorization": "Bearer eyJ...",
  "content-type": "application/json",
  ...
}
POST request - handling MCP messages
Content-Type: application/json
Accept: */*
Supports Streaming: false
Raw body: {"jsonrpc":"2.0","id":1,"method":"tools/list"}
Parsed MCP Messages: [{"jsonrpc":"2.0","id":1,"method":"tools/list"}]
```

**Failed Request:**
```
=== MCP Server Error ===
Error: [error details]
Error message: [message]
Stack: [stack trace]
```

### Common Log Patterns

1. **Authentication Failed** (before edge function):
   ```
   # No logs appear because request blocked by Supabase
   # Check N8N for 401 error response
   ```

2. **Invalid Method**:
   ```
   Method not found: invalid_method
   ```

3. **Missing agent_id**:
   ```
   agent_id is required in arguments
   ```

4. **Permission Denied**:
   ```
   Agent does not have permission to view tasks
   ```

## N8N-Specific Tips

### Tip 1: Use Expression for agent_id

In N8N, you can use expressions to dynamically set agent_id:

```javascript
{{ $json.agent_id }}
```

Or hardcode it if testing:
```json
{
  "agent_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

### Tip 2: Check N8N Execution Logs

In N8N:
1. Run workflow
2. Click on MCP Client Tool node
3. Check "Output" tab to see actual response
4. Check "Input" tab to see what was sent

### Tip 3: Test in N8N Workflow Editor

Before running workflow:
1. Click "Execute Node" button on MCP Client Tool node
2. This tests just that node
3. Check for errors immediately
4. Faster than running full workflow

## Still Having Issues?

### Enable Verbose Logging

The MCP server now has enhanced logging. Every request logs:
- Method and URL
- All headers
- Request body
- Parsed messages
- Response sent
- Any errors with full stack trace

Check Supabase Dashboard → Edge Functions → mcp-server → Logs after each N8N attempt.

### Check Network Tab

If testing from browser (test page):
1. Open browser DevTools (F12)
2. Go to Network tab
3. Make request
4. Click on request
5. Check:
   - Request Headers (especially Authorization)
   - Request Payload
   - Response Headers
   - Response body

### Compare Working vs Failing Requests

1. Test with curl (working)
2. Test with test page (working)
3. Test with N8N (failing?)
4. Compare the logs - what's different?

Common differences:
- Missing "Bearer " prefix
- Wrong endpoint URL
- Missing headers
- Malformed JSON

## Success Checklist

✅ Endpoint URL is correct (no typos, no trailing slash)
✅ Transport is "HTTP Streamable"
✅ Authorization header includes "Bearer " prefix
✅ Authorization token is the Supabase anon key
✅ curl test succeeds
✅ Test page shows tools loading
✅ Agent exists in ai_agents table
✅ Agent has permissions in ai_agent_permissions
✅ Supabase logs show successful requests

## Next Steps After Success

Once connected:
1. Create AI agents for different N8N workflows
2. Set appropriate permissions for each agent
3. Build workflows using MCP tools
4. Monitor ai_agent_logs for audit trail
5. Expand MCP server to support more modules (Leads, Contacts, etc.)

## Support Resources

- `MCP-HTTP-SERVER.md` - Full MCP protocol documentation
- `N8N-MCP-CONFIGURATION.md` - N8N setup guide
- `test-n8n-mcp.html` - Interactive testing tool
- Supabase Dashboard Logs - Real-time request monitoring
