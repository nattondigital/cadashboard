# N8N MCP Client Setup Guide

## Quick Setup Instructions

Use these details to configure the N8N MCP Client node to connect to your CRM MCP server.

---

## 📋 Connection Details

### Server URL
```
https://lddridmkphmckbjjlfxi.supabase.co/functions/v1/mcp-server
```

### Authentication
**Type:** Bearer Token
**Token:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZHJpZG1rcGhtY2tiampsZnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjM0NjAsImV4cCI6MjA3NDk5OTQ2MH0.QpYhrr7a_5kTqsN5TOZOw5Xr4xrOWT1YqK_FzaGZZy4
```

### Protocol
- **Type:** HTTP/HTTPS
- **Method:** POST
- **Content-Type:** application/json

---

## 🔧 N8N MCP Client Node Configuration

### Step 1: Add MCP Client Node

1. In N8N, add a new node
2. Search for "MCP" or "Model Context Protocol"
3. Select "MCP Client" node

### Step 2: Configure Connection

Fill in these fields in the N8N node:

| Field | Value |
|-------|-------|
| **Server URL** | `https://lddridmkphmckbjjlfxi.supabase.co/functions/v1/mcp-server` |
| **Transport Type** | HTTP/HTTPS |
| **Authentication** | Bearer Token |
| **Token** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZHJpZG1rcGhtY2tiampsZnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjM0NjAsImV4cCI6MjA3NDk5OTQ2MH0.QpYhrr7a_5kTqsN5TOZOw5Xr4xrOWT1YqK_FzaGZZy4` |

### Step 3: Custom Headers (if needed)

If N8N requires manual header configuration:

```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZHJpZG1rcGhtY2tiampsZnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjM0NjAsImV4cCI6MjA3NDk5OTQ2MH0.QpYhrr7a_5kTqsN5TOZOw5Xr4xrOWT1YqK_FzaGZZy4"
}
```

---

## 🎯 Getting Your Agent ID

**IMPORTANT:** You need an active AI agent to use the MCP server.

### Option 1: Query Database

Run this SQL in your Supabase SQL Editor:

```sql
SELECT id, name, status
FROM ai_agents
WHERE status = 'active'
LIMIT 1;
```

Copy the `id` value - this is your `agent_id`.

### Option 2: Create New Agent

If you don't have an agent, create one:

```sql
-- Insert a new AI agent
INSERT INTO ai_agents (name, status, description)
VALUES ('N8N Test Agent', 'active', 'Agent for testing N8N MCP integration')
RETURNING id, name;

-- Grant permissions
INSERT INTO ai_agent_permissions (agent_id, permissions)
VALUES (
  'YOUR-AGENT-ID-FROM-ABOVE',
  '{
    "Tasks": {
      "can_view": true,
      "can_create": true,
      "can_edit": true,
      "can_delete": true
    }
  }'::jsonb
);
```

---

## 📝 Test Requests in N8N

### Test 1: Initialize Connection

**MCP Method:** `initialize`

**Request Body:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize"
}
```

**Expected Response:**
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

### Test 2: List Available Tools

**MCP Method:** `tools/list`

**Request Body:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "get_tasks",
        "description": "Retrieve tasks with advanced filtering",
        "inputSchema": { ... }
      },
      {
        "name": "create_task",
        "description": "Create a new task",
        "inputSchema": { ... }
      },
      {
        "name": "update_task",
        "description": "Update an existing task",
        "inputSchema": { ... }
      },
      {
        "name": "delete_task",
        "description": "Delete a task",
        "inputSchema": { ... }
      }
    ]
  }
}
```

### Test 3: Get Tasks (requires agent_id)

**MCP Method:** `tools/call`
**Tool Name:** `get_tasks`

**Request Body:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get_tasks",
    "arguments": {
      "agent_id": "YOUR-AGENT-ID-HERE",
      "limit": 5
    }
  }
}
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\": true, \"data\": [...], \"count\": 5}"
      }
    ]
  }
}
```

### Test 4: Create a Task

**MCP Method:** `tools/call`
**Tool Name:** `create_task`

