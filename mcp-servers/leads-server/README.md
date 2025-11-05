# Leads MCP Server

A fully-featured MCP (Model Context Protocol) server for managing leads in the CRM system.

## Features

### Tools (4)
1. **get_leads** - Retrieve leads with advanced filtering
   - Filter by: stage, interest, source, owner, pipeline, score range, date range
   - Search across: name, email, phone, company
   - Pagination support

2. **create_lead** - Create new leads
   - Required: name
   - Optional: All other lead fields including score, pipeline, affiliate
   - Auto-generates lead_id

3. **update_lead** - Update existing leads
   - Update any field including score, stage, last_contact
   - Tracks updated_at automatically

4. **delete_lead** - Remove leads
   - Soft delete recommended in production

### Resources (9)
1. **leads://all** - All leads
2. **leads://hot** - Hot interest leads
3. **leads://warm** - Warm interest leads
4. **leads://cold** - Cold interest leads
5. **leads://high-score** - Leads with score 70+
6. **leads://recent** - Leads from last 30 days
7. **leads://new** - Leads in "new_lead" stage
8. **leads://statistics** - Aggregate statistics
9. **leads://lead/{id}** - Individual lead by ID

### Prompts (6)
1. **lead_summary** - Comprehensive lead overview with stats and hot leads
2. **lead_qualification** - BANT & CHAMP qualification frameworks
3. **lead_conversion_tips** - Conversion strategies by stage
4. **lead_scoring_guide** - Complete lead scoring methodology
5. **lead_nurturing** - Multi-stage nurturing best practices
6. **get_lead_by_id** - Instructions for retrieving specific leads

## Usage

### Running the Server
```bash
cd mcp-servers
npm run dev:leads
```

### Configuration
The server uses environment variables from `.env`:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `MCP_SERVER_NAME` - Optional server name (default: crm-leads-server)
- `MCP_SERVER_VERSION` - Optional version (default: 1.0.0)

## Database Schema

### leads Table
- **id** (uuid) - Primary key
- **lead_id** (text) - Human-readable ID (auto-generated)
- **name** (text) - Required
- **email** (text)
- **phone** (text)
- **source** (text) - Website, Referral, Social Media, Direct, Phone, Webinar, Import
- **interest** (text) - Hot, Warm, Cold (default: Warm)
- **stage** (text) - Pipeline stage
- **owner** (text) - Lead owner (default: Sales Team)
- **address** (text)
- **company** (text)
- **notes** (text)
- **last_contact** (timestamptz)
- **lead_score** (integer) - 0-100 (default: 50)
- **pipeline_id** (uuid) - FK to pipelines
- **affiliate_id** (uuid) - FK to affiliates
- **contact_id** (uuid) - FK to contacts_master
- **created_at** (timestamptz)
- **updated_at** (timestamptz)

## Lead Scoring

Leads are scored 0-100 based on:
- **Demographics** (30 points): Company size, industry fit, budget
- **Behavior** (40 points): Website activity, content engagement, responsiveness
- **Intent** (30 points): Inquiry type, timeline, referral source

### Score Ranges
- **70-100**: Hot leads (immediate action required)
- **40-69**: Warm leads (active nurturing)
- **0-39**: Cold leads (long-term nurturing)

## Permissions

The server integrates with the AI Agent permission system:
- **View** - Required for get_leads
- **Create** - Required for create_lead
- **Edit** - Required for update_lead
- **Delete** - Required for delete_lead

## Logging

All operations are logged to `ai_agent_logs` table with:
- Agent ID and name
- Module: "Leads"
- Action performed
- Result (Success/Error)
- Details and error messages

## Security

- Permission validation on every operation
- Agent authentication required
- RLS policies enforced at database level
- Comprehensive audit trail

## Examples

### Get Hot Leads
```json
{
  "name": "get_leads",
  "arguments": {
    "interest": "Hot",
    "lead_score_min": 70
  }
}
```

### Search Leads by Company
```json
{
  "name": "get_leads",
  "arguments": {
    "search": "tech",
    "limit": 20
  }
}
```

### Create New Lead
```json
{
  "name": "create_lead",
  "arguments": {
    "name": "Jane Smith",
    "email": "jane@techcorp.com",
    "phone": "+919876543210",
    "company": "TechCorp Inc",
    "source": "Website",
    "interest": "Hot",
    "lead_score": 85,
    "notes": "Interested in premium package"
  }
}
```

### Update Lead Stage and Score
```json
{
  "name": "update_lead",
  "arguments": {
    "id": "uuid-here",
    "stage": "qualified",
    "lead_score": 90,
    "last_contact": "2025-11-05T12:00:00Z",
    "notes": "Demo scheduled for next week"
  }
}
```

### Filter by Pipeline and Stage
```json
{
  "name": "get_leads",
  "arguments": {
    "pipeline_id": "pipeline-uuid",
    "stage": "qualified",
    "owner": "John Doe"
  }
}
```

## Best Practices

### Lead Qualification
- Use BANT framework (Budget, Authority, Need, Timeline)
- Score leads consistently
- Update lead_score based on interactions
- Document qualification notes

### Lead Nurturing
- Contact new leads within 5 minutes
- Personalize all communication
- Use multi-channel approach
- Track all touchpoints in last_contact

### Lead Conversion
- Focus on hot leads (70+ score) first
- Provide value before asking
- Handle objections with evidence
- Follow up persistently but professionally

### Pipeline Management
- Move leads through stages systematically
- Update stage after each milestone
- Set clear stage criteria
- Review pipeline velocity weekly

## Architecture

The server follows the modular MCP pattern:
- **index.ts** - Server setup and request routing
- **tools.ts** - CRUD operations implementation
- **resources.ts** - Read-only data access
- **prompts.ts** - Context-aware AI guidance with sales frameworks
- **shared/** - Reusable utilities (logger, permissions, types)

## Dependencies

- `@modelcontextprotocol/sdk` - MCP protocol
- `@supabase/supabase-js` - Database client
- `dotenv` - Environment configuration

## Integration

Works seamlessly with other CRM modules:
- Links to Contacts via contact_id
- Tracks referrals via affiliate_id
- Organizes by pipeline_id
- Syncs with Tasks and Appointments

## Next Steps

With Tasks, Contacts, and Leads servers complete, you now have the core foundation. Next priority servers:
- Appointments Server
- Support Tickets Server
- Expenses Server
- Billing Server
