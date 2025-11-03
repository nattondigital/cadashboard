# CRM Tasks MCP Server

Model Context Protocol (MCP) server for task management in your CRM system with custom OTP authentication.

## Overview

This MCP server provides AI agents with structured access to your task management system through:
- **6 Resources** for reading task data
- **4 Tools** for CRUD operations
- **4 Prompts** for context-aware assistance
- **Permission validation** via `ai_agent_permissions` table
- **Audit logging** to `ai_agent_logs` table

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env and add your SUPABASE_SERVICE_ROLE_KEY
   ```

3. **Run tests:**
   ```bash
   npm run test:client
   ```

See [START-HERE.md](./START-HERE.md) for detailed setup instructions.

## Architecture

```
mcp-servers/
├── shared/              # Core utilities
│   ├── types.ts        # TypeScript definitions
│   ├── logger.ts       # Logging utility
│   ├── supabase-client.ts     # Database client
│   └── permission-validator.ts # Permission checks
├── tasks-server/        # Tasks MCP server
│   ├── index.ts        # Main server
│   ├── resources.ts    # 6 read-only resources
│   ├── tools.ts        # 4 CRUD tools
│   └── prompts.ts      # 4 context templates
└── test-client.ts      # Automated testing
```

## Resources

### 1. All Tasks (`tasks://all`)
Complete list of all tasks.

### 2. Pending Tasks (`tasks://pending`)
Tasks with status "To Do" or "In Progress".

### 3. Overdue Tasks (`tasks://overdue`)
Past due date, still incomplete.

### 4. High Priority Tasks (`tasks://high-priority`)
Priority "High" or "Urgent", status pending.

### 5. Task Statistics (`tasks://statistics`)
Aggregate counts and breakdowns.

### 6. Individual Task (`tasks://task/{id}`)
Details of specific task by ID.

## Tools

### 1. get_tasks
Advanced filtering and search.

**Parameters:**
- `status`, `priority`, `assigned_to`, `contact_id`
- `due_date_from`, `due_date_to`
- `search` (title/description)
- `limit`, `offset` (pagination)

### 2. create_task
Create new task.

**Required:** `title`
**Optional:** All other task fields

### 3. update_task
Update existing task.

**Required:** `id`
**Optional:** Fields to update

### 4. delete_task
Remove task.

**Required:** `id`

## Prompts

### 1. task_summary
Comprehensive overview with statistics.

### 2. task_creation_guide
Best practices for creating tasks.

### 3. task_prioritization
Framework for organizing work.

### 4. overdue_alert
Alert for overdue tasks.

## Authentication

This server uses **AI agent permissions** (not user authentication).

- Uses `service_role_key` for database access
- Validates permissions via `ai_agent_permissions` table
- Logs all operations to `ai_agent_logs`

See [AUTHENTICATION-INTEGRATION.md](./AUTHENTICATION-INTEGRATION.md) for details on how this works with your OTP authentication system.

## Usage Example

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

const client = new Client(config, capabilities);
await client.connect(transport);

// Get tasks
const result = await client.callTool({
  name: 'get_tasks',
  arguments: {
    agent_id: 'your-agent-id',
    agent_name: 'Tasks Assistant',
    status: 'To Do',
    priority: 'High',
    limit: 10
  }
});

// Create task
const createResult = await client.callTool({
  name: 'create_task',
  arguments: {
    agent_id: 'your-agent-id',
    agent_name: 'Tasks Assistant',
    title: 'Review Q4 Report',
    priority: 'High',
    due_date: '2025-12-31'
  }
});
```

## Scripts

```bash
npm run build          # Compile TypeScript
npm run dev:tasks      # Start server in dev mode
npm run test:client    # Run automated tests
npm run clean          # Remove build artifacts
```

## Environment Variables

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
AGENT_ID=your_agent_id
MCP_SERVER_NAME=crm-tasks-server
MCP_SERVER_VERSION=1.0.0
MCP_LOG_LEVEL=info
```

## Documentation

- [START-HERE.md](./START-HERE.md) - Quick setup checklist
- [CUSTOM-AUTH-SUMMARY.md](./CUSTOM-AUTH-SUMMARY.md) - Authentication overview
- [AUTHENTICATION-INTEGRATION.md](./AUTHENTICATION-INTEGRATION.md) - Complete integration guide
- [QUICK-START.md](./QUICK-START.md) - 10-minute setup
- [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md) - Technical details
- [NEXT-STEPS.md](./NEXT-STEPS.md) - After testing

## Security

- Service role key bypasses RLS (by design)
- Agent permissions validated before operations
- All operations logged for audit trail
- Never expose service_role_key in client code
- Store credentials in .env (gitignored)

## Support

For issues or questions about:
- **MCP Protocol**: Check MCP SDK documentation
- **Authentication**: See AUTHENTICATION-INTEGRATION.md
- **Setup**: Follow START-HERE.md
- **Implementation**: Review IMPLEMENTATION-SUMMARY.md