**Request Body:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "create_task",
    "arguments": {
      "agent_id": "YOUR-AGENT-ID-HERE",
      "title": "Test task from N8N",
      "description": "This task was created via N8N MCP client",
      "priority": "High",
      "status": "To Do",
      "due_date": "2025-11-10"
    }
  }
}
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\": true, \"data\": {...}, \"message\": \"Task created successfully with ID: TASK-10xxx\"}"
      }
    ]
  }
}
```

---

## 🔍 N8N Workflow Example

Here's a complete N8N workflow to test the MCP server:

### Node 1: Manual Trigger
- Just a manual trigger to start the workflow

### Node 2: MCP Client - Initialize
- **Method:** `initialize`
- Test the connection

### Node 3: MCP Client - List Tools
- **Method:** `tools/list`
- See what tools are available

### Node 4: MCP Client - Get Tasks
- **Method:** `tools/call`
- **Tool:** `get_tasks`
- **Arguments:**
  ```json
  {
    "agent_id": "{{YOUR_AGENT_ID}}",
    "limit": 10,
    "status": "To Do"
  }
  ```

### Node 5: MCP Client - Create Task
- **Method:** `tools/call`
- **Tool:** `create_task`
- **Arguments:**
  ```json
  {
    "agent_id": "{{YOUR_AGENT_ID}}",
    "title": "N8N Automation Task",
    "description": "Created via N8N workflow",
    "priority": "Medium"
  }
  ```

---

## 🎨 N8N Node Configuration (Visual)

```
┌─────────────────────────────────────┐
│     MCP Client Node Settings        │
├─────────────────────────────────────┤
│ Server URL:                         │
│ [https://lddridmkphmckbjjlfxi.su...│
│                                     │
│ Transport: [HTTP/HTTPS ▼]          │
│                                     │
│ Authentication:                     │
│ Type: [Bearer Token ▼]             │
│ Token: [eyJhbGciOiJIUzI1Ni...]     │
│                                     │
│ Method:                             │
│ [tools/call ▼]                      │
│                                     │
│ Tool Name:                          │
│ [get_tasks    ]                     │
│                                     │
│ Arguments (JSON):                   │
│ {                                   │
│   "agent_id": "uuid-here",         │
│   "limit": 5                       │
│ }                                   │
└─────────────────────────────────────┘
```

---

## ⚠️ Important Notes

### 1. Agent ID is Required
**Every tool call must include `agent_id` in the arguments.**

To get your agent ID:
- Run the SQL query above
- Or check your CRM's AI Agents page
- Copy the UUID value

### 2. Permissions Required
Your agent must have the correct permissions:
- **can_view** - to get/read tasks
- **can_create** - to create tasks
- **can_edit** - to update tasks
- **can_delete** - to delete tasks

### 3. Response Format
All tool responses are wrapped in MCP format:
```json
{
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{actual response JSON here}"
      }
    ]
  }
}
```

You need to parse the `text` field to get the actual data.

---

## 🐛 Troubleshooting

### Error: "agent_id is required"
**Solution:** Add `agent_id` to your tool arguments:
```json
{
  "agent_id": "your-uuid-here",
  "...other args..."
}
```

### Error: "Agent does not have permission"
**Solution:** Update permissions in database:
```sql
UPDATE ai_agent_permissions
SET permissions = jsonb_set(
  permissions,
  '{Tasks,can_view}',
  'true'
)
WHERE agent_id = 'your-agent-id';
```

### Error: 401 Unauthorized
**Solution:** Check your Bearer token is correct and not expired.

### Error: 404 Not Found
**Solution:** Ensure the edge function is deployed:
- Check Supabase Dashboard → Edge Functions
- Verify `mcp-server` is listed and deployed

### Connection Timeout
**Solution:**
- Verify Supabase project is active
- Check if edge function is running
- Test with curl first before N8N

---

## 📊 Monitoring

### Check Logs in Supabase
1. Go to Supabase Dashboard
2. Edge Functions → mcp-server
3. View Logs tab
4. Filter by errors

### Check Audit Logs
```sql
SELECT
  created_at,
  agent_name,
  action,
  result,
  details
FROM ai_agent_logs
WHERE user_context = 'MCP Server HTTP'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 📚 Available Tools Reference

### get_tasks
**Description:** Retrieve tasks with filtering
**Required:** `agent_id`
**Optional:** `task_id`, `status`, `priority`, `limit`

### create_task
**Description:** Create a new task
**Required:** `agent_id`, `title`
**Optional:** `description`, `priority`, `status`, `assigned_to`, `contact_id`, `due_date`

### update_task
**Description:** Update existing task
**Required:** `agent_id`, `task_id`
**Optional:** `title`, `description`, `status`, `priority`, `assigned_to`, `due_date`

### delete_task
**Description:** Delete a task
**Required:** `agent_id`, `task_id`

---

## 🚀 Quick Start Checklist

- [ ] Copy server URL
- [ ] Copy Bearer token
- [ ] Get agent ID from database
- [ ] Grant permissions to agent
- [ ] Configure N8N MCP Client node
- [ ] Test with `initialize` method
- [ ] Test with `tools/list` method
- [ ] Test tool call with your agent_id
- [ ] Verify logs in Supabase
- [ ] Build your workflow!

---

## 💡 Pro Tips

1. **Save Agent ID as Variable:** Store your agent_id as an N8N environment variable for reuse
2. **Error Handling:** Add error handling nodes to catch permission or validation errors
3. **Batch Operations:** Use N8N loops to create multiple tasks at once
4. **Webhook Integration:** Trigger N8N workflows from external events and create CRM tasks automatically
5. **Monitoring:** Set up N8N notifications for failed MCP calls

---

## 📞 Support

If you encounter issues:
1. Check Supabase Edge Function logs
2. Verify agent exists and has permissions
3. Test with curl before using N8N
4. Check this documentation: `MCP-HTTP-SERVER.md`

---

## 🎉 Ready to Test!

You now have everything you need to connect N8N to your CRM MCP server. Start with the `initialize` and `tools/list` methods to verify connectivity, then move on to actual tool calls.

Happy automating!
